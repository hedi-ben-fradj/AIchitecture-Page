'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '#home', label: 'HOME' },
  { href: '#apartments', label: 'APARTMENTS' },
  { href: '#features', label: 'FEATURES' },
  { href: '#contact', label: 'CONTACT' },
];

export default function Header() {
  const [activeLink, setActiveLink] = useState('#home');
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
      
      const sections = navLinks.map(link => document.querySelector(link.href));
      const scrollPosition = window.scrollY + 100;

      sections.forEach(section => {
        if (section && section.offsetTop <= scrollPosition && section.offsetTop + section.offsetHeight > scrollPosition) {
          setActiveLink(`#${section.id}`);
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = (
    <>
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          onClick={() => setActiveLink(link.href)}
          className={cn(
            'text-sm font-light tracking-widest text-primary/80 hover:text-primary transition-colors relative py-2',
            activeLink === link.href && 'text-primary'
          )}
        >
          {link.label}
          {activeLink === link.href && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-primary" />
          )}
        </a>
      ))}
    </>
  );

  return (
    <header className={cn(
        "fixed top-0 z-50 w-full transition-colors duration-300",
        hasScrolled ? "bg-black/50 backdrop-blur-sm" : "bg-transparent"
    )}>
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
