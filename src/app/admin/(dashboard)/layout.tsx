import type { Metadata } from 'next';
import { LayoutGrid, FolderKanban, AppWindow, MapPin, User, Settings, LogOut, Eye } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard for managing properties.',
};

const mainNavItems = [
    { title: 'Home', href: '#', icon: LayoutGrid },
    { title: 'Projects', href: '/admin', icon: FolderKanban, active: true },
    { title: 'Apps', href: '#', icon: AppWindow },
    { title: 'POIs', href: '#', icon: MapPin },
];

const bottomNavItems = [
    { title: 'View as Client', href: '/', icon: Eye },
    { title: 'Profile', href: '#', icon: User },
    { title: 'Settings', href: '#', icon: Settings },
    { title: 'Logout', href: '#', icon: LogOut },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-900 text-foreground min-h-screen flex">
      <aside className="w-60 bg-[#212121] flex flex-col border-r border-neutral-700 flex-shrink-0">
        <div className="h-16 flex items-center px-6">
           <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        </div>
        <div className="flex-1 flex flex-col justify-between p-4">
            <nav className="space-y-1">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.title}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-700 hover:text-white",
                            item.active && "bg-neutral-700 text-white"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                ))}
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
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
