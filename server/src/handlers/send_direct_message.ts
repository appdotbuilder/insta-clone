import { db } from '../db';
import { directMessagesTable, usersTable } from '../db/schema';
import { type SendDirectMessageInput, type DirectMessage } from '../schema';
import { eq } from 'drizzle-orm';

export const sendDirectMessage = async (input: SendDirectMessageInput): Promise<DirectMessage> => {
  try {
    // Prevent users from messaging themselves
    if (input.sender_id === input.receiver_id) {
      throw new Error('Cannot send message to yourself');
    }

    // Validate that both sender and receiver exist
    const [sender, receiver] = await Promise.all([
      db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, input.sender_id))
        .execute(),
      db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, input.receiver_id))
        .execute()
    ]);

    if (sender.length === 0) {
      throw new Error('Sender does not exist');
    }

    if (receiver.length === 0) {
      throw new Error('Receiver does not exist');
    }

    // Insert the direct message
    const result = await db.insert(directMessagesTable)
      .values({
        sender_id: input.sender_id,
        receiver_id: input.receiver_id,
        content: input.content,
        is_read: false // Message starts as unread
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send direct message failed:', error);
    throw error;
  }
};