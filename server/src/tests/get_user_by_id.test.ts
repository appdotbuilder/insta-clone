import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user input
const testUser: CreateUserInput = {
  username: 'testuser123',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'This is a test bio',
  profile_image_url: 'https://example.com/avatar.jpg',
  is_private: false
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by ID', async () => {
    // Create a test user first
    const insertedUsers = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        bio: testUser.bio,
        profile_image_url: testUser.profile_image_url,
        is_private: testUser.is_private
      })
      .returning()
      .execute();

    const userId = insertedUsers[0].id;

    // Test fetching the user
    const result = await getUserById(userId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(userId);
    expect(result!.username).toBe('testuser123');
    expect(result!.email).toBe('test@example.com');
    expect(result!.full_name).toBe('Test User');
    expect(result!.bio).toBe('This is a test bio');
    expect(result!.profile_image_url).toBe('https://example.com/avatar.jpg');
    expect(result!.is_verified).toBe(false);
    expect(result!.follower_count).toBe(0);
    expect(result!.following_count).toBe(0);
    expect(result!.posts_count).toBe(0);
    expect(result!.is_private).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const nonExistentUserId = 99999;
    const result = await getUserById(nonExistentUserId);

    expect(result).toBeNull();
  });

  it('should handle user with nullable fields', async () => {
    // Create user with minimal required fields only
    const minimalUser = await db.insert(usersTable)
      .values({
        username: 'minimaluser',
        email: 'minimal@example.com',
        full_name: null,
        bio: null,
        profile_image_url: null,
        is_private: false
      })
      .returning()
      .execute();

    const userId = minimalUser[0].id;

    // Test fetching the minimal user
    const result = await getUserById(userId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(userId);
    expect(result!.username).toBe('minimaluser');
    expect(result!.email).toBe('minimal@example.com');
    expect(result!.full_name).toBeNull();
    expect(result!.bio).toBeNull();
    expect(result!.profile_image_url).toBeNull();
    expect(result!.is_verified).toBe(false);
    expect(result!.is_private).toBe(false);
  });

  it('should return user with correct default values', async () => {
    // Create user and verify default values are applied correctly
    const newUser = await db.insert(usersTable)
      .values({
        username: 'defaultuser',
        email: 'default@example.com'
      })
      .returning()
      .execute();

    const userId = newUser[0].id;
    const result = await getUserById(userId);

    expect(result).not.toBeNull();
    expect(result!.is_verified).toBe(false);
    expect(result!.follower_count).toBe(0);
    expect(result!.following_count).toBe(0);
    expect(result!.posts_count).toBe(0);
    expect(result!.is_private).toBe(false);
  });

  it('should handle verified user correctly', async () => {
    // Create verified user
    const verifiedUser = await db.insert(usersTable)
      .values({
        username: 'verifieduser',
        email: 'verified@example.com',
        is_verified: true,
        follower_count: 1000,
        following_count: 500,
        posts_count: 50
      })
      .returning()
      .execute();

    const userId = verifiedUser[0].id;
    const result = await getUserById(userId);

    expect(result).not.toBeNull();
    expect(result!.is_verified).toBe(true);
    expect(result!.follower_count).toBe(1000);
    expect(result!.following_count).toBe(500);
    expect(result!.posts_count).toBe(50);
  });
});