import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import PropertyViewer from '@/components/landing/property-viewer';
import Contact from '@/components/landing/contact';

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Hero />
        <PropertyViewer />
        <Features />
        <Contact />
      </main>
    </div>
  );
}
