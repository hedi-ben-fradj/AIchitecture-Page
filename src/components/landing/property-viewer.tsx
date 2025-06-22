'use client';

import { useState, useRef, useEffect, type MouseEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Layers, Settings2, Download } from 'lucide-react';

const floorPlans = [
  { src: "https://placehold.co/100x100.png", alt: "Ground Floor", hint: "floor plan sketch" },
  { src: "https://placehold.co/100x100.png", alt: "First Floor", hint: "floor plan architecture" },
  { src: "https://placehold.co/100x100.png", alt: "Basement", hint: "floor plan blueprint" },
];

const cinematicThumbnails = [
    { src: 'https://placehold.co/150x84.png', alt: 'Cinematic 1', hint: 'modern house exterior' },
    { src: 'https://placehold.co/150x84.png', alt: 'Cinematic 2', hint: 'modern house interior' },
    { src: 'https://placehold.co/150x84.png', alt: 'Cinematic 3', hint: 'modern house garden' },
];

const stats = {
  plot: '154 m²',
  house: '168.8 m²',
  price: '1,600,000',
  rooms: [
    { name: 'SALON', size: '31.5 m²' },
    { name: 'KUCHNIA', size: '8.5 m²' },
    { name: 'GABINET', size: '8.5 m²' },
    { name: 'SYPIALNIA 1', size: '13.5 m²' },
    { name: 'SYPIALNIA 2', size: '11.5 m²' },
    { name: 'SYPIALNIA 3', size: '14 m²' },
    { name: 'ŁAZIENKA', size: '4 m²' },
  ],
};


export default function PropertyViewer() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      const headerHeight = 80; // h-20 from header
      const rightOffset = 32; // right-8
      const initialX = window.innerWidth - panel.offsetWidth - rightOffset;
      const initialY = headerHeight + 16;
      setPosition({ x: initialX, y: initialY });
      setIsInitialized(true);
    }
  }, []);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    setIsDragging(true);
    setOffset({
      x: e.clientX - panel.offsetLeft,
      y: e.clientY - panel.offsetTop,
    });
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  return (
    <section
      id="apartments"
      className="relative h-screen w-full text-white overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Image
        src="/assets/building.png"
        alt="Modern house exterior with wooden panels"
        layout="fill"
        objectFit="cover"
        className="z-0"
        data-ai-hint="modern house wood"
      />
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Top Left - Back button */}
      <div className="absolute top-8 left-8 z-20">
        <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white rounded-full p-2">
            <ArrowLeft className="h-6 w-6 mr-2"/>
            WRÓĆ DO LISTY DOMÓW
        </Button>
      </div>

      {/* Left Sidebar */}
      <aside className="absolute top-1/2 left-8 -translate-y-1/2 z-20 p-4 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 w-64 space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-5xl font-light">38A</h2>
            <span className="text-xs text-white/70">3Q/2023</span>
        </div>
        <div className="space-y-2">
            {floorPlans.map((plan, index) => (
                <Card key={index} className="bg-white/10 border-white/20 hover:border-white cursor-pointer transition-colors">
                    <CardContent className="p-2">
                        <Image src={plan.src} alt={plan.alt} width={100} height={100} className="rounded-md w-full h-auto" data-ai-hint={plan.hint}/>
                    </CardContent>
                </Card>
            ))}
        </div>
        <div className="text-center space-y-2 pt-2">
            <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/20 hover:text-white">
                <Download className="mr-2 h-4 w-4"/>
                DOKUMENTACJA DOMU.PDF
            </Button>
            <Button className="w-full bg-white/90 text-black hover:bg-white font-bold">
                UMÓW SIĘ
            </Button>
        </div>
      </aside>

      {/* Info Panel */}
      <div
        ref={panelRef}
        className={`absolute z-30 p-6 bg-[rgba(190,142,64,0.4)] backdrop-blur-md rounded-lg border border-[rgba(255,255,255,0.2)] text-white w-[500px] transition-opacity duration-300 ${isInitialized ? 'opacity-100' : 'opacity-0'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          userSelect: isDragging ? 'none' : 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="grid grid-cols-3 gap-4 border-b border-white/20 pb-4 mb-4">
            <div>
                <p className="text-xs text-white/70 uppercase">Działka</p>
                <p className="text-2xl font-light">{stats.plot}</p>
            </div>
            <div>
                <p className="text-xs text-white/70 uppercase">Dom</p>
                <p className="text-2xl font-light">{stats.house}</p>
            </div>
            <div>
                <p className="text-xs text-white/70 uppercase">Cena (PLN)</p>
                <p className="text-2xl font-light">{stats.price}</p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {stats.rooms.map(room => (
                <div key={room.name} className="flex justify-between text-sm">
                    <span className="text-white/80">{room.name}</span>
                    <span className="font-light">{room.size}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="container mx-auto max-w-7xl flex items-end justify-center gap-12 text-white">
            <div className="text-center">
                <p className="text-sm tracking-widest mb-2">CINEMATIC</p>
                <div className="flex gap-2">
                    {cinematicThumbnails.map((thumb, i) => (
                        <div key={i} className="relative w-[120px] h-[67px] rounded-md overflow-hidden border-2 border-transparent hover:border-white cursor-pointer transition-colors">
                            <Image src={thumb.src} alt={thumb.alt} layout="fill" objectFit="cover" data-ai-hint={thumb.hint}/>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-8 pb-1">
                <Button variant="ghost" className="flex-col h-auto p-2 hover:bg-white/10 rounded-md">
                    <Layers className="h-8 w-8"/>
                    <span className="mt-1 text-xs">FLOORS</span>
                </Button>
                <Button variant="ghost" className="flex-col h-auto p-2 hover:bg-white/10 rounded-md">
                    <Settings2 className="h-8 w-8"/>
                    <span className="mt-1 text-xs">CONFIGURATOR</span>
                </Button>
            </div>
        </div>
      </footer>
    </section>
  );
}
