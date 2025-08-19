import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/create_comment';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  username: 'test_user',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'A test user',
  profile_image_url: 'https://example.com/profile.jpg',
  is_private: false
};

const testPost = {
  caption: 'Test post caption',
  image_url: 'https://example.com/image.jpg',
  video_url: null
};

const testCommentInput: CreateCommentInput = {
  user_id: 1, // Will be set after user creation
  post_id: 1, // Will be set after post creation
  content: 'This is a test comment'
};

describe('createComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a comment successfully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    
    const postId = postResult[0].id;

    // Create comment
    const commentInput = {
      ...testCommentInput,
      user_id: userId,
      post_id: postId
    };

    const result = await createComment(commentInput);

    // Validate comment fields
    expect(result.user_id).toEqual(userId);
    expect(result.post_id).toEqual(postId);
    expect(result.content).toEqual('This is a test comment');
    expect(result.like_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    
    const postId = postResult[0].id;

    // Create comment
    const commentInput = {
      ...testCommentInput,
      user_id: userId,
      post_id: postId
    };

    const result = await createComment(commentInput);

    // Verify comment was saved to database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].user_id).toEqual(userId);
    expect(comments[0].post_id).toEqual(postId);
    expect(comments[0].content).toEqual('This is a test comment');
    expect(comments[0].like_count).toEqual(0);
    expect(comments[0].created_at).toBeInstanceOf(Date);
    expect(comments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should increment post comment count', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    
    const postId = postResult[0].id;
    const initialCommentCount = postResult[0].comment_count;

    // Create comment
    const commentInput = {
      ...testCommentInput,
      user_id: userId,
      post_id: postId
    };

    await createComment(commentInput);

    // Verify post comment count was incremented
    const updatedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPosts).toHaveLength(1);
    expect(updatedPosts[0].comment_count).toEqual(initialCommentCount + 1);
    expect(updatedPosts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Create prerequisite post with a valid user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    
    const postId = postResult[0].id;

    // Try to create comment with non-existent user
    const commentInput = {
      ...testCommentInput,
      user_id: 99999, // Non-existent user ID
      post_id: postId
    };

    await expect(createComment(commentInput)).rejects.toThrow(/User with id 99999 does not exist/);
  });

  it('should throw error when post does not exist', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Try to create comment with non-existent post
    const commentInput = {
      ...testCommentInput,
      user_id: userId,
      post_id: 99999 // Non-existent post ID
    };

    await expect(createComment(commentInput)).rejects.toThrow(/Post with id 99999 does not exist/);
  });

  it('should handle multiple comments on same post', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        user_id: userId
      })
      .returning()
      .execute();
    
    const postId = postResult[0].id;
    const initialCommentCount = postResult[0].comment_count;

    // Create first comment
    const firstCommentInput = {
      user_id: userId,
      post_id: postId,
      content: 'First comment'
    };

    const firstComment = await createComment(firstCommentInput);

    // Create second comment
    const secondCommentInput = {
      user_id: userId,
      post_id: postId,
      content: 'Second comment'
    };

    const secondComment = await createComment(secondCommentInput);

    // Verify both comments exist
    expect(firstComment.content).toEqual('First comment');
    expect(secondComment.content).toEqual('Second comment');
    expect(firstComment.id).not.toEqual(secondComment.id);

    // Verify post comment count incremented twice
    const updatedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPosts[0].comment_count).toEqual(initialCommentCount + 2);
  });
});