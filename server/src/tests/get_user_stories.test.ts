import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storiesTable } from '../db/schema';
import { type GetUserStoriesInput, type CreateUserInput, type CreateStoryInput } from '../schema';
import { getUserStories } from '../handlers/get_user_stories';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'Test bio',
  profile_image_url: 'https://example.com/profile.jpg',
  is_private: false
};

const testUser2: CreateUserInput = {
  username: 'otheruser',
  email: 'other@example.com',
  full_name: 'Other User',
  bio: null,
  profile_image_url: null,
  is_private: false
};

describe('getUserStories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active stories for a user ordered by creation date (newest first)', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create stories with different creation times and expiry dates
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Story 1 (older, active)
    const story1Date = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/story1.jpg',
        video_url: null,
        view_count: 5,
        expires_at: futureExpiry,
        created_at: story1Date
      })
      .execute();

    // Story 2 (newer, active)
    const story2Date = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: null,
        video_url: 'https://example.com/story2.mp4',
        view_count: 10,
        expires_at: futureExpiry,
        created_at: story2Date
      })
      .execute();

    const input: GetUserStoriesInput = {
      user_id: userId
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].video_url).toBe('https://example.com/story2.mp4');
    expect(result[1].image_url).toBe('https://example.com/story1.jpg');
    
    // Verify all stories belong to the correct user
    result.forEach(story => {
      expect(story.user_id).toBe(userId);
      expect(story.expires_at).toBeInstanceOf(Date);
      expect(story.created_at).toBeInstanceOf(Date);
      expect(story.expires_at > now).toBe(true); // Should be active
    });
  });

  it('should filter out expired stories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const now = new Date();
    const pastExpiry = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago (expired)
    const futureExpiry = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now (active)

    // Create expired story
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/expired.jpg',
        video_url: null,
        view_count: 0,
        expires_at: pastExpiry
      })
      .execute();

    // Create active story
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/active.jpg',
        video_url: null,
        view_count: 5,
        expires_at: futureExpiry
      })
      .execute();

    const input: GetUserStoriesInput = {
      user_id: userId
    };

    const result = await getUserStories(input);

    // Should only return the active story
    expect(result).toHaveLength(1);
    expect(result[0].image_url).toBe('https://example.com/active.jpg');
    expect(result[0].expires_at > now).toBe(true);
  });

  it('should return empty array when user has no stories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: GetUserStoriesInput = {
      user_id: userId
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when user has only expired stories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const pastExpiry = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    // Create expired story
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/expired.jpg',
        video_url: null,
        view_count: 0,
        expires_at: pastExpiry
      })
      .execute();

    const input: GetUserStoriesInput = {
      user_id: userId
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(0);
  });

  it('should only return stories for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create stories for both users
    await db.insert(storiesTable)
      .values({
        user_id: user1Id,
        image_url: 'https://example.com/user1.jpg',
        video_url: null,
        view_count: 5,
        expires_at: futureExpiry
      })
      .execute();

    await db.insert(storiesTable)
      .values({
        user_id: user2Id,
        image_url: 'https://example.com/user2.jpg',
        video_url: null,
        view_count: 3,
        expires_at: futureExpiry
      })
      .execute();

    const input: GetUserStoriesInput = {
      user_id: user1Id
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(user1Id);
    expect(result[0].image_url).toBe('https://example.com/user1.jpg');
  });

  it('should handle stories with both image and video URLs', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create story with image
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/image.jpg',
        video_url: null,
        view_count: 5,
        expires_at: futureExpiry
      })
      .execute();

    // Create story with video
    await db.insert(storiesTable)
      .values({
        user_id: userId,
        image_url: null,
        video_url: 'https://example.com/video.mp4',
        view_count: 10,
        expires_at: futureExpiry
      })
      .execute();

    const input: GetUserStoriesInput = {
      user_id: userId
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(2);
    
    // Verify one has image, other has video
    const imageStory = result.find(s => s.image_url !== null);
    const videoStory = result.find(s => s.video_url !== null);

    expect(imageStory).toBeDefined();
    expect(videoStory).toBeDefined();
    expect(imageStory?.image_url).toBe('https://example.com/image.jpg');
    expect(videoStory?.video_url).toBe('https://example.com/video.mp4');
  });

  it('should handle non-existent user gracefully', async () => {
    const input: GetUserStoriesInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getUserStories(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});