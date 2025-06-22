import ProjectSidebar from '@/components/admin/project-sidebar';
import { ViewsProvider } from '@/contexts/views-context';

export default function ProjectDetailLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <ViewsProvider projectId={projectId}>
      <div className="bg-[#313131] text-foreground min-h-screen flex">
        <ProjectSidebar projectId={projectId} />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </ViewsProvider>
  );
}
