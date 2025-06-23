import { ViewsProvider } from '@/contexts/views-context';
import Breadcrumbs from '@/components/admin/breadcrumbs';
import ProjectSidebar from '@/components/admin/project-sidebar';

export default function ProjectDetailLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <ViewsProvider projectId={projectId}>
      <div className="flex flex-1">
        <ProjectSidebar projectId={projectId} />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex-shrink-0 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a]">
            <Breadcrumbs />
          </header>
          <main className="flex-1 p-8 bg-[#313131] overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ViewsProvider>
  );
}
