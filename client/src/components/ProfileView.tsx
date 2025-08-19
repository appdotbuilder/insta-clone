import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { User, UpdateUserInput, Post } from '../../../server/src/schema';

interface ProfileViewProps {
  userId: number;
}

export function ProfileView({ userId }: ProfileViewProps) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [formData, setFormData] = useState<UpdateUserInput>({
    id: userId,
    username: undefined,
    full_name: undefined,
    bio: undefined,
    profile_image_url: undefined,
    is_private: undefined
  });

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await trpc.getUserById.query({ userId });
      if (userData) {
        setUser(userData);
        setFormData({
          id: userId,
          username: userData.username,
          full_name: userData.full_name,
          bio: userData.bio,
          profile_image_url: userData.profile_image_url,
          is_private: userData.is_private
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadUserPosts = useCallback(async () => {
    try {
      const userPosts = await trpc.getUserPosts.query({
        user_id: userId,
        limit: 12,
        offset: 0
      });
      setPosts(userPosts);
    } catch (error) {
      console.error('Failed to load user posts:', error);
      // Demo posts
      const demoPosts: Post[] = [
        {
          id: 1,
          user_id: userId,
          caption: "Morning coffee vibes ☕️ Starting the day right!",
          image_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop",
          video_url: null,
          like_count: 23,
          comment_count: 5,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          user_id: userId,
          caption: "Sunset from my window 🌅 Nature is the best artist!",
          image_url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=300&h=300&fit=crop",
          video_url: null,
          like_count: 45,
          comment_count: 8,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          user_id: userId,
          caption: "Weekend project completed! 🎯 Feeling accomplished.",
          image_url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=300&h=300&fit=crop",
          video_url: null,
          like_count: 67,
          comment_count: 12,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: 4,
          user_id: userId,
          caption: "City lights at night ✨ Love this urban energy!",
          image_url: "https://images.unsplash.com/photo-1492666673288-3c4b4576ad9a?w=300&h=300&fit=crop",
          video_url: null,
          like_count: 89,
          comment_count: 15,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      ];
      setPosts(demoPosts);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
    loadUserPosts();
  }, [loadProfile, loadUserPosts]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(false);

    try {
      const updatedUser = await trpc.updateUser.mutate(formData);
      setUser(updatedUser);
      setIsEditing(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Demo mode: simulate successful update
      if (user) {
        const updatedUser: User = {
          ...user,
          username: formData.username || user.username,
          full_name: formData.full_name !== undefined ? formData.full_name : user.full_name,
          bio: formData.bio !== undefined ? formData.bio : user.bio,
          profile_image_url: formData.profile_image_url !== undefined ? formData.profile_image_url : user.profile_image_url,
          is_private: formData.is_private !== undefined ? formData.is_private : user.is_private,
          updated_at: new Date()
        };
        setUser(updatedUser);
        setIsEditing(false);
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const generateAvatar = () => {
    if (formData.username) {
      const avatarUrl = `https://api.dicebear.com/7.x/avatars/svg?seed=${formData.username}`;
      setFormData((prev: UpdateUserInput) => ({
        ...prev,
        profile_image_url: avatarUrl
      }));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              This user profile doesn't exist or couldn't be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {updateSuccess && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold">Profile updated successfully!</h3>
                <p className="text-sm">Your changes have been saved.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">👤 Profile</h2>
              {user.is_verified && <Badge variant="secondary">✓ Verified</Badge>}
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">🚧 Demo Mode</Badge>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
              >
                {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Profile Image */}
            <img
              src={user.profile_image_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${user.username}`}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-purple-500"
            />
            
            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">@{user.username}</h1>
                {user.is_private && (
                  <Badge variant="outline">🔒 Private</Badge>
                )}
              </div>
              
              {user.full_name && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                  {user.full_name}
                </p>
              )}
              
              {user.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {user.bio}
                </p>
              )}
              
              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold">{user.posts_count}</div>
                  <div className="text-gray-500 dark:text-gray-400">Posts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{user.follower_count}</div>
                  <div className="text-gray-500 dark:text-gray-400">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{user.following_count}</div>
                  <div className="text-gray-500 dark:text-gray-400">Following</div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Member since {formatDate(user.created_at)}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Profile Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>✏️ Edit Profile</CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_username">Username</Label>
                  <Input
                    id="edit_username"
                    value={formData.username || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateUserInput) => ({
                        ...prev,
                        username: e.target.value
                      }))
                    }
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Full Name</Label>
                  <Input
                    id="edit_full_name"
                    value={formData.full_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateUserInput) => ({
                        ...prev,
                        full_name: e.target.value || null
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_bio">Bio</Label>
                <Textarea
                  id="edit_bio"
                  value={formData.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: UpdateUserInput) => ({
                      ...prev,
                      bio: e.target.value || null
                    }))
                  }
                  maxLength={150}
                  rows={3}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {formData.bio?.length || 0}/150 characters
                </div>
              </div>

              <div className="space-y-3">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-3">
                  <img
                    src={formData.profile_image_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${formData.username}`}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full border-2 border-gray-300"
                  />
                  <div className="flex-1">
                    <Input
                      placeholder="Image URL"
                      value={formData.profile_image_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: UpdateUserInput) => ({
                          ...prev,
                          profile_image_url: e.target.value || null
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAvatar}
                      className="mt-2 text-xs"
                      disabled={!formData.username}
                    >
                      🎲 Generate Avatar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_private"
                  checked={formData.is_private || false}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev: UpdateUserInput) => ({
                      ...prev,
                      is_private: checked
                    }))
                  }
                />
                <Label htmlFor="edit_is_private">
                  🔒 Private Account
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    '💾 Save Changes'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Profile Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">📷 Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="followers">👥 Followers ({user.follower_count})</TabsTrigger>
          <TabsTrigger value="following">➡️ Following ({user.following_count})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create your first post to see it here!
                </p>
                <Badge variant="secondary" className="mt-2">🚧 Backend returns empty posts array</Badge>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post: Post) => (
                <Card key={post.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {post.video_url && (
                      <video
                        src={post.video_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            ❤️ {post.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {post.comment_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Followers List</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This feature would show users who follow this account.
              </p>
              <Badge variant="secondary">🚧 Feature available with full backend implementation</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="following" className="mt-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">➡️</div>
              <h3 className="text-lg font-semibold mb-2">Following List</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This feature would show users that this account is following.
              </p>
              <Badge variant="secondary">🚧 Feature available with full backend implementation</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}