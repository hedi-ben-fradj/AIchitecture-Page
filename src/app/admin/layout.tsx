
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import DashboardLayout from '@/components/admin/dashboard-layout';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
