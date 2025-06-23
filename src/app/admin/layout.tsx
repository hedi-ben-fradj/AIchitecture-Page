import type { ReactNode } from 'react';

// This layout is intentionally minimal to delegate rendering to the (dashboard) route group layout, resolving a route conflict.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
