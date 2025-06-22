import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Edit Project',
  description: 'Edit project details.',
};

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const projectName = params.projectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="bg-[#313131] text-foreground min-h-screen flex">
      <aside className="w-72 bg-[#2a2a2a] flex-shrink-0 flex flex-col p-6 border-r border-neutral-700">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{projectName}</h1>
          <p className="text-sm text-neutral-400 mt-1">Project Description</p>
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 mt-6 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>
          <div className="mt-8">
            <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase mb-4">JUMP TO</h2>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
