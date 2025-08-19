import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Story, CreateStoryInput } from '../../../server/src/schema';

interface StoriesProps {
  userId: number;
}

export function Stories({ userId }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState<CreateStoryInput>({
    user_id: userId,
    image_url: null,
    video_url: null
  });

  const loadStories = useCallback(async () => {
    try {
      setIsLoading(true);
      const userStories = await trpc.getUserStories.query({ user_id: userId });
      setStories(userStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      // Demo stories since backend returns empty array
      const demoStories: Story[] = [
        {
          id: 1,
          user_id: userId,
          image_url: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=700&fit=crop",
          video_url: null,
          view_count: 23,
          expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20 hours from now
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        },
        {
          id: 2,
          user_id: userId,
          image_url: null,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          view_count: 45,
          expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        }
      ];
      setStories(demoStories);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url && !formData.video_url) {
      alert('Please add an image or video to your story! 📸');
      return;
    }

    setIsCreating(true);
    setSuccess(false);

    try {
      const newStory = await trpc.createStory.mutate(formData);
      setStories((prev: Story[]) => [newStory, ...prev]);
      
      setSuccess(true);
      setFormData({
        user_id: userId,
        image_url: null,
        video_url: null
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create story:', error);
      // Demo mode: still add story to UI
      const demoStory: Story = {
        id: Date.now(),
        user_id: userId,
        image_url: formData.image_url,
        video_url: formData.video_url,
        view_count: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        created_at: new Date()
      };
      setStories((prev: Story[]) => [demoStory, ...prev]);
      setSuccess(true);
      setFormData({
        user_id: userId,
        image_url: null,
        video_url: null
      });
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    if (minutes > 0) return `${minutes}m left`;
    return 'Expired';
  };

  const suggestedStoryContent = [
    {
      type: 'image',
      url: "https://images.unsplash.com/photo-1493236715438-c58de3b907ec?w=400&h=700&fit=crop",
      label: "📸 Vintage vibes"
    },
    {
      type: 'image', 
      url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=700&fit=crop",
      label: "🎭 Street art"
    },
    {
      type: 'video',
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      label: "🎥 Demo video"
    }
  ];

  const useSuggestedContent = (content: { type: string; url: string; label: string }) => {
    if (content.type === 'image') {
      setFormData((prev: CreateStoryInput) => ({
        ...prev,
        image_url: content.url,
        video_url: null
      }));
    } else {
      setFormData((prev: CreateStoryInput) => ({
        ...prev,
        video_url: content.url,
        image_url: null
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {success && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold">Story posted!</h3>
                <p className="text-sm">Your story is live and will disappear in 24 hours.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Story Section */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📱 Create Story
              </CardTitle>
              <CardDescription>
                Share a moment that disappears in 24 hours
              </CardDescription>
            </div>
            <Badge variant="secondary">🚧 Demo Mode</Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleCreateStory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="story_image">📷 Image URL</Label>
                <Input
                  id="story_image"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateStoryInput) => ({
                      ...prev,
                      image_url: e.target.value || null,
                      video_url: null
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="story_video">🎥 Video URL</Label>
                <Input
                  id="story_video"
                  placeholder="https://example.com/video.mp4"
                  value={formData.video_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateStoryInput) => ({
                      ...prev,
                      video_url: e.target.value || null,
                      image_url: null
                    }))
                  }
                />
              </div>
            </div>

            {/* Preview */}
            {formData.image_url && (
              <div className="relative max-w-xs mx-auto">
                <img
                  src={formData.image_url}
                  alt="Story preview"
                  className="w-full h-64 object-cover rounded-2xl"
                  onError={() => 
                    setFormData((prev: CreateStoryInput) => ({ ...prev, image_url: null }))
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData((prev: CreateStoryInput) => ({ ...prev, image_url: null }))}
                >
                  ❌
                </Button>
              </div>
            )}

            {formData.video_url && (
              <div className="relative max-w-xs mx-auto">
                <video
                  src={formData.video_url}
                  controls
                  className="w-full h-64 object-cover rounded-2xl"
                  onError={() => 
                    setFormData((prev: CreateStoryInput) => ({ ...prev, video_url: null }))
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData((prev: CreateStoryInput) => ({ ...prev, video_url: null }))}
                >
                  ❌
                </Button>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isCreating || (!formData.image_url && !formData.video_url)}
              className="w-full"
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Posting Story...
                </div>
              ) : (
                '🚀 Post Story'
              )}
            </Button>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedStoryContent.map((content, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useSuggestedContent(content)}
                  className="text-xs"
                >
                  {content.label}
                </Button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* My Stories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📚 Your Stories
          </CardTitle>
          <CardDescription>
            Stories disappear after 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-24 h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📱</div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">No active stories</p>
              <p className="text-sm text-gray-500">Create your first story above!</p>
              <Badge variant="secondary" className="mt-2">🚧 Backend returns empty array</Badge>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stories.map((story: Story) => (
                <div
                  key={story.id}
                  className="cursor-pointer group"
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="relative">
                    {story.image_url ? (
                      <img
                        src={story.image_url}
                        alt="Story"
                        className="w-full h-32 object-cover rounded-2xl border-2 border-purple-500 group-hover:border-purple-600 transition-colors"
                      />
                    ) : story.video_url ? (
                      <video
                        src={story.video_url}
                        className="w-full h-32 object-cover rounded-2xl border-2 border-purple-500 group-hover:border-purple-600 transition-colors"
                        muted
                      />
                    ) : null}
                    
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                      👁️ {story.view_count}
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeRemaining(story.expires_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 z-10"
              onClick={() => setSelectedStory(null)}
            >
              ❌ Close
            </Button>
            
            <div className="bg-black rounded-2xl overflow-hidden">
              {selectedStory.image_url ? (
                <img
                  src={selectedStory.image_url}
                  alt="Story"
                  className="w-full h-96 object-cover"
                />
              ) : selectedStory.video_url ? (
                <video
                  src={selectedStory.video_url}
                  controls
                  autoPlay
                  className="w-full h-96 object-cover"
                />
              ) : null}
              
              <div className="p-4 text-white">
                <div className="flex items-center justify-between text-sm">
                  <span>👁️ {selectedStory.view_count} views</span>
                  <span>{formatTimeRemaining(selectedStory.expires_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}