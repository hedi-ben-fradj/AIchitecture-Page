
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Entity, View } from '@/contexts/views-context';
import { LayoutGrid, FolderKanban, User, Settings, LogOut, Eye, Building, Database } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { ViewsProvider } from '@/contexts/views-context';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { signOut } from 'firebase/auth';

// Minimal type for sidebar display
interface SidebarView {
  id: string;
  name: string;
}

interface SidebarEntity extends Entity {
  // Use the full Entity type now
}

// New recursive component for the sidebar
const EntitySidebarNode = ({ 
  entity, 
  allEntities, 
  projectId, 
  pathname,
  activePathIds
}: { 
  entity: SidebarEntity, 
  allEntities: SidebarEntity[], 
  projectId: string, 
  pathname: string,
  activePathIds: Set<string>
}) => {
    const children = useMemo(() => allEntities.filter(e => e.parentId === entity.id), [allEntities, entity.id]);
    const entityHref = `/admin/projects/${projectId}/entities/${entity.id}`;
    const isNodeOnActivePath = activePathIds.has(entity.id);

    return (
        <div>
            <Link
                href={entityHref}
                className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                    isNodeOnActivePath && "bg-neutral-600 text-white"
                )}
            >
                <Building className="h-4 w-4" />
                {entity.name}
            </Link>
            
            {isNodeOnActivePath && (
                 <div className="pl-3 border-l border-neutral-700 ml-4">
                    {/* Views */}
                    {entity.views.length > 0 && (
                        <div className="pt-2 space-y-1">
                            {entity.views.map(view => {
                                const viewHref = `/admin/projects/${projectId}/entities/${entity.id}/views/${encodeURIComponent(view.id)}`;
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
                                        <Eye className="h-4 w-4" />
                                        {view.name}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                    {/* Child Entities */}
                    {children.length > 0 && (
                        <div className="pt-2 space-y-1">
                            {children.map(child => (
                                <EntitySidebarNode
                                    key={child.id}
                                    entity={child}
                                    allEntities={allEntities}
                                    projectId={projectId}
                                    pathname={pathname}
                                    activePathIds={activePathIds}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


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

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId?: string; entityId?: string }>();
  const { projectId, entityId } = params;

  const [entities, setEntities] = useState<SidebarEntity[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  useEffect(() => {
    if (!projectId) {
        setEntities([]);
        return;
    }
    const entitiesQuery = query(collection(db, 'entities'), where('projectId', '==', projectId));

    const unsubscribe = onSnapshot(entitiesQuery, (querySnapshot) => {
        const entitiesForSidebar = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SidebarEntity[];
        setEntities(entitiesForSidebar);
    }, (error) => {
        console.error("Failed to load entities for sidebar from Firestore:", error);
        setEntities([]);
    });

    return () => unsubscribe();
  }, [projectId]);

  const rootEntities = useMemo(() => entities.filter(e => !e.parentId), [entities]);
  
  const activePathIds = useMemo(() => {
    const ids = new Set<string>();
    if (!entityId || !entities.length) {
      return ids;
    }
    
    let currentId: string | undefined | null = entityId;
    while(currentId) {
      ids.add(currentId);
      const currentEntity = entities.find(e => e.id === currentId);
      currentId = currentEntity?.parentId;
    }
    return ids;
  }, [entityId, entities]);

  if (loading || !user) {
    return (
      <div className="bg-neutral-900 flex h-screen w-full items-center justify-center text-white">
        <p>Loading Authentication...</p>
      </div>
    );
  }
  
  return (
    <ViewsProvider>
      <div className="bg-neutral-900 text-foreground min-h-screen flex">
        <aside className="w-80 bg-[#212121] flex flex-col border-r border-neutral-700 flex-shrink-0">
          <div className="h-16 flex items-center px-6">
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          </div>
          <div className="flex-1 flex flex-col justify-between p-2 overflow-y-auto">
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
                  
                  <div className="space-y-1">
                    <Link
                        href="/admin"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                            (pathname.startsWith('/admin/projects') || pathname === '/admin') && "bg-neutral-700 text-white"
                        )}
                    >
                        <FolderKanban className="h-4 w-4" />
                        <span>Projects</span>
                    </Link>
                    {projectId && (
                        <div className="pl-3 pt-1 space-y-1 border-l border-neutral-700 ml-4">
                            {rootEntities.map(entity => (
                              <EntitySidebarNode 
                                  key={entity.id}
                                  entity={entity}
                                  allEntities={entities}
                                  projectId={projectId}
                                  pathname={pathname}
                                  activePathIds={activePathIds}
                              />
                            ))}
                        </div>
                    )}
                  </div>

                  <Link
                    href="/admin/database"
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                        pathname === '/admin/database' && "bg-neutral-700 text-white"
                    )}
                  >
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                  </Link>
              </nav>
              <nav className="space-y-1">
                  {bottomNavItems.map((item) => {
                    if (item.title === 'Logout') {
                      return (
                        <button
                          key={item.title}
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white text-left"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </button>
                      );
                    }
                    return (
                      <Link
                          key={item.title}
                          href={item.href}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white"
                      >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                      </Link>
                    );
                  })}
              </nav>
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ViewsProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
