import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProfileView } from '@/components/ProfileView';
import { CreatePost } from '@/components/CreatePost';
import { Feed } from '@/components/Feed';
import { Stories } from '@/components/Stories';
import { DirectMessages } from '@/components/DirectMessages';
import { CreateProfile } from '@/components/CreateProfile';
// Using type-only imports for better TypeScript compliance
import type { User } from '../../server/src/schema';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true);

  // Load current user (using user ID 1 as default for demo)
  const loadCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await trpc.getUserById.query({ userId: 1 });
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load current user:', error);
      // If no user exists, we'll show the create profile form
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleUserCreated = (user: User) => {
    setCurrentUser(user);
    setActiveTab('feed');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your social world... 📱✨</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              📸 SocialSnap
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Share moments, connect with friends</p>
          </div>
          <CreateProfile onUserCreated={handleUserCreated} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📸 SocialSnap
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                🚧 Demo Mode
              </Badge>
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.profile_image_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${currentUser.username}`}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  @{currentUser.username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              🏠 Feed
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex items-center gap-2">
              📱 Stories
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              ➕ Create
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              💬 Messages
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              👤 Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            <Feed userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="stories">
            <Stories userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="create">
            <CreatePost userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="messages">
            <DirectMessages userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileView userId={currentUser.id} />
          </TabsContent>
        </Tabs>

        {/* Stub Data Notice */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Demo Mode - Using Stub Data
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                  This application is running with placeholder backend implementations. All data operations 
                  (creating posts, following users, sending messages, etc.) are simulated and don't persist. 
                  The UI demonstrates the complete Instagram-like functionality with realistic interactions.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">🔄 Simulated API calls</Badge>
                  <Badge variant="outline" className="text-xs">📊 Mock data responses</Badge>
                  <Badge variant="outline" className="text-xs">🎭 Full UI demonstration</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;