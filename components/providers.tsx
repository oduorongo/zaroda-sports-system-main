"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "#161B22",
              border: "1px solid #30363D",
              color: "#E6EDF3",
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
