'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#viewer', label: 'Viewer' },
  { href: '#staging', label: 'Virtual Staging' },
  { href: '#plans', label: 'Floor Plans' },
  { href: '#contact', label: 'Contact' },
];

export default function Header() {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = (
    <>
      {navLinks.map((link) => (
        <a key={link.href} href={link.href} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
          {link.label}
        </a>
      ))}
    </>
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        hasScrolled ? 'border-b border-border/60 bg-background/80 backdrop-blur-sm' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-headline text-lg font-bold text-primary">AIchitect Viewer</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 p-6">
                <Link href="/" className="flex items-center gap-2 mb-4">
                  <Logo className="h-6 w-6" />
                  <span className="font-headline text-lg font-bold text-primary">AIchitect Viewer</span>
                </Link>
                {navItems}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
