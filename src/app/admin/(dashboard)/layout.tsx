import type { Metadata } from 'next';
import { ArrowLeft, LayoutGrid, FolderKanban, AppWindow, MapPin, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
      <aside className="w-60 bg-[#212121] flex flex-col border-r border-neutral-700">
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
          <header className="h-16 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a]">
                <Button variant="ghost" size="icon" asChild className="hover:bg-neutral-700">
                    <Link href="/">
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold ml-4 text-white">Projects</h1>
          </header>
          <main className="flex-1 p-8 bg-[#313131]">
              {children}
          </main>
      </div>
    </div>
  );
}
