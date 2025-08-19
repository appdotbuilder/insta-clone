import { db } from '../db';
import { likesTable, postsTable, usersTable } from '../db/schema';
import { type CreateLikeInput, type Like } from '../schema';
import { eq, and } from 'drizzle-orm';

export const likePost = async (input: CreateLikeInput): Promise<Like> => {
  try {
    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Validate that post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (post.length === 0) {
      throw new Error('Post not found');
    }

    // Check if like already exists
    const existingLike = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    if (existingLike.length > 0) {
      throw new Error('User has already liked this post');
    }

    // Create the like
    const result = await db.insert(likesTable)
      .values({
        user_id: input.user_id,
        post_id: input.post_id
      })
      .returning()
      .execute();

    // Increment the post's like count
    await db.update(postsTable)
      .set({
        like_count: post[0].like_count + 1,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Like post failed:', error);
    throw error;
  }
};