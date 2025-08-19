import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type GetUserPostsInput } from '../schema';
import { getUserPosts } from '../handlers/get_user_posts';

describe('getUserPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get user posts ordered by creation date', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test posts with different timestamps
    const post1 = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'First post',
        image_url: 'https://example.com/image1.jpg'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const post2 = await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Second post',
        image_url: 'https://example.com/image2.jpg'
      })
      .returning()
      .execute();

    const input: GetUserPostsInput = {
      user_id: user.id,
      limit: 12,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(2);
    // Should be ordered by creation date (newest first)
    expect(result[0].caption).toEqual('Second post');
    expect(result[1].caption).toEqual('First post');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return empty array for user with no posts', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const input: GetUserPostsInput = {
      user_id: user.id,
      limit: 12,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserPostsInput = {
      user_id: 999,
      limit: 12,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(0);
  });

  it('should respect pagination limit', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create multiple posts
    for (let i = 1; i <= 5; i++) {
      await db.insert(postsTable)
        .values({
          user_id: user.id,
          caption: `Post ${i}`,
          image_url: `https://example.com/image${i}.jpg`
        })
        .execute();
    }

    const input: GetUserPostsInput = {
      user_id: user.id,
      limit: 3,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(3);
    expect(result.every(post => post.user_id === user.id)).toBe(true);
  });

  it('should respect pagination offset', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create multiple posts
    const postCaptions = [];
    for (let i = 1; i <= 5; i++) {
      await db.insert(postsTable)
        .values({
          user_id: user.id,
          caption: `Post ${i}`,
          image_url: `https://example.com/image${i}.jpg`
        })
        .execute();
      postCaptions.push(`Post ${i}`);
    }

    // Get first page
    const firstPage = await getUserPosts({
      user_id: user.id,
      limit: 2,
      offset: 0
    });

    // Get second page
    const secondPage = await getUserPosts({
      user_id: user.id,
      limit: 2,
      offset: 2
    });

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(2);
    
    // Verify no overlap between pages
    const firstPageCaptions = firstPage.map(p => p.caption);
    const secondPageCaptions = secondPage.map(p => p.caption);
    const overlap = firstPageCaptions.some(caption => secondPageCaptions.includes(caption));
    expect(overlap).toBe(false);
  });

  it('should handle posts with all field types', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create post with all possible fields
    await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: 'Full post with all fields',
        image_url: 'https://example.com/image.jpg',
        video_url: 'https://example.com/video.mp4'
      })
      .execute();

    // Create post with minimal fields (nulls)
    await db.insert(postsTable)
      .values({
        user_id: user.id,
        caption: null,
        image_url: null,
        video_url: null
      })
      .execute();

    const input: GetUserPostsInput = {
      user_id: user.id,
      limit: 12,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(2);
    
    // Verify first post (newest) has null values
    expect(result[0].caption).toBeNull();
    expect(result[0].image_url).toBeNull();
    expect(result[0].video_url).toBeNull();
    expect(result[0].like_count).toEqual(0);
    expect(result[0].comment_count).toEqual(0);
    
    // Verify second post has all values
    expect(result[1].caption).toEqual('Full post with all fields');
    expect(result[1].image_url).toEqual('https://example.com/image.jpg');
    expect(result[1].video_url).toEqual('https://example.com/video.mp4');
    expect(result[1].like_count).toEqual(0);
    expect(result[1].comment_count).toEqual(0);
  });

  it('should only return posts for specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    // Create posts for both users
    await db.insert(postsTable)
      .values({
        user_id: user1.id,
        caption: 'User 1 post'
      })
      .execute();

    await db.insert(postsTable)
      .values({
        user_id: user2.id,
        caption: 'User 2 post'
      })
      .execute();

    const input: GetUserPostsInput = {
      user_id: user1.id,
      limit: 12,
      offset: 0
    };

    const result = await getUserPosts(input);

    expect(result).toHaveLength(1);
    expect(result[0].caption).toEqual('User 1 post');
    expect(result[0].user_id).toEqual(user1.id);
    expect(result.every(post => post.user_id === user1.id)).toBe(true);
  });
});