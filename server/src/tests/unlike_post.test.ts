import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type RemoveLikeInput } from '../schema';
import { unlikePost } from '../handlers/unlike_post';
import { eq, and } from 'drizzle-orm';

describe('unlikePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully unlike a post', async () => {
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

    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null,
        like_count: 1
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Create like
    await db.insert(likesTable)
      .values({
        user_id: userId,
        post_id: postId
      })
      .execute();

    const input: RemoveLikeInput = {
      user_id: userId,
      post_id: postId
    };

    // Execute unlike
    const result = await unlikePost(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify like was removed from database
    const remainingLikes = await db.select()
      .from(likesTable)
      .where(and(
        eq(likesTable.user_id, userId),
        eq(likesTable.post_id, postId)
      ))
      .execute();

    expect(remainingLikes).toHaveLength(0);

    // Verify post like count was decremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPost[0].like_count).toBe(0);
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Create test post without user
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

    const postResult = await db.insert(postsTable)
      .values({
        user_id: userResult[0].id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null,
        like_count: 1
      })
      .returning()
      .execute();

    const input: RemoveLikeInput = {
      user_id: 99999, // Non-existent user ID
      post_id: postResult[0].id
    };

    await expect(unlikePost(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when post does not exist', async () => {
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

    const input: RemoveLikeInput = {
      user_id: userResult[0].id,
      post_id: 99999 // Non-existent post ID
    };

    await expect(unlikePost(input)).rejects.toThrow(/post not found/i);
  });

  it('should throw error when like does not exist', async () => {
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

    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null,
        like_count: 0
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Don't create a like - try to unlike a post that wasn't liked

    const input: RemoveLikeInput = {
      user_id: userId,
      post_id: postId
    };

    await expect(unlikePost(input)).rejects.toThrow(/like not found/i);
  });

  it('should handle multiple likes on same post correctly', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        full_name: 'Test User 1',
        bio: 'Test bio 1',
        profile_image_url: 'https://example.com/image1.jpg',
        is_private: false
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
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

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: user1Id,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null,
        like_count: 2
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Create likes from both users
    await db.insert(likesTable)
      .values([
        { user_id: user1Id, post_id: postId },
        { user_id: user2Id, post_id: postId }
      ])
      .execute();

    // Unlike from user1
    const input: RemoveLikeInput = {
      user_id: user1Id,
      post_id: postId
    };

    const result = await unlikePost(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify only user1's like was removed
    const remainingLikes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, postId))
      .execute();

    expect(remainingLikes).toHaveLength(1);
    expect(remainingLikes[0].user_id).toBe(user2Id);

    // Verify post like count was decremented by 1
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPost[0].like_count).toBe(1);
  });

  it('should handle unlike when post has zero likes', async () => {
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

    const userId = userResult[0].id;

    // Create test post with 1 like
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        caption: 'Test post',
        image_url: 'https://example.com/post.jpg',
        video_url: null,
        like_count: 1
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Create like
    await db.insert(likesTable)
      .values({
        user_id: userId,
        post_id: postId
      })
      .execute();

    const input: RemoveLikeInput = {
      user_id: userId,
      post_id: postId
    };

    // Execute unlike
    const result = await unlikePost(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify post like count went to 0
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(updatedPost[0].like_count).toBe(0);
  });
});