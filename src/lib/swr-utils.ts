/**
 * Shared SWR utilities for consistent data fetching across the app
 */

/**
 * Standard fetcher function for SWR
 * Throws an error with status code and data attached for error handling
 */
export const fetcher = async <T = any>(url: string): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.message || "Failed to fetch data");
    (error as any).status = response.status;
    (error as any).data = data;
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
export function getErrorMessage(error: any): string {
  if (!error) return "";

  // Handle status-specific errors
  if (error.status === 404) {
    return error.data?.error || "Resource not found";
  }
  if (error.status === 401) {
    return "Unauthorized. Please sign in.";
  }
  if (error.status === 403) {
    return "Access denied.";
  }
  if (error.status === 410) {
    return "Resource has expired.";
  }
  if (error.status === 429) {
    return "Too many requests. Please try again later.";
  }

  // Default to error message or data
  return error.data?.error || error.message || "An error occurred";
}
