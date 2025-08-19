import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, directMessagesTable } from '../db/schema';
import { type MarkMessageAsReadInput } from '../schema';
import { markMessageAsRead } from '../handlers/mark_message_as_read';
import { eq } from 'drizzle-orm';

// Test users data
const testUser1 = {
  username: 'sender_user',
  email: 'sender@example.com',
  full_name: 'Sender User',
  bio: 'Test sender bio',
  profile_image_url: null,
  is_private: false
};

const testUser2 = {
  username: 'receiver_user',
  email: 'receiver@example.com',
  full_name: 'Receiver User',
  bio: 'Test receiver bio',
  profile_image_url: null,
  is_private: false
};

describe('markMessageAsRead', () => {
  let senderId: number;
  let receiverId: number;
  let messageId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const senderResult = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();
    senderId = senderResult[0].id;

    const receiverResult = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    receiverId = receiverResult[0].id;

    // Create a test message
    const messageResult = await db.insert(directMessagesTable)
      .values({
        sender_id: senderId,
        receiver_id: receiverId,
        content: 'Test message content',
        is_read: false
      })
      .returning()
      .execute();
    messageId = messageResult[0].id;
  });

  afterEach(resetDB);

  it('should mark message as read', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: receiverId
    };

    const result = await markMessageAsRead(input);

    expect(result.id).toEqual(messageId);
    expect(result.sender_id).toEqual(senderId);
    expect(result.receiver_id).toEqual(receiverId);
    expect(result.content).toEqual('Test message content');
    expect(result.is_read).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update message in database', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: receiverId
    };

    await markMessageAsRead(input);

    // Verify the message was updated in the database
    const messages = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, messageId))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].is_read).toBe(true);
    expect(messages[0].sender_id).toEqual(senderId);
    expect(messages[0].receiver_id).toEqual(receiverId);
    expect(messages[0].content).toEqual('Test message content');
  });

  it('should throw error if message does not exist', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: 99999, // Non-existent message ID
      user_id: receiverId
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/message not found/i);
  });

  it('should throw error if user is not the receiver', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: senderId // Sender trying to mark their own message as read
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/not the receiver/i);
  });

  it('should throw error if user does not exist', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: 99999 // Non-existent user ID
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/message not found/i);
  });

  it('should work with already read messages', async () => {
    // First mark the message as read
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: receiverId
    };

    await markMessageAsRead(input);

    // Try to mark it as read again
    const result = await markMessageAsRead(input);

    expect(result.is_read).toBe(true);
    expect(result.id).toEqual(messageId);
  });

  it('should handle messages with different content types', async () => {
    // Create a message with special characters and emojis
    const specialMessage = await db.insert(directMessagesTable)
      .values({
        sender_id: senderId,
        receiver_id: receiverId,
        content: 'Special message with emojis 😊🎉 and symbols @#$%^&*()',
        is_read: false
      })
      .returning()
      .execute();

    const input: MarkMessageAsReadInput = {
      message_id: specialMessage[0].id,
      user_id: receiverId
    };

    const result = await markMessageAsRead(input);

    expect(result.is_read).toBe(true);
    expect(result.content).toEqual('Special message with emojis 😊🎉 and symbols @#$%^&*()');
  });
});