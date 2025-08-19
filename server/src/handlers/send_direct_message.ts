import { type SendDirectMessageInput, type DirectMessage } from '../schema';

export async function sendDirectMessage(input: SendDirectMessageInput): Promise<DirectMessage> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is sending a direct message between users.
    // Should validate that both sender and receiver exist.
    // Should prevent users from messaging themselves.
    // Message starts as unread (is_read = false).
    return Promise.resolve({
        id: 0, // Placeholder ID
        sender_id: input.sender_id,
        receiver_id: input.receiver_id,
        content: input.content,
        is_read: false,
        created_at: new Date()
    } as DirectMessage);
}