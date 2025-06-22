'use client';

import { useState } from 'react';
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import InteractiveLandingViewer from '@/components/landing/interactive-landing-viewer';
import Contact from '@/components/landing/contact';

export default function Home() {
  const [activeView, setActiveView] = useState('home');

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <Hero />;
      case 'explore':
        return (
          <section
            id="explore"
            className="relative h-screen w-full text-white overflow-hidden"
          >
            <InteractiveLandingViewer projectId="porto-montenegro" />
          </section>
        );
      case 'features':
        return <Features />;
      case 'contact':
        return <Contact />;
      default:
        return <Hero />;
    }
  };

  return (
    <div className="bg-background text-foreground">
      <Header activeView={activeView} setActiveView={setActiveView} />
      <main>
        {renderView()}
      </main>
    </div>
  );
}
