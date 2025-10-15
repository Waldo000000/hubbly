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
export async function generateUniqueSessionCode(): Promise<string> {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    const code = generateSessionCode();

    // Check if code already exists
    const existingSession = await prisma.qaSession.findUnique({
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
 * Calculates session expiration date (24 hours from now)
 */
export function getSessionExpirationDate(): Date {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  return expiresAt;
}

/**
 * Validates session input data
 */
export function validateSessionInput(
  title: string,
  description?: string,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Title validation
  if (!title || title.trim().length === 0) {
    errors.push("Title is required");
  } else if (title.length < 3) {
    errors.push("Title must be at least 3 characters long");
  } else if (title.length > 100) {
    errors.push("Title must be no more than 100 characters long");
  }

  // Description validation
  if (description && description.length > 500) {
    errors.push("Description must be no more than 500 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
