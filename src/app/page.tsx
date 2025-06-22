'use client';

import { useState } from 'react';
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import PropertyViewer from '@/components/landing/property-viewer';
import Contact from '@/components/landing/contact';

export default function Home() {
  const [activeView, setActiveView] = useState('home');

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <Hero />;
      case 'apartments':
        return <PropertyViewer />;
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
