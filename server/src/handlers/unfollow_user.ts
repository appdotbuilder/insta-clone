import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type UnfollowUserInput } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function unfollowUser(input: UnfollowUserInput): Promise<{ success: boolean }> {
  try {
    // Validate that both users exist
    const [follower, following] = await Promise.all([
      db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, input.follower_id))
        .execute(),
      db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, input.following_id))
        .execute()
    ]);

    if (follower.length === 0) {
      throw new Error(`Follower user with id ${input.follower_id} not found`);
    }

    if (following.length === 0) {
      throw new Error(`Following user with id ${input.following_id} not found`);
    }

    // Check if the follow relationship exists
    const existingFollow = await db.select({ id: followsTable.id })
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, input.follower_id),
          eq(followsTable.following_id, input.following_id)
        )
      )
      .execute();

    if (existingFollow.length === 0) {
      throw new Error('Follow relationship does not exist');
    }

    // Delete the follow relationship and update user counts in a transaction
    await db.transaction(async (tx) => {
      // Delete the follow relationship
      await tx.delete(followsTable)
        .where(
          and(
            eq(followsTable.follower_id, input.follower_id),
            eq(followsTable.following_id, input.following_id)
          )
        );

      // Decrement follower's following_count
      await tx.update(usersTable)
        .set({ following_count: sql`${usersTable.following_count} - 1` })
        .where(eq(usersTable.id, input.follower_id));

      // Decrement following user's follower_count
      await tx.update(usersTable)
        .set({ follower_count: sql`${usersTable.follower_count} - 1` })
        .where(eq(usersTable.id, input.following_id));
    });

    return { success: true };
  } catch (error) {
    console.error('Unfollow user failed:', error);
    throw error;
  }
}