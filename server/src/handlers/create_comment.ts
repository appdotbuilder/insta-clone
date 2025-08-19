import { db } from '../db';
import { commentsTable, postsTable, usersTable } from '../db/schema';
import { type CreateCommentInput, type Comment } from '../schema';
import { eq } from 'drizzle-orm';

export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate that the post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .limit(1)
      .execute();

    if (post.length === 0) {
      throw new Error(`Post with id ${input.post_id} does not exist`);
    }

    // Create the comment
    const result = await db.insert(commentsTable)
      .values({
        user_id: input.user_id,
        post_id: input.post_id,
        content: input.content,
        like_count: 0
      })
      .returning()
      .execute();

    // Increment the post's comment count
    await db.update(postsTable)
      .set({
        comment_count: post[0].comment_count + 1,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
};