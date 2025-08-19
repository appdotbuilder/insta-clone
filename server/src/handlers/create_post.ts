import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  try {
    // Validate that at least one of image_url or video_url is provided
    if (!input.image_url && !input.video_url) {
      throw new Error('At least one of image_url or video_url must be provided');
    }

    // Verify that the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Create the post
    const result = await db.insert(postsTable)
      .values({
        user_id: input.user_id,
        caption: input.caption,
        image_url: input.image_url,
        video_url: input.video_url
      })
      .returning()
      .execute();

    const post = result[0];

    // Increment user's posts count
    await db.update(usersTable)
      .set({ 
        posts_count: users[0].posts_count + 1,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    return post;
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
};