import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput } from '../../../server/src/schema';

interface CreateProfileProps {
  onUserCreated: (user: User) => void;
}

export function CreateProfile({ onUserCreated }: CreateProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    full_name: null,
    bio: null,
    profile_image_url: null,
    is_private: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newUser = await trpc.createUser.mutate(formData);
      onUserCreated(newUser);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAvatar = () => {
    if (formData.username) {
      const avatarUrl = `https://api.dicebear.com/7.x/avatars/svg?seed=${formData.username}`;
      setFormData((prev: CreateUserInput) => ({
        ...prev,
        profile_image_url: avatarUrl
      }));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            ✨ Welcome to SocialSnap
          </CardTitle>
          <CardDescription>
            Create your profile to start sharing moments
          </CardDescription>
          <Badge variant="secondary" className="w-fit mx-auto">
            🚧 Demo - Using stub backend
          </Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="@your_username"
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                }
                required
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="Your full name"
                value={formData.full_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({
                    ...prev,
                    full_name: e.target.value || null
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself... ✨"
                value={formData.bio || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateUserInput) => ({
                    ...prev,
                    bio: e.target.value || null
                  }))
                }
                maxLength={150}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  <img
                    src={formData.profile_image_url || `https://api.dicebear.com/7.x/avatars/svg?seed=default`}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Image URL (optional)"
                    value={formData.profile_image_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({
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
                id="is_private"
                checked={formData.is_private}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, is_private: checked }))
                }
              />
              <Label htmlFor="is_private" className="flex items-center gap-2">
                🔒 Private Account
                <span className="text-xs text-gray-500">
                  (Followers must be approved)
                </span>
              </Label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Profile...
                </div>
              ) : (
                '🚀 Create Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}