import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'This is a test bio',
  profile_image_url: 'https://example.com/avatar.jpg',
  is_private: false
};

// Test input with minimal fields
const minimalInput: CreateUserInput = {
  username: 'minimal',
  email: 'minimal@example.com',
  full_name: null,
  bio: null,
  profile_image_url: null,
  is_private: false
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('This is a test bio');
    expect(result.profile_image_url).toEqual('https://example.com/avatar.jpg');
    expect(result.is_private).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify default values
    expect(result.is_verified).toEqual(false);
    expect(result.follower_count).toEqual(0);
    expect(result.following_count).toEqual(0);
    expect(result.posts_count).toEqual(0);
  });

  it('should create a user with minimal fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.username).toEqual('minimal');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.full_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
    expect(result.is_private).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query the database to verify the user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].bio).toEqual('This is a test bio');
    expect(users[0].is_private).toEqual(false);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create a private user when is_private is true', async () => {
    const privateUserInput: CreateUserInput = {
      ...testInput,
      username: 'privateuser',
      email: 'private@example.com',
      is_private: true
    };

    const result = await createUser(privateUserInput);

    expect(result.is_private).toEqual(true);
    expect(result.username).toEqual('privateuser');
  });

  it('should fail when username already exists', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with the same username
    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should fail when email already exists', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with the same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle users with special characters in bio', async () => {
    const specialCharInput: CreateUserInput = {
      username: 'specialuser',
      email: 'special@example.com',
      full_name: 'Special User',
      bio: '🌟 Special bio with emojis & symbols! 🎉',
      profile_image_url: null,
      is_private: false
    };

    const result = await createUser(specialCharInput);

    expect(result.bio).toEqual('🌟 Special bio with emojis & symbols! 🎉');
    expect(result.username).toEqual('specialuser');
  });
});