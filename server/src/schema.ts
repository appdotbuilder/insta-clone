import { z } from 'zod';

// User profile schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  is_verified: z.boolean(),
  follower_count: z.number().int(),
  following_count: z.number().int(),
  posts_count: z.number().int(),
  is_private: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating user profiles
export const createUserInputSchema = z.object({
  username: z.string().min(1).max(30),
  email: z.string().email(),
  full_name: z.string().nullable(),
  bio: z.string().max(150).nullable(),
  profile_image_url: z.string().url().nullable(),
  is_private: z.boolean().default(false)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating user profiles
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(1).max(30).optional(),
  full_name: z.string().nullable().optional(),
  bio: z.string().max(150).nullable().optional(),
  profile_image_url: z.string().url().nullable().optional(),
  is_private: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  caption: z.string().nullable(),
  image_url: z.string().nullable(),
  video_url: z.string().nullable(),
  like_count: z.number().int(),
  comment_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Input schema for creating posts
export const createPostInputSchema = z.object({
  user_id: z.number(),
  caption: z.string().max(2200).nullable(),
  image_url: z.string().url().nullable(),
  video_url: z.string().url().nullable()
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Input schema for updating posts
export const updatePostInputSchema = z.object({
  id: z.number(),
  caption: z.string().max(2200).nullable().optional()
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Story schema
export const storySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  image_url: z.string().nullable(),
  video_url: z.string().nullable(),
  view_count: z.number().int(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Story = z.infer<typeof storySchema>;

// Input schema for creating stories
export const createStoryInputSchema = z.object({
  user_id: z.number(),
  image_url: z.string().url().nullable(),
  video_url: z.string().url().nullable()
});

export type CreateStoryInput = z.infer<typeof createStoryInputSchema>;

// Like schema
export const likeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  created_at: z.coerce.date()
});

export type Like = z.infer<typeof likeSchema>;

// Input schema for creating likes
export const createLikeInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number()
});

export type CreateLikeInput = z.infer<typeof createLikeInputSchema>;

// Input schema for removing likes
export const removeLikeInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number()
});

export type RemoveLikeInput = z.infer<typeof removeLikeInputSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  content: z.string(),
  like_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

// Input schema for creating comments
export const createCommentInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number(),
  content: z.string().min(1).max(2200)
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Input schema for updating comments
export const updateCommentInputSchema = z.object({
  id: z.number(),
  content: z.string().min(1).max(2200)
});

export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

// Follow schema
export const followSchema = z.object({
  id: z.number(),
  follower_id: z.number(),
  following_id: z.number(),
  created_at: z.coerce.date()
});

export type Follow = z.infer<typeof followSchema>;

// Input schema for following users
export const followUserInputSchema = z.object({
  follower_id: z.number(),
  following_id: z.number()
});

export type FollowUserInput = z.infer<typeof followUserInputSchema>;

// Input schema for unfollowing users
export const unfollowUserInputSchema = z.object({
  follower_id: z.number(),
  following_id: z.number()
});

export type UnfollowUserInput = z.infer<typeof unfollowUserInputSchema>;

// Direct message schema
export const directMessageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  receiver_id: z.number(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type DirectMessage = z.infer<typeof directMessageSchema>;

// Input schema for sending direct messages
export const sendDirectMessageInputSchema = z.object({
  sender_id: z.number(),
  receiver_id: z.number(),
  content: z.string().min(1).max(1000)
});

export type SendDirectMessageInput = z.infer<typeof sendDirectMessageInputSchema>;

// Input schema for marking messages as read
export const markMessageAsReadInputSchema = z.object({
  message_id: z.number(),
  user_id: z.number()
});

export type MarkMessageAsReadInput = z.infer<typeof markMessageAsReadInputSchema>;

// Feed input schema
export const getFeedInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type GetFeedInput = z.infer<typeof getFeedInputSchema>;

// User posts input schema
export const getUserPostsInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().default(12),
  offset: z.number().int().nonnegative().default(0)
});

export type GetUserPostsInput = z.infer<typeof getUserPostsInputSchema>;

// Post comments input schema
export const getPostCommentsInputSchema = z.object({
  post_id: z.number(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type GetPostCommentsInput = z.infer<typeof getPostCommentsInputSchema>;

// User stories input schema
export const getUserStoriesInputSchema = z.object({
  user_id: z.number()
});

export type GetUserStoriesInput = z.infer<typeof getUserStoriesInputSchema>;

// Conversation input schema
export const getConversationInputSchema = z.object({
  user_id: z.number(),
  other_user_id: z.number(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetConversationInput = z.infer<typeof getConversationInputSchema>;