import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import PropertyViewer from '@/components/landing/property-viewer';
import VirtualStaging from '@/components/landing/virtual-staging';
import FloorPlan from '@/components/landing/floor-plan';
import Contact from '@/components/landing/contact';
import Footer from '@/components/landing/footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <PropertyViewer />
        <VirtualStaging />
        <FloorPlan />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
