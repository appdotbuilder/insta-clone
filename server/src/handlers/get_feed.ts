import { db } from '../db';
import { postsTable, followsTable } from '../db/schema';
import { type GetFeedInput, type Post } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getFeed(input: GetFeedInput): Promise<Post[]> {
  try {
    // Get posts from users that the current user follows
    // Join follows table to get following relationships, then join posts table
    const results = await db.select({
      id: postsTable.id,
      user_id: postsTable.user_id,
      caption: postsTable.caption,
      image_url: postsTable.image_url,
      video_url: postsTable.video_url,
      like_count: postsTable.like_count,
      comment_count: postsTable.comment_count,
      created_at: postsTable.created_at,
      updated_at: postsTable.updated_at
    })
      .from(postsTable)
      .innerJoin(followsTable, eq(postsTable.user_id, followsTable.following_id))
      .where(eq(followsTable.follower_id, input.user_id))
      .orderBy(desc(postsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Feed retrieval failed:', error);
    throw error;
  }
}