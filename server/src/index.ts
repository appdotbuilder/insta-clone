import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schema types
import { 
  createUserInputSchema,
  updateUserInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  getUserPostsInputSchema,
  getFeedInputSchema,
  createStoryInputSchema,
  getUserStoriesInputSchema,
  createLikeInputSchema,
  removeLikeInputSchema,
  createCommentInputSchema,
  updateCommentInputSchema,
  getPostCommentsInputSchema,
  followUserInputSchema,
  unfollowUserInputSchema,
  sendDirectMessageInputSchema,
  markMessageAsReadInputSchema,
  getConversationInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { updateUser } from './handlers/update_user';
import { getUserById } from './handlers/get_user_by_id';
import { createPost } from './handlers/create_post';
import { updatePost } from './handlers/update_post';
import { getUserPosts } from './handlers/get_user_posts';
import { getFeed } from './handlers/get_feed';
import { createStory } from './handlers/create_story';
import { getUserStories } from './handlers/get_user_stories';
import { likePost } from './handlers/like_post';
import { unlikePost } from './handlers/unlike_post';
import { createComment } from './handlers/create_comment';
import { updateComment } from './handlers/update_comment';
import { getPostComments } from './handlers/get_post_comments';
import { followUser } from './handlers/follow_user';
import { unfollowUser } from './handlers/unfollow_user';
import { sendDirectMessage } from './handlers/send_direct_message';
import { markMessageAsRead } from './handlers/mark_message_as_read';
import { getConversation } from './handlers/get_conversation';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),

  // Post management routes
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),

  updatePost: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => updatePost(input)),

  getUserPosts: publicProcedure
    .input(getUserPostsInputSchema)
    .query(({ input }) => getUserPosts(input)),

  getFeed: publicProcedure
    .input(getFeedInputSchema)
    .query(({ input }) => getFeed(input)),

  // Story management routes
  createStory: publicProcedure
    .input(createStoryInputSchema)
    .mutation(({ input }) => createStory(input)),

  getUserStories: publicProcedure
    .input(getUserStoriesInputSchema)
    .query(({ input }) => getUserStories(input)),

  // Like management routes
  likePost: publicProcedure
    .input(createLikeInputSchema)
    .mutation(({ input }) => likePost(input)),

  unlikePost: publicProcedure
    .input(removeLikeInputSchema)
    .mutation(({ input }) => unlikePost(input)),

  // Comment management routes
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),

  updateComment: publicProcedure
    .input(updateCommentInputSchema)
    .mutation(({ input }) => updateComment(input)),

  getPostComments: publicProcedure
    .input(getPostCommentsInputSchema)
    .query(({ input }) => getPostComments(input)),

  // Follow management routes
  followUser: publicProcedure
    .input(followUserInputSchema)
    .mutation(({ input }) => followUser(input)),

  unfollowUser: publicProcedure
    .input(unfollowUserInputSchema)
    .mutation(({ input }) => unfollowUser(input)),

  // Direct message routes
  sendDirectMessage: publicProcedure
    .input(sendDirectMessageInputSchema)
    .mutation(({ input }) => sendDirectMessage(input)),

  markMessageAsRead: publicProcedure
    .input(markMessageAsReadInputSchema)
    .mutation(({ input }) => markMessageAsRead(input)),

  getConversation: publicProcedure
    .input(getConversationInputSchema)
    .query(({ input }) => getConversation(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();