import { db } from '../db';
import { storiesTable, usersTable } from '../db/schema';
import { type CreateStoryInput, type Story } from '../schema';
import { eq } from 'drizzle-orm';

export const createStory = async (input: CreateStoryInput): Promise<Story> => {
  try {
    // Validate that at least one of image_url or video_url is provided
    if (!input.image_url && !input.video_url) {
      throw new Error('Story must have either an image_url or video_url');
    }

    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Set expiry time to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert story record
    const result = await db.insert(storiesTable)
      .values({
        user_id: input.user_id,
        image_url: input.image_url,
        video_url: input.video_url,
        expires_at: expiresAt
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Story creation failed:', error);
    throw error;
  }
};