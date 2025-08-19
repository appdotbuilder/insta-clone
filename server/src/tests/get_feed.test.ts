import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, followsTable } from '../db/schema';
import { type GetFeedInput } from '../schema';
import { getFeed } from '../handlers/get_feed';

describe('getFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return posts from followed users', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com' },
        { username: 'user2', email: 'user2@test.com' },
        { username: 'user3', email: 'user3@test.com' }
      ])
      .returning()
      .execute();

    const [user1, user2, user3] = users;

    // User1 follows user2 and user3
    await db.insert(followsTable)
      .values([
        { follower_id: user1.id, following_id: user2.id },
        { follower_id: user1.id, following_id: user3.id }
      ])
      .execute();

    // Create posts from followed users
    await db.insert(postsTable)
      .values([
        { user_id: user2.id, caption: 'Post from user2', like_count: 5, comment_count: 2 },
        { user_id: user3.id, caption: 'Post from user3', like_count: 10, comment_count: 3 },
        { user_id: user1.id, caption: 'Post from user1 (should not appear)', like_count: 1, comment_count: 0 }
      ])
      .execute();

    const input: GetFeedInput = {
      user_id: user1.id,
      limit: 20,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(2);
    
    // Check that both posts are present (order may vary due to timing)
    const captions = result.map(post => post.caption);
    expect(captions).toContain('Post from user2');
    expect(captions).toContain('Post from user3');
    
    // Verify all required fields are present
    result.forEach(post => {
      expect(post.id).toBeDefined();
      expect(post.user_id).toBeDefined();
      expect(post.like_count).toBeGreaterThanOrEqual(0);
      expect(post.comment_count).toBeGreaterThanOrEqual(0);
      expect(post.created_at).toBeInstanceOf(Date);
      expect(post.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when user follows no one', async () => {
    // Create a user who follows no one
    const users = await db.insert(usersTable)
      .values([
        { username: 'loner', email: 'loner@test.com' },
        { username: 'poster', email: 'poster@test.com' }
      ])
      .returning()
      .execute();

    const [loner, poster] = users;

    // Create a post from someone not followed
    await db.insert(postsTable)
      .values({ user_id: poster.id, caption: 'Unseen post', like_count: 5, comment_count: 1 })
      .execute();

    const input: GetFeedInput = {
      user_id: loner.id,
      limit: 20,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(0);
  });

  it('should respect pagination limits', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'follower', email: 'follower@test.com' },
        { username: 'content_creator', email: 'creator@test.com' }
      ])
      .returning()
      .execute();

    const [follower, creator] = users;

    // Create follow relationship
    await db.insert(followsTable)
      .values({ follower_id: follower.id, following_id: creator.id })
      .execute();

    // Create multiple posts
    await db.insert(postsTable)
      .values([
        { user_id: creator.id, caption: 'Post 1', like_count: 1, comment_count: 0 },
        { user_id: creator.id, caption: 'Post 2', like_count: 2, comment_count: 0 },
        { user_id: creator.id, caption: 'Post 3', like_count: 3, comment_count: 0 },
        { user_id: creator.id, caption: 'Post 4', like_count: 4, comment_count: 0 },
        { user_id: creator.id, caption: 'Post 5', like_count: 5, comment_count: 0 }
      ])
      .execute();

    // Test limit
    const limitedInput: GetFeedInput = {
      user_id: follower.id,
      limit: 3,
      offset: 0
    };

    const limitedResult = await getFeed(limitedInput);
    expect(limitedResult).toHaveLength(3);

    // Test offset
    const offsetInput: GetFeedInput = {
      user_id: follower.id,
      limit: 20,
      offset: 2
    };

    const offsetResult = await getFeed(offsetInput);
    expect(offsetResult).toHaveLength(3); // 5 total - 2 offset = 3 remaining
  });

  it('should return posts ordered by creation date (newest first)', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'follower', email: 'follower@test.com' },
        { username: 'creator1', email: 'creator1@test.com' },
        { username: 'creator2', email: 'creator2@test.com' }
      ])
      .returning()
      .execute();

    const [follower, creator1, creator2] = users;

    // Create follow relationships
    await db.insert(followsTable)
      .values([
        { follower_id: follower.id, following_id: creator1.id },
        { follower_id: follower.id, following_id: creator2.id }
      ])
      .execute();

    // Create posts with artificial delay to ensure different timestamps
    await db.insert(postsTable)
      .values({ user_id: creator1.id, caption: 'Older post', like_count: 1, comment_count: 0 })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(postsTable)
      .values({ user_id: creator2.id, caption: 'Newer post', like_count: 2, comment_count: 0 })
      .execute();

    const input: GetFeedInput = {
      user_id: follower.id,
      limit: 20,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(2);
    expect(result[0].caption).toEqual('Newer post');
    expect(result[1].caption).toEqual('Older post');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle posts with null optional fields', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'follower', email: 'follower@test.com' },
        { username: 'creator', email: 'creator@test.com' }
      ])
      .returning()
      .execute();

    const [follower, creator] = users;

    // Create follow relationship
    await db.insert(followsTable)
      .values({ follower_id: follower.id, following_id: creator.id })
      .execute();

    // Create post with null optional fields
    await db.insert(postsTable)
      .values({
        user_id: creator.id,
        caption: null, // Null caption
        image_url: null, // Null image
        video_url: null, // Null video
        like_count: 0,
        comment_count: 0
      })
      .execute();

    const input: GetFeedInput = {
      user_id: follower.id,
      limit: 20,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(1);
    expect(result[0].caption).toBeNull();
    expect(result[0].image_url).toBeNull();
    expect(result[0].video_url).toBeNull();
    expect(result[0].like_count).toEqual(0);
    expect(result[0].comment_count).toEqual(0);
  });

  it('should handle multiple follow relationships correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@test.com' },
        { username: 'user2', email: 'user2@test.com' },
        { username: 'user3', email: 'user3@test.com' },
        { username: 'user4', email: 'user4@test.com' }
      ])
      .returning()
      .execute();

    const [user1, user2, user3, user4] = users;

    // Create complex follow relationships
    // User1 follows user2 and user3
    // User2 follows user3 and user4
    await db.insert(followsTable)
      .values([
        { follower_id: user1.id, following_id: user2.id },
        { follower_id: user1.id, following_id: user3.id },
        { follower_id: user2.id, following_id: user3.id },
        { follower_id: user2.id, following_id: user4.id }
      ])
      .execute();

    // Create posts from all users
    await db.insert(postsTable)
      .values([
        { user_id: user1.id, caption: 'Post by user1', like_count: 1, comment_count: 0 },
        { user_id: user2.id, caption: 'Post by user2', like_count: 2, comment_count: 0 },
        { user_id: user3.id, caption: 'Post by user3', like_count: 3, comment_count: 0 },
        { user_id: user4.id, caption: 'Post by user4', like_count: 4, comment_count: 0 }
      ])
      .execute();

    // Get feed for user1 (should see posts from user2 and user3 only)
    const user1Input: GetFeedInput = {
      user_id: user1.id,
      limit: 20,
      offset: 0
    };

    const user1Result = await getFeed(user1Input);
    expect(user1Result).toHaveLength(2);
    
    const captions = user1Result.map(post => post.caption);
    expect(captions).toContain('Post by user2');
    expect(captions).toContain('Post by user3');
    expect(captions).not.toContain('Post by user1');
    expect(captions).not.toContain('Post by user4');

    // Get feed for user2 (should see posts from user3 and user4 only)
    const user2Input: GetFeedInput = {
      user_id: user2.id,
      limit: 20,
      offset: 0
    };

    const user2Result = await getFeed(user2Input);
    expect(user2Result).toHaveLength(2);
    
    const user2Captions = user2Result.map(post => post.caption);
    expect(user2Captions).toContain('Post by user3');
    expect(user2Captions).toContain('Post by user4');
    expect(user2Captions).not.toContain('Post by user1');
    expect(user2Captions).not.toContain('Post by user2');
  });
});