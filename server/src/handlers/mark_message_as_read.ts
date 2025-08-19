import { db } from '../db';
import { directMessagesTable } from '../db/schema';
import { type MarkMessageAsReadInput, type DirectMessage } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markMessageAsRead = async (input: MarkMessageAsReadInput): Promise<DirectMessage> => {
  try {
    // First verify the message exists and the user is the receiver
    const existingMessage = await db.select()
      .from(directMessagesTable)
      .where(
        and(
          eq(directMessagesTable.id, input.message_id),
          eq(directMessagesTable.receiver_id, input.user_id)
        )
      )
      .execute();

    if (existingMessage.length === 0) {
      throw new Error('Message not found or user is not the receiver');
    }

    // Update the message to mark as read
    const result = await db.update(directMessagesTable)
      .set({
        is_read: true
      })
      .where(eq(directMessagesTable.id, input.message_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Mark message as read failed:', error);
    throw error;
  }
};