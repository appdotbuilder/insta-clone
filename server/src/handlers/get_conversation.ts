import { db } from '../db';
import { directMessagesTable } from '../db/schema';
import { type GetConversationInput, type DirectMessage } from '../schema';
import { or, and, eq, desc } from 'drizzle-orm';

export const getConversation = async (input: GetConversationInput): Promise<DirectMessage[]> => {
  try {
    // Build query to get messages between the two users
    const results = await db.select()
      .from(directMessagesTable)
      .where(
        or(
          and(
            eq(directMessagesTable.sender_id, input.user_id),
            eq(directMessagesTable.receiver_id, input.other_user_id)
          ),
          and(
            eq(directMessagesTable.sender_id, input.other_user_id),
            eq(directMessagesTable.receiver_id, input.user_id)
          )
        )
      )
      .orderBy(desc(directMessagesTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Conversation fetch failed:', error);
    throw error;
  }
};