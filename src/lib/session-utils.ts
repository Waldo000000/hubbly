import { prisma } from "./db";

/**
 * Generates a random 6-digit alphanumeric code (uppercase letters and numbers only)
 */
function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Generates a unique session code that doesn't already exist in the database
 * Retries up to 10 times if collisions occur
 */
export async function generateUniqueSessionCode(db = prisma): Promise<string> {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    const code = generateSessionCode();

    // Check if code already exists
    const existingSession = await db.qaSession.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existingSession) {
      return code;
    }

    retries++;
  }

  throw new Error(
    "Failed to generate unique session code after maximum retries",
  );
}

/**
 * Calculates session expiration date (24 hours from now by default)
 */
export function getSessionExpirationDate(hours: number = 24): Date {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return expiresAt;
}

/**
 * Validates session input data
 */
export function validateSessionInput(input: {
  title: string;
  description?: string;
}): { isValid: boolean; errors: { title?: string; description?: string } } {
  const errors: { title?: string; description?: string } = {};

  // Title validation
  if (!input.title || input.title.trim().length === 0) {
    errors.title = "Title is required";
  } else if (input.title.length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (input.title.length > 100) {
    errors.title = "Title must be no more than 100 characters long";
  }

  // Description validation
  if (input.description && input.description.length > 500) {
    errors.description = "Description must be no more than 500 characters long";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
