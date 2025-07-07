import DashboardLayout from '@/components/admin/dashboard-layout';
import Breadcrumbs from '@/components/admin/breadcrumbs';

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <DashboardLayout>
      <header className="h-16 flex-shrink-0 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a]">
        <Breadcrumbs />
      </header>
      <main className="flex-1 p-8 bg-[#313131] overflow-y-auto">
        {children}
      </main>
    </DashboardLayout>
  );
}
