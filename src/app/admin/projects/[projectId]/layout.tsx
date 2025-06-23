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
      {children}
    </ViewsProvider>
  );
}
