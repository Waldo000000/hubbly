/**
 * Participant Identity Management
 *
 * Each participant gets a randomly generated UUID stored in localStorage,
 * persistent per browser/device.
 *
 * - Same browser/device = same participant ID
 * - Different browser/device = different participant ID
 * - Incognito mode = new participant ID
 */

/**
 * Generate or retrieve participant ID for current session
 *
 * @param sessionCode - The Q&A session code (e.g., "AB12CD")
 * @returns UUID v4 string
 */
export function getOrCreateParticipantId(sessionCode: string): string {
  const storageKey = `participant_${sessionCode}`;

  // Try to get existing ID from localStorage
  let participantId = localStorage.getItem(storageKey);

  if (!participantId) {
    // Generate new UUID v4
    participantId = crypto.randomUUID();
    localStorage.setItem(storageKey, participantId);
  }

  return participantId;
}

/**
 * Clear participant ID for session
 * Useful when participant explicitly wants to "leave" or reset
 *
 * @param sessionCode - The Q&A session code
 */
export function clearParticipantId(sessionCode: string): void {
  const storageKey = `participant_${sessionCode}`;
  localStorage.removeItem(storageKey);
}

/**
 * Check if participant ID is valid UUID v4 format
 *
 * @param id - String to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function isValidParticipantId(id: string): boolean {
  // UUID v4 regex pattern
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get all participant IDs stored in localStorage
 * Useful for cleanup or debugging
 *
 * @returns Array of {sessionCode, participantId} objects
 */
export function getAllParticipantIds(): Array<{
  sessionCode: string;
  participantId: string;
}> {
  const result: Array<{ sessionCode: string; participantId: string }> = [];

  // Iterate through localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("participant_")) {
      const sessionCode = key.replace("participant_", "");
      const participantId = localStorage.getItem(key);
      if (participantId) {
        result.push({ sessionCode, participantId });
      }
    }
  }

  return result;
}

/**
 * Clear all participant IDs from localStorage
 * Useful for testing or complete reset
 */
export function clearAllParticipantIds(): void {
  const keys = getAllParticipantIds().map(
    ({ sessionCode }) => `participant_${sessionCode}`,
  );
  keys.forEach((key) => localStorage.removeItem(key));
}
