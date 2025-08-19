import { db } from '../db';
import { followsTable, usersTable } from '../db/schema';
import { type FollowUserInput, type Follow } from '../schema';
import { eq, and } from 'drizzle-orm';

export const followUser = async (input: FollowUserInput): Promise<Follow> => {
  try {
    // Prevent self-following
    if (input.follower_id === input.following_id) {
      throw new Error('Users cannot follow themselves');
    }

    // Verify both users exist
    const [followerUser, followingUser] = await Promise.all([
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.follower_id))
        .execute(),
      db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.following_id))
        .execute()
    ]);

    if (followerUser.length === 0) {
      throw new Error('Follower user not found');
    }

    if (followingUser.length === 0) {
      throw new Error('Following user not found');
    }

    // Check if follow relationship already exists
    const existingFollow = await db.select()
      .from(followsTable)
      .where(and(
        eq(followsTable.follower_id, input.follower_id),
        eq(followsTable.following_id, input.following_id)
      ))
      .execute();

    if (existingFollow.length > 0) {
      throw new Error('Follow relationship already exists');
    }

    // Create follow relationship in a transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // Insert the follow record
      const followResult = await tx.insert(followsTable)
        .values({
          follower_id: input.follower_id,
          following_id: input.following_id
        })
        .returning()
        .execute();

      // Update follower's following_count
      await tx.update(usersTable)
        .set({
          following_count: followerUser[0].following_count + 1,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.follower_id))
        .execute();

      // Update following user's follower_count
      await tx.update(usersTable)
        .set({
          follower_count: followingUser[0].follower_count + 1,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.following_id))
        .execute();

      return followResult[0];
    });

    return result;
  } catch (error) {
    console.error('Follow user operation failed:', error);
    throw error;
  }
};