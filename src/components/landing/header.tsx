'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const navLinks = [
  { id: 'home', label: 'HOME' },
  { id: 'apartments', label: 'APARTMENTS' },
  { id: 'features', label: 'FEATURES' },
  { id: 'contact', label: 'CONTACT' },
  { id: 'admin', label: 'ADMIN' },
];

interface HeaderProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

export default function Header({ activeView, setActiveView }: HeaderProps) {
  const navItems = (
    <>
      {navLinks.map((link) => {
        const className = cn(
          'text-sm font-light tracking-widest text-primary/80 hover:text-primary transition-colors relative py-2 bg-transparent border-none',
          activeView === link.id && 'text-primary'
        );

        if (link.id === 'admin') {
          return (
            <Link key={link.id} href="/admin" className={className}>
              {link.label}
            </Link>
          );
        }

        return (
          <button
            key={link.id}
            onClick={() => setActiveView(link.id)}
            className={className}
          >
            {link.label}
            {activeView === link.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-primary" />
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <header className="fixed top-0 z-50 w-full bg-transparent">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-center px-4 md:px-6">
        <nav className="hidden md:flex items-center gap-10 bg-black/30 px-8 py-2 rounded-full border border-white/10 shadow-lg">
          {navItems}
        </nav>
        <div className="md:hidden ml-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background/95 border-l-border">
              <div className="flex flex-col items-center gap-6 p-6 mt-8">
                {navItems}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
