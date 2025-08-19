import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { directMessagesTable, usersTable } from '../db/schema';
import { type SendDirectMessageInput } from '../schema';
import { sendDirectMessage } from '../handlers/send_direct_message';
import { eq } from 'drizzle-orm';

describe('sendDirectMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let senderId: number;
  let receiverId: number;

  beforeEach(async () => {
    // Create test users for messaging
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'sender_user',
          email: 'sender@test.com',
          full_name: 'Sender User',
          bio: 'Test sender',
          is_private: false
        },
        {
          username: 'receiver_user',
          email: 'receiver@test.com',
          full_name: 'Receiver User',
          bio: 'Test receiver',
          is_private: false
        }
      ])
      .returning()
      .execute();

    senderId = users[0].id;
    receiverId = users[1].id;
  });

  it('should send a direct message successfully', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: 'Hello, this is a test message!'
    };

    const result = await sendDirectMessage(testInput);

    // Verify basic message properties
    expect(result.sender_id).toEqual(senderId);
    expect(result.receiver_id).toEqual(receiverId);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.is_read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: 'Database persistence test message'
    };

    const result = await sendDirectMessage(testInput);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_id).toEqual(senderId);
    expect(messages[0].receiver_id).toEqual(receiverId);
    expect(messages[0].content).toEqual('Database persistence test message');
    expect(messages[0].is_read).toEqual(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent users from messaging themselves', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: senderId, // Same as sender
      content: 'Self message test'
    };

    await expect(sendDirectMessage(testInput)).rejects.toThrow(/cannot send message to yourself/i);
  });

  it('should throw error when sender does not exist', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: 99999, // Non-existent user
      receiver_id: receiverId,
      content: 'Message from non-existent sender'
    };

    await expect(sendDirectMessage(testInput)).rejects.toThrow(/sender does not exist/i);
  });

  it('should throw error when receiver does not exist', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: 99999, // Non-existent user
      content: 'Message to non-existent receiver'
    };

    await expect(sendDirectMessage(testInput)).rejects.toThrow(/receiver does not exist/i);
  });

  it('should handle long messages correctly', async () => {
    const longMessage = 'A'.repeat(1000); // Maximum allowed length based on schema
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: longMessage
    };

    const result = await sendDirectMessage(testInput);

    expect(result.content).toEqual(longMessage);
    expect(result.content.length).toEqual(1000);
  });

  it('should handle messages with special characters', async () => {
    const specialMessage = 'Hello! 🎉 Special chars: @#$%^&*()_+ ñáéíóú';
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: specialMessage
    };

    const result = await sendDirectMessage(testInput);

    expect(result.content).toEqual(specialMessage);
  });

  it('should create messages as unread by default', async () => {
    const testInput: SendDirectMessageInput = {
      sender_id: senderId,
      receiver_id: receiverId,
      content: 'Unread status test'
    };

    const result = await sendDirectMessage(testInput);

    expect(result.is_read).toEqual(false);

    // Verify in database as well
    const savedMessage = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, result.id))
      .execute();

    expect(savedMessage[0].is_read).toEqual(false);
  });

  it('should handle multiple messages between same users', async () => {
    const messages = [
      'First message',
      'Second message',
      'Third message'
    ];

    const results = [];
    for (const content of messages) {
      const testInput: SendDirectMessageInput = {
        sender_id: senderId,
        receiver_id: receiverId,
        content
      };
      results.push(await sendDirectMessage(testInput));
    }

    // Verify all messages were created with different IDs
    expect(results).toHaveLength(3);
    const ids = results.map(r => r.id);
    expect(new Set(ids).size).toEqual(3); // All IDs should be unique

    // Verify content
    results.forEach((result, index) => {
      expect(result.content).toEqual(messages[index]);
    });
  });
});