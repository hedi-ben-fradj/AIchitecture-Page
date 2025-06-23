'use client';

import { useState, useEffect } from 'react';
import type { Entity, View } from '@/contexts/views-context';
import { LayoutGrid, FolderKanban, User, Settings, LogOut, Eye, Camera } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname, useParams } from 'next/navigation';

// Minimal type for sidebar display
interface SidebarView {
  id: string;
  name: string;
}

interface SidebarEntity {
  id: string;
  name: string;
  views: SidebarView[];
}

const mainNavItems = [
  { title: 'Home', href: '#', icon: LayoutGrid },
  // Projects is handled dynamically below
];

const bottomNavItems = [
    { title: 'View as Client', href: '/', icon: Eye },
    { title: 'Profile', href: '#', icon: User },
    { title: 'Settings', href: '#', icon: Settings },
    { title: 'Logout', href: '#', icon: LogOut },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const { projectId } = params;

  const [entities, setEntities] = useState<SidebarEntity[]>([]);

  useEffect(() => {
    if (projectId && typeof window !== 'undefined') {
      try {
        const projectDataStr = localStorage.getItem(`project-${projectId}-data`);
        if (projectDataStr) {
          const projectData = JSON.parse(projectDataStr);
          // Map entities and their views for the sidebar
          const entitiesForSidebar = projectData.entities?.map((e: Entity) => ({
            id: e.id,
            name: e.name,
            views: e.views?.map((v: View) => ({ id: v.id, name: v.name })) || []
          })) || [];
          setEntities(entitiesForSidebar);
        } else {
          setEntities([]);
        }
      } catch (error) {
        console.error("Failed to load entities for sidebar", error);
        setEntities([]);
      }
    } else {
      setEntities([]);
    }
  }, [projectId]);

  return (
    <div className="bg-neutral-900 text-foreground min-h-screen flex">
      <aside className="w-60 bg-[#212121] flex flex-col border-r border-neutral-700 flex-shrink-0">
        <div className="h-16 flex items-center px-6">
           <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        </div>
        <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto">
            <nav className="space-y-1">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white"
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                ))}
                
                {/* DYNAMIC PROJECTS SECTION */}
                <div className="space-y-1">
                  <Link
                      href="/admin"
                      className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                          pathname.startsWith('/admin') && "bg-neutral-700 text-white"
                      )}
                  >
                      <FolderKanban className="h-4 w-4" />
                      <span>Projects</span>
                  </Link>
                  {projectId && entities.length > 0 && (
                      <div className="pl-7 pt-1 space-y-1">
                          <h3 className="px-3 text-xs font-bold text-neutral-500 tracking-wider uppercase mb-2">ENTITIES</h3>
                          {entities.map(entity => {
                              const entityHref = `/admin/projects/${projectId}/entities/${entity.id}`;
                              const isEntityActive = pathname.startsWith(entityHref);
                              return (
                                  <div key={entity.id}>
                                      <Link
                                          href={entityHref}
                                          className={cn(
                                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                                              isEntityActive && "bg-neutral-600 text-white"
                                          )}
                                      >
                                          <Eye className="h-4 w-4" />
                                          {entity.name}
                                      </Link>
                                      {isEntityActive && entity.views.length > 0 && (
                                          <div className="pl-7 pt-1 space-y-1">
                                              {entity.views.map(view => {
                                                  const viewHref = `/admin/projects/${projectId}/entities/${entity.id}/views/${view.id}`;
                                                  const isViewActive = pathname === viewHref;
                                                  return (
                                                      <Link
                                                          key={view.id}
                                                          href={viewHref}
                                                          className={cn(
                                                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                                                              isViewActive && "bg-neutral-700 text-white"
                                                          )}
                                                      >
                                                          <Camera className="h-4 w-4" />
                                                          {view.name}
                                                      </Link>
                                                  );
                                              })}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}
                </div>
            </nav>
            <nav className="space-y-1">
                 {bottomNavItems.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white"
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                ))}
            </nav>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
