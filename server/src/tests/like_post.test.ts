import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type CreateLikeInput } from '../schema';
import { likePost } from '../handlers/like_post';
import { eq, and } from 'drizzle-orm';

describe('likePost', () => {
  let testUser: { id: number; username: string; email: string };
  let testPost: { id: number; user_id: number; like_count: number };

  beforeEach(async () => {
    await createDB();

    // Create test user
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
    
    testUser = userResult[0];

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: testUser.id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null
      })
      .returning()
      .execute();

    testPost = postResult[0];
  });

  afterEach(resetDB);

  const testInput: CreateLikeInput = {
    user_id: 0, // Will be set in tests
    post_id: 0  // Will be set in tests
  };

  it('should create a like for a post', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: testPost.id
    };

    const result = await likePost(input);

    // Verify like creation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.post_id).toEqual(testPost.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save like to database', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: testPost.id
    };

    const result = await likePost(input);

    // Verify like exists in database
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.id, result.id))
      .execute();

    expect(likes).toHaveLength(1);
    expect(likes[0].user_id).toEqual(testUser.id);
    expect(likes[0].post_id).toEqual(testPost.id);
    expect(likes[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment post like count', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: testPost.id
    };

    // Get initial like count
    const initialPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPost.id))
      .execute();

    await likePost(input);

    // Verify like count incremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPost.id))
      .execute();

    expect(updatedPost[0].like_count).toEqual(initialPost[0].like_count + 1);
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate likes', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: testPost.id
    };

    // First like should succeed
    await likePost(input);

    // Second like should fail
    expect(likePost(input)).rejects.toThrow(/already liked/i);
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user ID
      post_id: testPost.id
    };

    expect(likePost(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent post', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: 99999 // Non-existent post ID
    };

    expect(likePost(input)).rejects.toThrow(/post not found/i);
  });

  it('should maintain like count accuracy with multiple users', async () => {
    // Create second user
    const secondUser = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        bio: 'Test bio 2',
        profile_image_url: 'https://example.com/image2.jpg',
        is_private: false
      })
      .returning()
      .execute();

    // Both users like the post
    await likePost({
      user_id: testUser.id,
      post_id: testPost.id
    });

    await likePost({
      user_id: secondUser[0].id,
      post_id: testPost.id
    });

    // Verify like count is 2
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPost.id))
      .execute();

    expect(updatedPost[0].like_count).toEqual(2);

    // Verify both likes exist in database
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, testPost.id))
      .execute();

    expect(likes).toHaveLength(2);
    expect(likes.map(like => like.user_id)).toContain(testUser.id);
    expect(likes.map(like => like.user_id)).toContain(secondUser[0].id);
  });

  it('should handle database constraint violations properly', async () => {
    const input = {
      ...testInput,
      user_id: testUser.id,
      post_id: testPost.id
    };

    // Create like directly in database to simulate race condition
    await db.insert(likesTable)
      .values({
        user_id: testUser.id,
        post_id: testPost.id
      })
      .execute();

    // Attempt to create duplicate like through handler
    expect(likePost(input)).rejects.toThrow(/already liked/i);
  });
});