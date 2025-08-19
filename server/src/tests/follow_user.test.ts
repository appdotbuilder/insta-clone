import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type FollowUserInput } from '../schema';
import { followUser } from '../handlers/follow_user';
import { eq, and } from 'drizzle-orm';

describe('followUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users helper
  const createTestUsers = async () => {
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@example.com',
          full_name: 'Follower User',
          following_count: 0,
          follower_count: 0
        },
        {
          username: 'following_user',
          email: 'following@example.com',
          full_name: 'Following User',
          following_count: 0,
          follower_count: 0
        },
        {
          username: 'third_user',
          email: 'third@example.com',
          full_name: 'Third User',
          following_count: 5,
          follower_count: 10
        }
      ])
      .returning()
      .execute();

    return users;
  };

  it('should create a follow relationship successfully', async () => {
    const users = await createTestUsers();
    const follower = users[0];
    const following = users[1];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: following.id
    };

    const result = await followUser(input);

    // Verify the follow record was created
    expect(result.id).toBeDefined();
    expect(result.follower_id).toEqual(follower.id);
    expect(result.following_id).toEqual(following.id);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save follow relationship to database', async () => {
    const users = await createTestUsers();
    const follower = users[0];
    const following = users[1];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: following.id
    };

    const result = await followUser(input);

    // Query the database to verify the follow was saved
    const follows = await db.select()
      .from(followsTable)
      .where(eq(followsTable.id, result.id))
      .execute();

    expect(follows).toHaveLength(1);
    expect(follows[0].follower_id).toEqual(follower.id);
    expect(follows[0].following_id).toEqual(following.id);
    expect(follows[0].created_at).toBeInstanceOf(Date);
  });

  it('should update follower and following user counts', async () => {
    const users = await createTestUsers();
    const follower = users[0];
    const following = users[1];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: following.id
    };

    await followUser(input);

    // Check updated counts
    const [updatedFollower, updatedFollowing] = await Promise.all([
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, follower.id))
        .execute(),
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, following.id))
        .execute()
    ]);

    // Follower's following_count should increment
    expect(updatedFollower[0].following_count).toEqual(1);
    expect(updatedFollower[0].updated_at).toBeInstanceOf(Date);

    // Following user's follower_count should increment
    expect(updatedFollowing[0].follower_count).toEqual(1);
    expect(updatedFollowing[0].updated_at).toBeInstanceOf(Date);
  });

  it('should preserve existing counts when updating', async () => {
    const users = await createTestUsers();
    const follower = users[2]; // User with existing counts (5 following, 10 followers)
    const following = users[0];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: following.id
    };

    await followUser(input);

    // Check that existing counts were preserved and incremented
    const updatedFollower = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, follower.id))
      .execute();

    expect(updatedFollower[0].following_count).toEqual(6); // 5 + 1
  });

  it('should reject self-following', async () => {
    const users = await createTestUsers();
    const user = users[0];

    const input: FollowUserInput = {
      follower_id: user.id,
      following_id: user.id
    };

    await expect(followUser(input)).rejects.toThrow(/cannot follow themselves/i);

    // Verify no follow record was created
    const follows = await db.select()
      .from(followsTable)
      .where(and(
        eq(followsTable.follower_id, user.id),
        eq(followsTable.following_id, user.id)
      ))
      .execute();

    expect(follows).toHaveLength(0);
  });

  it('should reject follow when follower user does not exist', async () => {
    const users = await createTestUsers();
    const following = users[0];

    const input: FollowUserInput = {
      follower_id: 99999, // Non-existent user ID
      following_id: following.id
    };

    await expect(followUser(input)).rejects.toThrow(/follower user not found/i);

    // Verify no follow record was created
    const follows = await db.select()
      .from(followsTable)
      .where(eq(followsTable.following_id, following.id))
      .execute();

    expect(follows).toHaveLength(0);
  });

  it('should reject follow when following user does not exist', async () => {
    const users = await createTestUsers();
    const follower = users[0];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: 99999 // Non-existent user ID
    };

    await expect(followUser(input)).rejects.toThrow(/following user not found/i);

    // Verify no follow record was created
    const follows = await db.select()
      .from(followsTable)
      .where(eq(followsTable.follower_id, follower.id))
      .execute();

    expect(follows).toHaveLength(0);
  });

  it('should reject duplicate follow relationships', async () => {
    const users = await createTestUsers();
    const follower = users[0];
    const following = users[1];

    const input: FollowUserInput = {
      follower_id: follower.id,
      following_id: following.id
    };

    // Create the first follow relationship
    await followUser(input);

    // Attempt to create duplicate follow relationship
    await expect(followUser(input)).rejects.toThrow(/follow relationship already exists/i);

    // Verify only one follow record exists
    const follows = await db.select()
      .from(followsTable)
      .where(and(
        eq(followsTable.follower_id, follower.id),
        eq(followsTable.following_id, following.id)
      ))
      .execute();

    expect(follows).toHaveLength(1);

    // Verify counts were not double-incremented
    const [updatedFollower, updatedFollowing] = await Promise.all([
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, follower.id))
        .execute(),
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, following.id))
        .execute()
    ]);

    expect(updatedFollower[0].following_count).toEqual(1); // Not 2
    expect(updatedFollowing[0].follower_count).toEqual(1); // Not 2
  });

  it('should handle multiple different follow relationships', async () => {
    const users = await createTestUsers();
    const user1 = users[0];
    const user2 = users[1];
    const user3 = users[2];

    // Create multiple follow relationships
    await followUser({ follower_id: user1.id, following_id: user2.id });
    await followUser({ follower_id: user1.id, following_id: user3.id });
    await followUser({ follower_id: user2.id, following_id: user3.id });

    // Verify all relationships exist
    const follows = await db.select().from(followsTable).execute();
    expect(follows).toHaveLength(3);

    // Verify user1 is following 2 users
    const user1Updated = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user1.id))
      .execute();
    expect(user1Updated[0].following_count).toEqual(2);

    // Verify user3 has 2 followers
    const user3Updated = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user3.id))
      .execute();
    expect(user3Updated[0].follower_count).toEqual(12); // 10 original + 2 new
  });
});