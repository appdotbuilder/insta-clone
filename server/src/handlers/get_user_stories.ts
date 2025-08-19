import { db } from '../db';
import { storiesTable } from '../db/schema';
import { type GetUserStoriesInput, type Story } from '../schema';
import { eq, gt, desc } from 'drizzle-orm';

export const getUserStories = async (input: GetUserStoriesInput): Promise<Story[]> => {
  try {
    // Get current timestamp to filter out expired stories
    const now = new Date();

    // Query active stories for the user
    const results = await db.select()
      .from(storiesTable)
      .where(
        eq(storiesTable.user_id, input.user_id)
      )
      .orderBy(desc(storiesTable.created_at))
      .execute();

    // Filter out expired stories and return only active ones
    const activeStories = results.filter(story => story.expires_at > now);

    return activeStories;
  } catch (error) {
    console.error('Get user stories failed:', error);
    throw error;
  }
};