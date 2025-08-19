import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type RemoveLikeInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function unlikePost(input: RemoveLikeInput): Promise<{ success: boolean }> {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Validate that the post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .limit(1)
      .execute();

    if (post.length === 0) {
      throw new Error('Post not found');
    }

    // Check if the like exists
    const existingLike = await db.select()
      .from(likesTable)
      .where(and(
        eq(likesTable.user_id, input.user_id),
        eq(likesTable.post_id, input.post_id)
      ))
      .limit(1)
      .execute();

    if (existingLike.length === 0) {
      throw new Error('Like not found');
    }

    // Remove the like
    await db.delete(likesTable)
      .where(and(
        eq(likesTable.user_id, input.user_id),
        eq(likesTable.post_id, input.post_id)
      ))
      .execute();

    // Decrement the post's like count
    await db.update(postsTable)
      .set({
        like_count: post[0].like_count - 1,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Unlike post failed:', error);
    throw error;
  }
}