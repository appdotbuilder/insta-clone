import { serial, text, pgTable, timestamp, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name'), // Nullable by default
  bio: text('bio'), // Nullable by default
  profile_image_url: text('profile_image_url'), // Nullable by default
  is_verified: boolean('is_verified').notNull().default(false),
  follower_count: integer('follower_count').notNull().default(0),
  following_count: integer('following_count').notNull().default(0),
  posts_count: integer('posts_count').notNull().default(0),
  is_private: boolean('is_private').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  usernameIdx: index('username_idx').on(table.username),
  emailIdx: index('email_idx').on(table.email)
}));

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  caption: text('caption'), // Nullable by default
  image_url: text('image_url'), // Nullable by default
  video_url: text('video_url'), // Nullable by default
  like_count: integer('like_count').notNull().default(0),
  comment_count: integer('comment_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('posts_user_id_idx').on(table.user_id),
  createdAtIdx: index('posts_created_at_idx').on(table.created_at)
}));

// Stories table
export const storiesTable = pgTable('stories', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  image_url: text('image_url'), // Nullable by default
  video_url: text('video_url'), // Nullable by default
  view_count: integer('view_count').notNull().default(0),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('stories_user_id_idx').on(table.user_id),
  expiresAtIdx: index('stories_expires_at_idx').on(table.expires_at)
}));

// Likes table
export const likesTable = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => postsTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueLike: unique('unique_user_post_like').on(table.user_id, table.post_id),
  userIdIdx: index('likes_user_id_idx').on(table.user_id),
  postIdIdx: index('likes_post_id_idx').on(table.post_id)
}));

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => postsTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  like_count: integer('like_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('comments_user_id_idx').on(table.user_id),
  postIdIdx: index('comments_post_id_idx').on(table.post_id),
  createdAtIdx: index('comments_created_at_idx').on(table.created_at)
}));

// Follows table
export const followsTable = pgTable('follows', {
  id: serial('id').primaryKey(),
  follower_id: integer('follower_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  following_id: integer('following_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueFollow: unique('unique_follow').on(table.follower_id, table.following_id),
  followerIdIdx: index('follows_follower_id_idx').on(table.follower_id),
  followingIdIdx: index('follows_following_id_idx').on(table.following_id)
}));

// Direct messages table
export const directMessagesTable = pgTable('direct_messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  receiver_id: integer('receiver_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  senderIdIdx: index('dm_sender_id_idx').on(table.sender_id),
  receiverIdIdx: index('dm_receiver_id_idx').on(table.receiver_id),
  createdAtIdx: index('dm_created_at_idx').on(table.created_at)
}));

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  stories: many(storiesTable),
  likes: many(likesTable),
  comments: many(commentsTable),
  following: many(followsTable, { relationName: 'follower' }),
  followers: many(followsTable, { relationName: 'following' }),
  sentMessages: many(directMessagesTable, { relationName: 'sender' }),
  receivedMessages: many(directMessagesTable, { relationName: 'receiver' })
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [postsTable.user_id],
    references: [usersTable.id]
  }),
  likes: many(likesTable),
  comments: many(commentsTable)
}));

export const storiesRelations = relations(storiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [storiesTable.user_id],
    references: [usersTable.id]
  })
}));

export const likesRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [likesTable.user_id],
    references: [usersTable.id]
  }),
  post: one(postsTable, {
    fields: [likesTable.post_id],
    references: [postsTable.id]
  })
}));

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [commentsTable.user_id],
    references: [usersTable.id]
  }),
  post: one(postsTable, {
    fields: [commentsTable.post_id],
    references: [postsTable.id]
  })
}));

export const followsRelations = relations(followsTable, ({ one }) => ({
  follower: one(usersTable, {
    fields: [followsTable.follower_id],
    references: [usersTable.id],
    relationName: 'follower'
  }),
  following: one(usersTable, {
    fields: [followsTable.following_id],
    references: [usersTable.id],
    relationName: 'following'
  })
}));

export const directMessagesRelations = relations(directMessagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [directMessagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender'
  }),
  receiver: one(usersTable, {
    fields: [directMessagesTable.receiver_id],
    references: [usersTable.id],
    relationName: 'receiver'
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
export type Story = typeof storiesTable.$inferSelect;
export type NewStory = typeof storiesTable.$inferInsert;
export type Like = typeof likesTable.$inferSelect;
export type NewLike = typeof likesTable.$inferInsert;
export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;
export type Follow = typeof followsTable.$inferSelect;
export type NewFollow = typeof followsTable.$inferInsert;
export type DirectMessage = typeof directMessagesTable.$inferSelect;
export type NewDirectMessage = typeof directMessagesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  posts: postsTable,
  stories: storiesTable,
  likes: likesTable,
  comments: commentsTable,
  follows: followsTable,
  directMessages: directMessagesTable
};