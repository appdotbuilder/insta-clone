import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, directMessagesTable } from '../db/schema';
import { type GetConversationInput } from '../schema';
import { getConversation } from '../handlers/get_conversation';
import { eq } from 'drizzle-orm';

describe('getConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get conversation between two users', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2', 
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create test messages between users with staggered timing
    const message1 = await db.insert(directMessagesTable)
      .values({
        sender_id: user1.id,
        receiver_id: user2.id,
        content: 'Hello from user1 to user2'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const message2 = await db.insert(directMessagesTable)
      .values({
        sender_id: user2.id,
        receiver_id: user1.id,
        content: 'Reply from user2 to user1'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const message3 = await db.insert(directMessagesTable)
      .values({
        sender_id: user1.id,
        receiver_id: user2.id,
        content: 'Another message from user1'
      })
      .returning()
      .execute();

    const input: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 20,
      offset: 0
    };

    const result = await getConversation(input);

    // Should return all 3 messages
    expect(result).toHaveLength(3);

    // Messages should be ordered by creation date (newest first)
    expect(result[0].content).toEqual('Another message from user1');
    expect(result[1].content).toEqual('Reply from user2 to user1');
    expect(result[2].content).toEqual('Hello from user1 to user2');

    // Verify message properties
    result.forEach(message => {
      expect(message.id).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.is_read).toEqual(false);
      expect(message.created_at).toBeInstanceOf(Date);
      expect([user1.id, user2.id]).toContain(message.sender_id);
      expect([user1.id, user2.id]).toContain(message.receiver_id);
    });
  });

  it('should respect pagination limit', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2',
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create 5 test messages with staggered timing to ensure proper ordering
    for (let i = 0; i < 5; i++) {
      await db.insert(directMessagesTable)
        .values({
          sender_id: user1.id,
          receiver_id: user2.id,
          content: `Message ${i + 1}`
        })
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const input: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 3,
      offset: 0
    };

    const result = await getConversation(input);

    // Should return only 3 messages due to limit
    expect(result).toHaveLength(3);
  });

  it('should respect pagination offset', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2',
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create 5 test messages with staggered timing to ensure proper ordering
    for (let i = 0; i < 5; i++) {
      await db.insert(directMessagesTable)
        .values({
          sender_id: user1.id,
          receiver_id: user2.id,
          content: `Message ${i + 1}`
        })
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const input: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 10,
      offset: 2
    };

    const result = await getConversation(input);

    // Should return 3 messages (5 total - 2 offset)
    expect(result).toHaveLength(3);

    // Should be the older messages (ordered newest first, so offset skips 2 newest)
    // With messages 1,2,3,4,5 inserted in that order, newest first gives us 5,4,3,2,1
    // Offset 2 skips messages 5,4 and returns 3,2,1
    expect(result[0].content).toEqual('Message 3');
    expect(result[1].content).toEqual('Message 2');
    expect(result[2].content).toEqual('Message 1');
  });

  it('should return empty array when no conversation exists', async () => {
    // Create test users but no messages
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2',
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    const input: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 20,
      offset: 0
    };

    const result = await getConversation(input);

    expect(result).toHaveLength(0);
  });

  it('should not include messages from other conversations', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2',
          email: 'user2@example.com'
        },
        {
          username: 'user3',
          email: 'user3@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];
    const user3 = users[2];

    // Create messages between user1 and user2
    await db.insert(directMessagesTable)
      .values([
        {
          sender_id: user1.id,
          receiver_id: user2.id,
          content: 'Message between 1 and 2'
        }
      ])
      .execute();

    // Create messages between user1 and user3 (should not be included)
    await db.insert(directMessagesTable)
      .values([
        {
          sender_id: user1.id,
          receiver_id: user3.id,
          content: 'Message between 1 and 3'
        }
      ])
      .execute();

    const input: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 20,
      offset: 0
    };

    const result = await getConversation(input);

    // Should only return the message between user1 and user2
    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message between 1 and 2');
    expect(result[0].sender_id).toEqual(user1.id);
    expect(result[0].receiver_id).toEqual(user2.id);
  });

  it('should work with bidirectional conversation', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com'
        },
        {
          username: 'user2',
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create messages in both directions
    await db.insert(directMessagesTable)
      .values([
        {
          sender_id: user1.id,
          receiver_id: user2.id,
          content: 'Message from 1 to 2'
        },
        {
          sender_id: user2.id,
          receiver_id: user1.id,
          content: 'Message from 2 to 1'
        }
      ])
      .execute();

    // Test from user1's perspective
    const input1: GetConversationInput = {
      user_id: user1.id,
      other_user_id: user2.id,
      limit: 20,
      offset: 0
    };

    const result1 = await getConversation(input1);
    expect(result1).toHaveLength(2);

    // Test from user2's perspective - should return same conversation
    const input2: GetConversationInput = {
      user_id: user2.id,
      other_user_id: user1.id,
      limit: 20,
      offset: 0
    };

    const result2 = await getConversation(input2);
    expect(result2).toHaveLength(2);

    // Both results should contain the same messages (same IDs)
    const ids1 = result1.map(m => m.id).sort();
    const ids2 = result2.map(m => m.id).sort();
    expect(ids1).toEqual(ids2);
  });
});