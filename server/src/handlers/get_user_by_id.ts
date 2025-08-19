import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getUserById(userId: number): Promise<User | null> {
  try {
    // Query user by ID
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Return null if user not found
    if (results.length === 0) {
      return null;
    }

    // Return the user data
    return results[0];
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}