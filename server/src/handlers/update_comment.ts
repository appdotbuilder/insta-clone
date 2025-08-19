import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type UpdateCommentInput, type Comment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateComment = async (input: UpdateCommentInput): Promise<Comment> => {
  try {
    // Update comment content and updated_at timestamp
    const result = await db.update(commentsTable)
      .set({
        content: input.content,
        updated_at: new Date()
      })
      .where(eq(commentsTable.id, input.id))
      .returning()
      .execute();

    // Check if comment was found and updated
    if (result.length === 0) {
      throw new Error(`Comment with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Comment update failed:', error);
    throw error;
  }
};