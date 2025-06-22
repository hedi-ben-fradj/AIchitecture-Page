'use client';

import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { ViewsProvider, useViews } from '@/contexts/views-context';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { views, deleteView } = useViews();
  const projectName = projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const [viewToDelete, setViewToDelete] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, viewId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setViewToDelete(viewId);
  }

  const confirmDelete = () => {
    if (viewToDelete) {
      // If we are deleting the currently active view, navigate back to the project page
      if (pathname.includes(viewToDelete)) {
        router.push(`/admin/projects/${projectId}`);
      }
      deleteView(viewToDelete);
      setViewToDelete(null);
    }
  }

  return (
    <>
      <AlertDialog open={!!viewToDelete} onOpenChange={() => setViewToDelete(null)}>
        <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-neutral-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    "group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                    pathname === view.href && "bg-neutral-700 text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <view.icon className="h-4 w-4" />
                    {view.name}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteClick(e, view.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}


export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const { projectId } = params;

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
