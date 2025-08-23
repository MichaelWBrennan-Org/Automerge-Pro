import { PrismaClient } from '@prisma/client';

/**
 * Deletes a user and all of their associated data.
 * This is a destructive operation and cannot be undone.
 *
 * @param prisma - The Prisma client instance.
 * @param userId - The ID of the user to delete.
 */
export async function deleteUser(prisma: PrismaClient, userId: string): Promise<void> {
  try {
    // Prisma transaction ensures that all operations succeed or none do.
    await prisma.$transaction(async (tx) => {
      // 1. Delete all pull requests authored by the user.
      // This is necessary because the relation is not set to cascade on delete.
      await tx.pullRequest.deleteMany({
        where: {
          authorId: userId,
        },
      });

      // 2. Delete the user record.
      // Thanks to `onDelete: Cascade` in the schema, this will also delete:
      // - OrganizationUser records (their membership in organizations)
      await tx.user.delete({
        where: {
          id: userId,
        },
      });
    });

    console.log(`Successfully deleted user ${userId} and their associated data.`);
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
    throw new Error('Failed to delete user data.');
  }
}
