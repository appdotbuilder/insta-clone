import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

// Create test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      bio: 'Test bio',
      is_private: false
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test input with image
const testInputWithImage: CreatePostInput = {
  user_id: 1,
  caption: 'Test post with image',
  image_url: 'https://example.com/image.jpg',
  video_url: null
};

// Test input with video
const testInputWithVideo: CreatePostInput = {
  user_id: 1,
  caption: 'Test post with video',
  image_url: null,
  video_url: 'https://example.com/video.mp4'
};

// Test input with both image and video
const testInputWithBoth: CreatePostInput = {
  user_id: 1,
  caption: 'Test post with both',
  image_url: 'https://example.com/image.jpg',
  video_url: 'https://example.com/video.mp4'
};

// Test input with no media
const testInputNoMedia: CreatePostInput = {
  user_id: 1,
  caption: 'Test post without media',
  image_url: null,
  video_url: null
};

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a post with image', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInputWithImage, user_id: user.id };

    const result = await createPost(input);

    // Verify post fields
    expect(result.user_id).toEqual(user.id);
    expect(result.caption).toEqual('Test post with image');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.video_url).toBeNull();
    expect(result.like_count).toEqual(0);
    expect(result.comment_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a post with video', async () => {
    const user = await createTestUser();
    const input = { ...testInputWithVideo, user_id: user.id };

    const result = await createPost(input);

    expect(result.user_id).toEqual(user.id);
    expect(result.caption).toEqual('Test post with video');
    expect(result.image_url).toBeNull();
    expect(result.video_url).toEqual('https://example.com/video.mp4');
  });

  it('should create a post with both image and video', async () => {
    const user = await createTestUser();
    const input = { ...testInputWithBoth, user_id: user.id };

    const result = await createPost(input);

    expect(result.user_id).toEqual(user.id);
    expect(result.caption).toEqual('Test post with both');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.video_url).toEqual('https://example.com/video.mp4');
  });

  it('should save post to database', async () => {
    const user = await createTestUser();
    const input = { ...testInputWithImage, user_id: user.id };

    const result = await createPost(input);

    // Query database to verify post was saved
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].user_id).toEqual(user.id);
    expect(posts[0].caption).toEqual('Test post with image');
    expect(posts[0].image_url).toEqual('https://example.com/image.jpg');
    expect(posts[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment user posts count', async () => {
    const user = await createTestUser();
    const input = { ...testInputWithImage, user_id: user.id };

    // Verify initial posts count
    expect(user.posts_count).toEqual(0);

    await createPost(input);

    // Verify posts count was incremented
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].posts_count).toEqual(1);
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle posts with null caption', async () => {
    const user = await createTestUser();
    const input = {
      user_id: user.id,
      caption: null,
      image_url: 'https://example.com/image.jpg',
      video_url: null
    };

    const result = await createPost(input);

    expect(result.caption).toBeNull();
    expect(result.image_url).toEqual('https://example.com/image.jpg');
  });

  it('should throw error when no media is provided', async () => {
    const user = await createTestUser();
    const input = { ...testInputNoMedia, user_id: user.id };

    await expect(createPost(input)).rejects.toThrow(/at least one of image_url or video_url must be provided/i);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInputWithImage, user_id: 999 };

    await expect(createPost(input)).rejects.toThrow(/user not found/i);
  });

  it('should handle multiple posts by same user', async () => {
    const user = await createTestUser();
    const input1 = { ...testInputWithImage, user_id: user.id };
    const input2 = { 
      ...testInputWithVideo, 
      user_id: user.id,
      caption: 'Second post'
    };

    // Create first post
    const result1 = await createPost(input1);
    expect(result1.caption).toEqual('Test post with image');

    // Create second post
    const result2 = await createPost(input2);
    expect(result2.caption).toEqual('Second post');

    // Verify posts count is 2
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].posts_count).toEqual(2);
  });

  it('should handle foreign key constraint violations gracefully', async () => {
    // Try to create post with non-existent user_id
    const input = { ...testInputWithImage, user_id: -1 };

    await expect(createPost(input)).rejects.toThrow(/user not found/i);
  });
});