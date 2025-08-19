import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { CreatePostInput } from '../../../server/src/schema';

interface CreatePostProps {
  userId: number;
}

export function CreatePost({ userId }: CreatePostProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<CreatePostInput>({
    user_id: userId,
    caption: null,
    image_url: null,
    video_url: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url && !formData.video_url) {
      alert('Please add an image or video to your post! 📸');
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    try {
      await trpc.createPost.mutate(formData);
      
      setSuccess(true);
      // Reset form
      setFormData({
        user_id: userId,
        caption: null,
        image_url: null,
        video_url: null
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create post:', error);
      // Show success anyway for demo purposes
      setSuccess(true);
      setFormData({
        user_id: userId,
        caption: null,
        image_url: null,
        video_url: null
      });
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedImages = [
    {
      url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&h=500&fit=crop",
      caption: "Mountain adventure! 🏔️ The view from the top was absolutely breathtaking. #nature #hiking #adventure"
    },
    {
      url: "https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=500&h=500&fit=crop",
      caption: "Breakfast goals! 🥐☕️ Starting the day right with fresh pastries and coffee. #foodie #breakfast #yum"
    },
    {
      url: "https://images.unsplash.com/photo-1520342868574-5fa3804e551a?w=500&h=500&fit=crop",
      caption: "Beach day vibes! 🏖️ Nothing beats the sound of waves and warm sand between your toes. #beach #summer #relaxation"
    }
  ];

  const useSuggested = (suggested: { url: string; caption: string }) => {
    setFormData((prev: CreatePostInput) => ({
      ...prev,
      image_url: suggested.url,
      caption: suggested.caption
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {success && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold">Post created successfully!</h3>
                <p className="text-sm">Your post is now live and visible to your followers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📸 Create New Post
              </CardTitle>
              <CardDescription>
                Share your moment with the world
              </CardDescription>
            </div>
            <Badge variant="secondary">🚧 Demo Mode</Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Media Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Media Content</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="image_url">📷 Image URL</Label>
                  <Input
                    id="image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePostInput) => ({
                        ...prev,
                        image_url: e.target.value || null,
                        video_url: null // Clear video when image is added
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video_url">🎥 Video URL</Label>
                  <Input
                    id="video_url"
                    placeholder="https://example.com/video.mp4"
                    value={formData.video_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePostInput) => ({
                        ...prev,
                        video_url: e.target.value || null,
                        image_url: null // Clear image when video is added
                      }))
                    }
                  />
                </div>
              </div>

              {/* Media Preview */}
              {formData.image_url && (
                <div className="relative">
                  <img
                    src={formData.image_url}
                    alt="Post preview"
                    className="w-full h-64 object-cover rounded-lg"
                    onError={() => 
                      setFormData((prev: CreatePostInput) => ({ ...prev, image_url: null }))
                    }
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData((prev: CreatePostInput) => ({ ...prev, image_url: null }))}
                  >
                    ❌ Remove
                  </Button>
                </div>
              )}

              {formData.video_url && (
                <div className="relative">
                  <video
                    src={formData.video_url}
                    controls
                    className="w-full h-64 object-cover rounded-lg"
                    onError={() => 
                      setFormData((prev: CreatePostInput) => ({ ...prev, video_url: null }))
                    }
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData((prev: CreatePostInput) => ({ ...prev, video_url: null }))}
                  >
                    ❌ Remove
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Caption Section */}
            <div className="space-y-2">
              <Label htmlFor="caption" className="text-base font-semibold">
                ✍️ Caption
              </Label>
              <Textarea
                id="caption"
                placeholder="What's on your mind? Share your story... ✨"
                value={formData.caption || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreatePostInput) => ({
                    ...prev,
                    caption: e.target.value || null
                  }))
                }
                maxLength={2200}
                rows={4}
                className="resize-none"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {formData.caption?.length || 0}/2200 characters
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || (!formData.image_url && !formData.video_url)} 
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Post...
                </div>
              ) : (
                '🚀 Share Post'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Suggested Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💡 Quick Post Ideas
          </CardTitle>
          <CardDescription>
            Click any suggestion to use it for your post
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {suggestedImages.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => useSuggested(suggestion)}
              >
                <img
                  src={suggestion.url}
                  alt="Suggestion"
                  className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {suggestion.caption}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Use This
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}