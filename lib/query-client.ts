import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Check if we're in Expo Go on a physical device (local development)
  // In this case, we need to use the local network IP address
  const isExpoGo = typeof navigator !== 'undefined' && 
                   navigator.product === 'ReactNative';
  
  // For local development, use your computer's local IP
  // This allows physical devices on the same network to connect
  if (isExpoGo && !process.env.EXPO_PUBLIC_DOMAIN) {
    // TODO: Update this IP address to match your computer's local IP
    // Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find it
    const localIP = "172.20.10.9"; // Current detected IP
    return `http://${localIP}:5000`;
  }
  
  // For production/Replit deployment
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    // Fallback for development if no env var is set
    console.warn("EXPO_PUBLIC_DOMAIN not set, using localhost");
    return "http://localhost:5000";
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
