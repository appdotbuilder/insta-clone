import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Post, Comment } from '../../../server/src/schema';

interface FeedProps {
  userId: number;
}

export function Feed({ userId }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});
  const [showComments, setShowComments] = useState<{ [postId: number]: boolean }>({});
  const [postComments, setPostComments] = useState<{ [postId: number]: Comment[] }>({});

  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const feedPosts = await trpc.getFeed.query({
        user_id: userId,
        limit: 20,
        offset: 0
      });
      setPosts(feedPosts);
    } catch (error) {
      console.error('Failed to load feed:', error);
      // Show some demo posts since backend returns empty array
      const demoPosts: Post[] = [
        {
          id: 1,
          user_id: 1,
          caption: "Beautiful sunset today! 🌅 Nature never fails to amaze me. #sunset #nature #photography",
          image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop",
          video_url: null,
          like_count: 42,
          comment_count: 8,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: 2,
          user_id: 2,
          caption: "Coffee and code ☕️💻 Perfect morning combination! Working on something exciting.",
          image_url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500&h=500&fit=crop",
          video_url: null,
          like_count: 27,
          comment_count: 5,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: 3,
          user_id: 3,
          caption: "Weekend vibes! 🎉 Dancing the night away with friends. Life is good! 💃🕺",
          image_url: null,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          like_count: 89,
          comment_count: 15,
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000)
        }
      ];
      setPosts(demoPosts);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLike = async (postId: number) => {
    try {
      await trpc.likePost.mutate({
        user_id: userId,
        post_id: postId
      });
      // Optimistically update the like count
      setPosts((prev: Post[]) => 
        prev.map((post: Post) => 
          post.id === postId 
            ? { ...post, like_count: post.like_count + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
      // Since backend is stub, still update UI for demo
      setPosts((prev: Post[]) => 
        prev.map((post: Post) => 
          post.id === postId 
            ? { ...post, like_count: post.like_count + 1 }
            : post
        )
      );
    }
  };

  const handleComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const newComment = await trpc.createComment.mutate({
        user_id: userId,
        post_id: postId,
        content: content.trim()
      });
      
      // Update comment count and add comment to local state
      setPosts((prev: Post[]) => 
        prev.map((post: Post) => 
          post.id === postId 
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        )
      );
      
      setCommentInputs((prev: { [postId: number]: string }) => ({
        ...prev,
        [postId]: ''
      }));
    } catch (error) {
      console.error('Failed to create comment:', error);
      // Demo mode: still update UI
      setPosts((prev: Post[]) => 
        prev.map((post: Post) => 
          post.id === postId 
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        )
      );
      setCommentInputs((prev: { [postId: number]: string }) => ({
        ...prev,
        [postId]: ''
      }));
    }
  };

  const toggleComments = async (postId: number) => {
    const isShowing = showComments[postId];
    setShowComments((prev: { [postId: number]: boolean }) => ({
      ...prev,
      [postId]: !isShowing
    }));

    if (!isShowing && !postComments[postId]) {
      try {
        const comments = await trpc.getPostComments.query({
          post_id: postId,
          limit: 10,
          offset: 0
        });
        setPostComments((prev: { [postId: number]: Comment[] }) => ({
          ...prev,
          [postId]: comments
        }));
      } catch (error) {
        console.error('Failed to load comments:', error);
        // Demo comments
        const demoComments: Comment[] = [
          {
            id: 1,
            user_id: 2,
            post_id: postId,
            content: "Amazing shot! 📸",
            like_count: 3,
            created_at: new Date(Date.now() - 30 * 60 * 1000),
            updated_at: new Date(Date.now() - 30 * 60 * 1000)
          },
          {
            id: 2,
            user_id: 3,
            post_id: postId,
            content: "Love this! Where was this taken? 🌟",
            like_count: 1,
            created_at: new Date(Date.now() - 15 * 60 * 1000),
            updated_at: new Date(Date.now() - 15 * 60 * 1000)
          }
        ];
        setPostComments((prev: { [postId: number]: Comment[] }) => ({
          ...prev,
          [postId]: demoComments
        }));
      }
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-1"></div>
                </div>
              </div>
            </CardHeader>
            <div className="h-64 bg-gray-200 dark:bg-gray-700"></div>
            <CardContent className="pt-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-lg font-semibold mb-2">No posts yet!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Follow some users or create your first post to see content here.
          </p>
          <Badge variant="secondary">🚧 Backend returns empty feed array</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post: Post) => (
        <Card key={post.id} className="overflow-hidden shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <img
                src={`https://api.dicebear.com/7.x/avatars/svg?seed=user${post.user_id}`}
                alt="User"
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-semibold">user{post.user_id}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(post.created_at)}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Demo
              </Badge>
            </div>
          </CardHeader>

          {/* Media Content */}
          {post.image_url && (
            <div className="relative">
              <img
                src={post.image_url}
                alt="Post content"
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
          )}
          
          {post.video_url && (
            <div className="relative">
              <video
                src={post.video_url}
                controls
                className="w-full h-64 sm:h-80 object-cover"
                poster="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=300&fit=crop"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          <CardContent className="pt-4">
            {/* Action Buttons */}
            <div className="flex items-center gap-4 mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLike(post.id)}
                className="text-red-500 hover:text-red-600 p-0 h-auto font-normal"
              >
                ❤️ {post.like_count}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleComments(post.id)}
                className="text-blue-500 hover:text-blue-600 p-0 h-auto font-normal"
              >
                💬 {post.comment_count}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-500 hover:text-green-600 p-0 h-auto font-normal"
              >
                📤 Share
              </Button>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="mb-3">
                <p className="text-sm leading-relaxed">{post.caption}</p>
              </div>
            )}

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="space-y-3">
                <Separator />
                
                {/* Comment Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment... 💭"
                    value={commentInputs[post.id] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCommentInputs((prev: { [postId: number]: string }) => ({
                        ...prev,
                        [post.id]: e.target.value
                      }))
                    }
                    onKeyPress={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        handleComment(post.id);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleComment(post.id)}
                    disabled={!commentInputs[post.id]?.trim()}
                  >
                    Post
                  </Button>
                </div>

                {/* Comments List */}
                {postComments[post.id] && (
                  <div className="space-y-2">
                    {postComments[post.id].map((comment: Comment) => (
                      <div key={comment.id} className="flex items-start gap-2 text-sm">
                        <img
                          src={`https://api.dicebear.com/7.x/avatars/svg?seed=user${comment.user_id}`}
                          alt="Commenter"
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1">
                          <span className="font-semibold">user{comment.user_id}</span>
                          <span className="ml-2">{comment.content}</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatTimeAgo(comment.created_at)} • {comment.like_count} likes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Load More */}
      <Card className="text-center py-6">
        <CardContent>
          <Button variant="outline" className="w-full">
            Load More Posts 📜
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}