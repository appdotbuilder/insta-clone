import { db } from '../db';
import { postsTable } from '../db/schema';
import { type UpdatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePost = async (input: UpdatePostInput): Promise<Post> => {
  try {
    // Check if post exists first
    const existingPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingPost.length === 0) {
      throw new Error(`Post with id ${input.id} not found`);
    }

    // Update the post
    const result = await db.update(postsTable)
      .set({
        caption: input.caption,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Post update failed:', error);
    throw error;
  }
};