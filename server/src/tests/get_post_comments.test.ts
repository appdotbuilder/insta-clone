import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type GetPostCommentsInput } from '../schema';
import { getPostComments } from '../handlers/get_post_comments';
import { eq } from 'drizzle-orm';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'user1@test.com',
  full_name: 'Test User 1',
  bio: 'Test bio 1',
  profile_image_url: 'https://example.com/image1.jpg',
  is_private: false
};

const testUser2 = {
  username: 'testuser2', 
  email: 'user2@test.com',
  full_name: 'Test User 2',
  bio: 'Test bio 2',
  profile_image_url: 'https://example.com/image2.jpg',
  is_private: false
};

const testPost = {
  user_id: 1, // Will be set after user creation
  caption: 'Test post caption',
  image_url: 'https://example.com/post.jpg',
  video_url: null
};

describe('getPostComments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return comments for a specific post', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create test post
    const posts = await db.insert(postsTable)
      .values({ ...testPost, user_id: users[0].id })
      .returning()
      .execute();

    // Create test comments
    const testComments = [
      {
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'First comment'
      },
      {
        user_id: users[1].id,
        post_id: posts[0].id,
        content: 'Second comment'
      },
      {
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'Third comment'
      }
    ];

    await db.insert(commentsTable)
      .values(testComments)
      .execute();

    // Test the handler
    const input: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 20,
      offset: 0
    };

    const result = await getPostComments(input);

    // Verify results
    expect(result).toHaveLength(3);
    expect(result[0].post_id).toEqual(posts[0].id);
    expect(result[1].post_id).toEqual(posts[0].id);
    expect(result[2].post_id).toEqual(posts[0].id);

    // Check that comments contain expected content
    const contents = result.map(c => c.content);
    expect(contents).toContain('First comment');
    expect(contents).toContain('Second comment');
    expect(contents).toContain('Third comment');

    // Verify all required fields are present
    result.forEach(comment => {
      expect(comment.id).toBeDefined();
      expect(comment.user_id).toBeDefined();
      expect(comment.post_id).toEqual(posts[0].id);
      expect(comment.content).toBeDefined();
      expect(comment.like_count).toEqual(0);
      expect(comment.created_at).toBeInstanceOf(Date);
      expect(comment.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return comments ordered by creation date (newest first)', async () => {
    // Create test user and post
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const posts = await db.insert(postsTable)
      .values({ ...testPost, user_id: users[0].id })
      .returning()
      .execute();

    // Create comments with slight delays to ensure different timestamps
    const comment1 = await db.insert(commentsTable)
      .values({
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'First comment (oldest)'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const comment2 = await db.insert(commentsTable)
      .values({
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'Second comment (newest)'
      })
      .returning()
      .execute();

    const input: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 20,
      offset: 0
    };

    const result = await getPostComments(input);

    // Verify ordering (newest first)
    expect(result).toHaveLength(2);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[0].content).toEqual('Second comment (newest)');
    expect(result[1].content).toEqual('First comment (oldest)');
  });

  it('should support pagination with limit and offset', async () => {
    // Create test user and post
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const posts = await db.insert(postsTable)
      .values({ ...testPost, user_id: users[0].id })
      .returning()
      .execute();

    // Create multiple comments
    const commentPromises = [];
    for (let i = 1; i <= 5; i++) {
      commentPromises.push(
        db.insert(commentsTable)
          .values({
            user_id: users[0].id,
            post_id: posts[0].id,
            content: `Comment ${i}`
          })
          .execute()
      );
      // Small delay between inserts
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    await Promise.all(commentPromises);

    // Test first page
    const firstPageInput: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 2,
      offset: 0
    };

    const firstPage = await getPostComments(firstPageInput);
    expect(firstPage).toHaveLength(2);

    // Test second page
    const secondPageInput: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 2,
      offset: 2
    };

    const secondPage = await getPostComments(secondPageInput);
    expect(secondPage).toHaveLength(2);

    // Verify different results
    expect(firstPage[0].id).not.toEqual(secondPage[0].id);
    expect(firstPage[1].id).not.toEqual(secondPage[1].id);

    // Test third page (partial)
    const thirdPageInput: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 2,
      offset: 4
    };

    const thirdPage = await getPostComments(thirdPageInput);
    expect(thirdPage).toHaveLength(1);
  });

  it('should return empty array for post with no comments', async () => {
    // Create test user and post
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const posts = await db.insert(postsTable)
      .values({ ...testPost, user_id: users[0].id })
      .returning()
      .execute();

    const input: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 20,
      offset: 0
    };

    const result = await getPostComments(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent post', async () => {
    const input: GetPostCommentsInput = {
      post_id: 999, // Non-existent post ID
      limit: 20,
      offset: 0
    };

    const result = await getPostComments(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return comments for the specified post', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    // Create two test posts
    const posts = await db.insert(postsTable)
      .values([
        { ...testPost, user_id: users[0].id },
        { ...testPost, user_id: users[0].id, caption: 'Second post' }
      ])
      .returning()
      .execute();

    // Create comments for both posts
    await db.insert(commentsTable)
      .values([
        {
          user_id: users[0].id,
          post_id: posts[0].id,
          content: 'Comment on first post'
        },
        {
          user_id: users[0].id,
          post_id: posts[1].id,
          content: 'Comment on second post'
        }
      ])
      .execute();

    // Get comments for first post only
    const input: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 20,
      offset: 0
    };

    const result = await getPostComments(input);

    expect(result).toHaveLength(1);
    expect(result[0].post_id).toEqual(posts[0].id);
    expect(result[0].content).toEqual('Comment on first post');
  });

  it('should handle Zod defaults correctly', async () => {
    // Create test user and post
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const posts = await db.insert(postsTable)
      .values({ ...testPost, user_id: users[0].id })
      .returning()
      .execute();

    await db.insert(commentsTable)
      .values({
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'Test comment'
      })
      .execute();

    // Test with input that would use Zod defaults
    const input: GetPostCommentsInput = {
      post_id: posts[0].id,
      limit: 20, // Default value
      offset: 0  // Default value
    };

    const result = await getPostComments(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Test comment');
  });
});