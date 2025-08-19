import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storiesTable, usersTable } from '../db/schema';
import { type CreateStoryInput } from '../schema';
import { createStory } from '../handlers/create_story';
import { eq } from 'drizzle-orm';

describe('createStory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;

  beforeEach(async () => {
    // Create test user for stories
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUser = userResult[0];
  });

  it('should create a story with image_url', async () => {
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/story.jpg',
      video_url: null
    };

    const result = await createStory(input);

    // Verify returned story
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toEqual('https://example.com/story.jpg');
    expect(result.video_url).toBeNull();
    expect(result.view_count).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);

    // Verify expiry time is approximately 24 hours from now
    const now = new Date();
    const expectedExpiry = new Date();
    expectedExpiry.setHours(expectedExpiry.getHours() + 24);
    const timeDiff = Math.abs(result.expires_at.getTime() - expectedExpiry.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  it('should create a story with video_url', async () => {
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: null,
      video_url: 'https://example.com/story.mp4'
    };

    const result = await createStory(input);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toBeNull();
    expect(result.video_url).toEqual('https://example.com/story.mp4');
    expect(result.view_count).toEqual(0);
  });

  it('should create a story with both image_url and video_url', async () => {
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/story.jpg',
      video_url: 'https://example.com/story.mp4'
    };

    const result = await createStory(input);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toEqual('https://example.com/story.jpg');
    expect(result.video_url).toEqual('https://example.com/story.mp4');
  });

  it('should save story to database', async () => {
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/story.jpg',
      video_url: null
    };

    const result = await createStory(input);

    // Query database to verify story was saved
    const stories = await db.select()
      .from(storiesTable)
      .where(eq(storiesTable.id, result.id))
      .execute();

    expect(stories).toHaveLength(1);
    expect(stories[0].user_id).toEqual(testUser.id);
    expect(stories[0].image_url).toEqual('https://example.com/story.jpg');
    expect(stories[0].expires_at).toBeInstanceOf(Date);
  });

  it('should reject story without image_url or video_url', async () => {
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: null,
      video_url: null
    };

    await expect(createStory(input)).rejects.toThrow(/must have either an image_url or video_url/i);
  });

  it('should reject story for non-existent user', async () => {
    const input: CreateStoryInput = {
      user_id: 999999, // Non-existent user ID
      image_url: 'https://example.com/story.jpg',
      video_url: null
    };

    await expect(createStory(input)).rejects.toThrow(/user not found/i);
  });

  it('should set expires_at to 24 hours from creation', async () => {
    const beforeCreation = new Date();
    
    const input: CreateStoryInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/story.jpg',
      video_url: null
    };

    const result = await createStory(input);

    const afterCreation = new Date();
    
    // Story should expire 24 hours from creation
    const expectedMinExpiry = new Date(beforeCreation);
    expectedMinExpiry.setHours(expectedMinExpiry.getHours() + 24);
    
    const expectedMaxExpiry = new Date(afterCreation);
    expectedMaxExpiry.setHours(expectedMaxExpiry.getHours() + 24);

    expect(result.expires_at >= expectedMinExpiry).toBe(true);
    expect(result.expires_at <= expectedMaxExpiry).toBe(true);
  });
});