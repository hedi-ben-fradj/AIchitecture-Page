'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ViewsProvider, useViews } from '@/contexts/views-context';

function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { views } = useViews();
  const projectName = projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <aside className="w-72 bg-[#2a2a2a] flex-shrink-0 flex flex-col p-6 border-r border-neutral-700">
      <div className="flex-1">
        <Link href={`/admin/projects/${projectId}`}>
          <h1 className="text-xl font-semibold text-white hover:underline">{projectName}</h1>
        </Link>
        <p className="text-sm text-neutral-400 mt-1">Project Views</p>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 mt-6 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="mt-8">
          <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase mb-4">VIEWS</h2>
          <nav className="space-y-1">
            {views.map((view) => (
              <Link
                key={view.id}
                href={view.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                  pathname === view.href && "bg-neutral-700 text-white"
                )}
              >
                <view.icon className="h-4 w-4" />
                {view.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}


export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {

  return (
    <ViewsProvider projectId={params.projectId}>
      <div className="bg-[#313131] text-foreground min-h-screen flex">
        <ProjectSidebar projectId={params.projectId} />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </ViewsProvider>
  );
}
