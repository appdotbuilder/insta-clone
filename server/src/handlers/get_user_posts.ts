import { db } from '../db';
import { postsTable } from '../db/schema';
import { type GetUserPostsInput, type Post } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserPosts(input: GetUserPostsInput): Promise<Post[]> {
  try {
    // Build query with user filter, ordering, and pagination
    const results = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, input.user_id))
      .orderBy(desc(postsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get user posts:', error);
    throw error;
  }
}