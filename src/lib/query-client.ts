import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on failure (not on 4xx errors — handled by onError)
      retry: (failureCount, error) => {
        // Do not retry on auth/access errors
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status: number }).status < 500
        ) {
          return false;
        }
        return failureCount < 1;
      },
      // Data stays fresh for 30 seconds
      staleTime: 30_000,
      // Refetch when user returns to tab (useful for live monitoring)
      refetchOnWindowFocus: false,
      // Keep previous data visible while new data loads (prevents flash of empty)
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      // Mutations do not retry automatically
      retry: false,
    },
  },
});
