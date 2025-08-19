import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type UnfollowUserInput } from '../schema';
import { unfollowUser } from '../handlers/unfollow_user';
import { eq, and } from 'drizzle-orm';

describe('unfollowUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser1: any;
  let testUser2: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          following_count: 1,
          follower_count: 0
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          following_count: 0,
          follower_count: 1
        }
      ])
      .returning()
      .execute();

    testUser1 = users[0];
    testUser2 = users[1];

    // Create a follow relationship
    await db.insert(followsTable)
      .values({
        follower_id: testUser1.id,
        following_id: testUser2.id
      })
      .execute();
  });

  it('should successfully unfollow a user', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: testUser2.id
    };

    const result = await unfollowUser(input);

    expect(result.success).toBe(true);
  });

  it('should remove follow relationship from database', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: testUser2.id
    };

    await unfollowUser(input);

    // Check that follow relationship is removed
    const followRelationship = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, testUser1.id),
          eq(followsTable.following_id, testUser2.id)
        )
      )
      .execute();

    expect(followRelationship).toHaveLength(0);
  });

  it('should decrement follower following_count', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: testUser2.id
    };

    await unfollowUser(input);

    const followerUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser1.id))
      .execute();

    expect(followerUser[0].following_count).toBe(0);
  });

  it('should decrement following user follower_count', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: testUser2.id
    };

    await unfollowUser(input);

    const followingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser2.id))
      .execute();

    expect(followingUser[0].follower_count).toBe(0);
  });

  it('should throw error when follower user does not exist', async () => {
    const input: UnfollowUserInput = {
      follower_id: 9999,
      following_id: testUser2.id
    };

    expect(unfollowUser(input)).rejects.toThrow(/follower user with id 9999 not found/i);
  });

  it('should throw error when following user does not exist', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: 9999
    };

    expect(unfollowUser(input)).rejects.toThrow(/following user with id 9999 not found/i);
  });

  it('should throw error when follow relationship does not exist', async () => {
    // Create a third user who is not followed by testUser1
    const thirdUser = await db.insert(usersTable)
      .values({
        username: 'third_user',
        email: 'third@test.com'
      })
      .returning()
      .execute();

    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: thirdUser[0].id
    };

    expect(unfollowUser(input)).rejects.toThrow(/follow relationship does not exist/i);
  });

  it('should handle multiple unfollow operations correctly', async () => {
    // Create additional test users and follow relationships
    const additionalUsers = await db.insert(usersTable)
      .values([
        {
          username: 'user3',
          email: 'user3@test.com',
          following_count: 0,
          follower_count: 1
        },
        {
          username: 'user4', 
          email: 'user4@test.com',
          following_count: 2,
          follower_count: 0
        }
      ])
      .returning()
      .execute();

    // Create additional follow relationships
    await db.insert(followsTable)
      .values([
        {
          follower_id: additionalUsers[1].id,
          following_id: testUser1.id
        },
        {
          follower_id: additionalUsers[1].id,
          following_id: additionalUsers[0].id
        }
      ])
      .execute();

    // Unfollow first relationship
    await unfollowUser({
      follower_id: testUser1.id,
      following_id: testUser2.id
    });

    // Unfollow second relationship
    await unfollowUser({
      follower_id: additionalUsers[1].id,
      following_id: testUser1.id
    });

    // Check user counts are correctly updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, additionalUsers[1].id))
      .execute();

    expect(users[0].following_count).toBe(1); // Started with 2, unfollowed 1
  });

  it('should handle same user trying to unfollow themselves', async () => {
    const input: UnfollowUserInput = {
      follower_id: testUser1.id,
      following_id: testUser1.id
    };

    expect(unfollowUser(input)).rejects.toThrow(/follow relationship does not exist/i);
  });
});