import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type UpdatePostInput } from '../schema';
import { updatePost } from '../handlers/update_post';
import { eq } from 'drizzle-orm';

describe('updatePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPostId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://example.com/profile.jpg',
        is_private: false
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create a test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: testUserId,
        caption: 'Original caption',
        image_url: 'https://example.com/image.jpg',
        video_url: null
      })
      .returning()
      .execute();

    testPostId = postResult[0].id;
  });

  it('should update post caption successfully', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Updated caption'
    };

    const result = await updatePost(input);

    expect(result.id).toEqual(testPostId);
    expect(result.caption).toEqual('Updated caption');
    expect(result.user_id).toEqual(testUserId);
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.video_url).toBeNull();
    expect(result.like_count).toEqual(0);
    expect(result.comment_count).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update caption to null', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: null
    };

    const result = await updatePost(input);

    expect(result.id).toEqual(testPostId);
    expect(result.caption).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should persist changes in database', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Database persistence test'
    };

    await updatePost(input);

    // Query the database directly to verify the changes were persisted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].caption).toEqual('Database persistence test');
    expect(posts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not modify other post fields', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Only caption should change'
    };

    // Get original post data
    const originalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    const result = await updatePost(input);

    // Verify only caption and updated_at changed
    expect(result.user_id).toEqual(originalPost[0].user_id);
    expect(result.image_url).toEqual(originalPost[0].image_url);
    expect(result.video_url).toEqual(originalPost[0].video_url);
    expect(result.like_count).toEqual(originalPost[0].like_count);
    expect(result.comment_count).toEqual(originalPost[0].comment_count);
    expect(result.created_at).toEqual(originalPost[0].created_at);
    expect(result.updated_at > originalPost[0].updated_at).toBe(true);
  });

  it('should throw error for non-existent post', async () => {
    const input: UpdatePostInput = {
      id: 999999,
      caption: 'This should fail'
    };

    expect(updatePost(input)).rejects.toThrow(/Post with id 999999 not found/i);
  });

  it('should update post with long caption', async () => {
    const longCaption = 'A'.repeat(2200); // Max length according to schema
    const input: UpdatePostInput = {
      id: testPostId,
      caption: longCaption
    };

    const result = await updatePost(input);

    expect(result.caption).toEqual(longCaption);
    expect(result.caption?.length).toEqual(2200);
  });

  it('should handle multiple updates to same post', async () => {
    // First update
    await updatePost({
      id: testPostId,
      caption: 'First update'
    });

    // Second update
    const result = await updatePost({
      id: testPostId,
      caption: 'Second update'
    });

    expect(result.caption).toEqual('Second update');

    // Verify in database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts[0].caption).toEqual('Second update');
  });

  it('should update timestamp correctly', async () => {
    // Get original timestamp
    const originalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await updatePost({
      id: testPostId,
      caption: 'Timestamp test'
    });

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalPost[0].updated_at).toBe(true);
    expect(result.created_at).toEqual(originalPost[0].created_at);
  });
});