import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import type { DirectMessage, SendDirectMessageInput } from '../../../server/src/schema';

interface DirectMessagesProps {
  userId: number;
}

interface Conversation {
  userId: number;
  username: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

export function DirectMessages({ userId }: DirectMessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load conversations (mock data since backend is stub)
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch actual conversations
      // For demo, we'll show some mock conversations
      const mockConversations: Conversation[] = [
        {
          userId: 2,
          username: 'alice_wonder',
          lastMessage: 'Hey! How was your weekend? 😊',
          lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          unreadCount: 2
        },
        {
          userId: 3,
          username: 'bob_builder',
          lastMessage: 'Thanks for sharing that recipe! 🍝',
          lastMessageTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          unreadCount: 0
        },
        {
          userId: 4,
          username: 'charlie_photo',
          lastMessage: 'Amazing shot! Where did you take it?',
          lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          unreadCount: 1
        },
        {
          userId: 5,
          username: 'diana_travel',
          lastMessage: 'Just arrived in Tokyo! 🗾',
          lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          unreadCount: 0
        }
      ];
      setConversations(mockConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (otherUserId: number) => {
    try {
      const conversationMessages = await trpc.getConversation.query({
        user_id: userId,
        other_user_id: otherUserId,
        limit: 50,
        offset: 0
      });
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Demo messages
      const demoMessages: DirectMessage[] = [
        {
          id: 1,
          sender_id: otherUserId,
          receiver_id: userId,
          content: "Hey! How's it going? 😊",
          is_read: true,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: 2,
          sender_id: userId,
          receiver_id: otherUserId,
          content: "Hi there! Going great, thanks for asking! How about you?",
          is_read: true,
          created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
        },
        {
          id: 3,
          sender_id: otherUserId,
          receiver_id: userId,
          content: "I'm doing well! Just saw your latest post - amazing photos! 📸",
          is_read: true,
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
          id: 4,
          sender_id: userId,
          receiver_id: otherUserId,
          content: "Thank you so much! That means a lot 💙",
          is_read: true,
          created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000)
        },
        {
          id: 5,
          sender_id: otherUserId,
          receiver_id: userId,
          content: "We should hang out soon! Maybe grab coffee? ☕️",
          is_read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      ];
      setMessages(demoMessages);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    const messageData: SendDirectMessageInput = {
      sender_id: userId,
      receiver_id: selectedConversation,
      content: newMessage.trim()
    };

    try {
      await trpc.sendDirectMessage.mutate(messageData);
      
      // Add message to local state
      const newMsg: DirectMessage = {
        id: Date.now(),
        sender_id: userId,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
        is_read: false,
        created_at: new Date()
      };
      
      setMessages((prev: DirectMessage[]) => [...prev, newMsg]);
      setNewMessage('');

      // Update conversation last message
      setConversations((prev: Conversation[]) => 
        prev.map((conv: Conversation) => 
          conv.userId === selectedConversation 
            ? { 
                ...conv, 
                lastMessage: newMessage.trim(),
                lastMessageTime: new Date()
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Demo mode: still add message to UI
      const newMsg: DirectMessage = {
        id: Date.now(),
        sender_id: userId,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
        is_read: false,
        created_at: new Date()
      };
      
      setMessages((prev: DirectMessage[]) => [...prev, newMsg]);
      setNewMessage('');

      setConversations((prev: Conversation[]) => 
        prev.map((conv: Conversation) => 
          conv.userId === selectedConversation 
            ? { 
                ...conv, 
                lastMessage: newMessage.trim(),
                lastMessageTime: new Date()
              }
            : conv
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading conversations... 💬</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                💬 Direct Messages
              </CardTitle>
              <CardDescription>
                Connect privately with other users
              </CardDescription>
            </div>
            <Badge variant="secondary">🚧 Demo Mode</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 h-96">
            {/* Conversations List */}
            <div className="border-r border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                📋 Conversations
              </h3>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {conversations.map((conversation: Conversation) => (
                    <div
                      key={conversation.userId}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === conversation.userId
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedConversation(conversation.userId)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/avatars/svg?seed=${conversation.username}`}
                          alt={conversation.username}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              @{conversation.username}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {conversation.lastMessageTime && formatTime(conversation.lastMessageTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/avatars/svg?seed=${
                          conversations.find(c => c.userId === selectedConversation)?.username
                        }`}
                        alt="User"
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-semibold">
                          @{conversations.find(c => c.userId === selectedConversation)?.username}
                        </p>
                        <p className="text-sm text-green-500">● Online</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message: DirectMessage) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === userId ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              message.sender_id === userId
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_id === userId
                                  ? 'text-purple-100'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                              {message.sender_id === userId && (
                                <span className="ml-1">
                                  {message.is_read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Type a message... 💭"
                        value={newMessage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setNewMessage(e.target.value)
                        }
                        disabled={isSending}
                        className="flex-1"
                        maxLength={1000}
                      />
                      <Button 
                        type="submit" 
                        disabled={isSending || !newMessage.trim()}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          '📤'
                        )}
                      </Button>
                    </form>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      {newMessage.length}/1000
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose someone to start chatting with
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Demo Direct Messages
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                This messaging system demonstrates real-time chat functionality with persistent conversations. 
                In the demo, you can send messages to mock users. All messages are simulated and conversations 
                include sample users for testing the interface.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">🔄 Real-time simulation</Badge>
                <Badge variant="outline" className="text-xs">👥 Mock conversations</Badge>
                <Badge variant="outline" className="text-xs">📱 Responsive design</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}