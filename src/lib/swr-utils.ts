/**
 * Shared SWR utilities for consistent data fetching across the app
 */

/**
 * Custom error type for SWR fetch errors
 */
interface FetchError extends Error {
  status: number;
  data: Record<string, unknown>;
}

/**
 * Standard fetcher function for SWR
 * Throws an error with status code and data attached for error handling
 */
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.message || "Failed to fetch data") as FetchError;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Default SWR configuration options
 * Can be spread into useSWR calls for consistency
 */
export const defaultSWRConfig = {
  revalidateOnFocus: true,
  dedupingInterval: 2000,
} as const;

/**
 * Helper to format error messages from SWR errors
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "";

  // Type guard for Error objects
  if (!(error instanceof Error)) {
    return "An error occurred";
  }

  const fetchError = error as Partial<FetchError>;

  // Handle status-specific errors
  if (fetchError.status === 404) {
    return fetchError.data?.error as string || "Resource not found";
  }
  if (fetchError.status === 401) {
    return "Unauthorized. Please sign in.";
  }
  if (fetchError.status === 403) {
    return "Access denied.";
  }
  if (fetchError.status === 410) {
    return "Resource has expired.";
  }
  if (fetchError.status === 429) {
    return "Too many requests. Please try again later.";
  }

  // Default to error message or data
  return (fetchError.data?.error as string) || error.message || "An error occurred";
}
