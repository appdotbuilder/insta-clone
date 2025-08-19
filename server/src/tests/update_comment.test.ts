import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type UpdateCommentInput } from '../schema';
import { updateComment } from '../handlers/update_comment';
import { eq } from 'drizzle-orm';

// Test input for updating comment
const testUpdateInput: UpdateCommentInput = {
  id: 1,
  content: 'Updated comment content'
};

describe('updateComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a comment', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/image.jpg',
        is_private: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null
      })
      .returning()
      .execute();

    const post = postResult[0];

    // Create original comment
    const commentResult = await db.insert(commentsTable)
      .values({
        user_id: user.id,
        post_id: post.id,
        content: 'Original comment content'
      })
      .returning()
      .execute();

    const originalComment = commentResult[0];

    // Update the comment
    const updateInput: UpdateCommentInput = {
      id: originalComment.id,
      content: 'Updated comment content'
    };

    const result = await updateComment(updateInput);

    // Verify basic fields
    expect(result.id).toEqual(originalComment.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.post_id).toEqual(post.id);
    expect(result.content).toEqual('Updated comment content');
    expect(result.like_count).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalComment.updated_at).toBe(true);
  });

  it('should save updated comment to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/image.jpg',
        is_private: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null
      })
      .returning()
      .execute();

    const post = postResult[0];

    // Create original comment
    const commentResult = await db.insert(commentsTable)
      .values({
        user_id: user.id,
        post_id: post.id,
        content: 'Original comment content'
      })
      .returning()
      .execute();

    const originalComment = commentResult[0];

    // Update the comment
    const updateInput: UpdateCommentInput = {
      id: originalComment.id,
      content: 'Database saved comment content'
    };

    const result = await updateComment(updateInput);

    // Query database directly to verify persistence
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('Database saved comment content');
    expect(comments[0].updated_at).toBeInstanceOf(Date);
    expect(comments[0].updated_at > originalComment.updated_at).toBe(true);
  });

  it('should throw error for non-existent comment', async () => {
    const updateInput: UpdateCommentInput = {
      id: 999, // Non-existent ID
      content: 'This should fail'
    };

    await expect(updateComment(updateInput)).rejects.toThrow(/Comment with id 999 not found/i);
  });

  it('should handle long comment content within limits', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/image.jpg',
        is_private: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null
      })
      .returning()
      .execute();

    const post = postResult[0];

    // Create original comment
    const commentResult = await db.insert(commentsTable)
      .values({
        user_id: user.id,
        post_id: post.id,
        content: 'Short comment'
      })
      .returning()
      .execute();

    const originalComment = commentResult[0];

    // Create long content (2000 chars, within 2200 limit)
    const longContent = 'A'.repeat(2000);

    const updateInput: UpdateCommentInput = {
      id: originalComment.id,
      content: longContent
    };

    const result = await updateComment(updateInput);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(2000);
  });

  it('should preserve other comment fields during update', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/image.jpg',
        is_private: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null
      })
      .returning()
      .execute();

    const post = postResult[0];

    // Create original comment with like count
    const commentResult = await db.insert(commentsTable)
      .values({
        user_id: user.id,
        post_id: post.id,
        content: 'Original comment',
        like_count: 5
      })
      .returning()
      .execute();

    const originalComment = commentResult[0];

    const updateInput: UpdateCommentInput = {
      id: originalComment.id,
      content: 'Updated content preserving likes'
    };

    const result = await updateComment(updateInput);

    // Verify preserved fields
    expect(result.id).toEqual(originalComment.id);
    expect(result.user_id).toEqual(originalComment.user_id);
    expect(result.post_id).toEqual(originalComment.post_id);
    expect(result.like_count).toEqual(5); // Should preserve like count
    expect(result.created_at).toEqual(originalComment.created_at); // Should preserve creation date
    expect(result.content).toEqual('Updated content preserving likes');
  });
});