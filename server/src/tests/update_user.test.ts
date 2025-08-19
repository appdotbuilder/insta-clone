import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test data
const testCreateUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'Original bio',
  profile_image_url: 'https://example.com/original.jpg',
  is_private: false
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user profile with all fields', async () => {
    // Create initial user
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testCreateUser.username,
        email: testCreateUser.email,
        full_name: testCreateUser.full_name,
        bio: testCreateUser.bio,
        profile_image_url: testCreateUser.profile_image_url,
        is_private: testCreateUser.is_private
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'updateduser',
      full_name: 'Updated User',
      bio: 'Updated bio content',
      profile_image_url: 'https://example.com/updated.jpg',
      is_private: true
    };

    const result = await updateUser(updateInput);

    // Verify all updated fields
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.full_name).toEqual('Updated User');
    expect(result.bio).toEqual('Updated bio content');
    expect(result.profile_image_url).toEqual('https://example.com/updated.jpg');
    expect(result.is_private).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    // Create initial user
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testCreateUser.username,
        email: testCreateUser.email,
        full_name: testCreateUser.full_name,
        bio: testCreateUser.bio,
        profile_image_url: testCreateUser.profile_image_url,
        is_private: testCreateUser.is_private
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      bio: 'Only bio updated'
    };

    const result = await updateUser(updateInput);

    // Verify only bio was updated, other fields remain unchanged
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('Only bio updated');
    expect(result.profile_image_url).toEqual('https://example.com/original.jpg');
    expect(result.is_private).toEqual(false);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should handle null values correctly', async () => {
    // Create initial user
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testCreateUser.username,
        email: testCreateUser.email,
        full_name: testCreateUser.full_name,
        bio: testCreateUser.bio,
        profile_image_url: testCreateUser.profile_image_url,
        is_private: testCreateUser.is_private
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      full_name: null,
      bio: null,
      profile_image_url: null
    };

    const result = await updateUser(updateInput);

    // Verify null values were set
    expect(result.full_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
    expect(result.username).toEqual('testuser'); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    // Create initial user
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testCreateUser.username,
        email: testCreateUser.email,
        full_name: testCreateUser.full_name,
        bio: testCreateUser.bio,
        profile_image_url: testCreateUser.profile_image_url,
        is_private: testCreateUser.is_private
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      username: 'persistentupdate',
      bio: 'Database persistence test'
    };

    await updateUser(updateInput);

    // Query database to verify changes persisted
    const [updatedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(updatedUser.username).toEqual('persistentupdate');
    expect(updatedUser.bio).toEqual('Database persistence test');
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent ID
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle username uniqueness constraint', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com'
      })
      .execute();

    const updateInput: UpdateUserInput = {
      id: user1.id,
      username: 'user2' // Try to use existing username
    };

    // Should throw due to unique constraint violation
    await expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should preserve other user properties', async () => {
    // Create initial user
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testCreateUser.username,
        email: testCreateUser.email,
        full_name: testCreateUser.full_name,
        bio: testCreateUser.bio,
        profile_image_url: testCreateUser.profile_image_url,
        is_private: testCreateUser.is_private,
        is_verified: true,
        follower_count: 100,
        following_count: 50,
        posts_count: 25
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      bio: 'Updated bio only'
    };

    const result = await updateUser(updateInput);

    // Verify system-maintained fields are preserved
    expect(result.is_verified).toEqual(true);
    expect(result.follower_count).toEqual(100);
    expect(result.following_count).toEqual(50);
    expect(result.posts_count).toEqual(25);
    expect(result.created_at).toEqual(createdUser.created_at);
  });
});