import { db } from '../db';
import { commentsTable, usersTable } from '../db/schema';
import { type GetPostCommentsInput, type Comment } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPostComments(input: GetPostCommentsInput): Promise<Comment[]> {
  try {
    // Build the complete query in one go to maintain proper type inference
    const results = await db.select({
      id: commentsTable.id,
      user_id: commentsTable.user_id,
      post_id: commentsTable.post_id,
      content: commentsTable.content,
      like_count: commentsTable.like_count,
      created_at: commentsTable.created_at,
      updated_at: commentsTable.updated_at
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.user_id, usersTable.id))
    .where(eq(commentsTable.post_id, input.post_id))
    .orderBy(desc(commentsTable.created_at))
    .limit(input.limit)
    .offset(input.offset)
    .execute();

    // Map results to Comment schema format
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      post_id: result.post_id,
      content: result.content,
      like_count: result.like_count,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to get post comments:', error);
    throw error;
  }
}