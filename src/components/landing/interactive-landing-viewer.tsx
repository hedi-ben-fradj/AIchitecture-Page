'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { View, Polygon } from '@/contexts/views-context';

interface StoredProjectData {
    views: View[];
    landingPageViewId: string | null;
}

export default function InteractiveLandingViewer({ projectId }: { projectId: string }) {
    const [view, setView] = useState<View | null>(null);
    const [hoveredSelection, setHoveredSelection] = useState<Polygon | null>(null);
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const storageKey = `project-data-${projectId}`;
        try {
            const item = window.localStorage.getItem(storageKey);
            if (item) {
                const data: StoredProjectData = JSON.parse(item);
                const landingView = data.views.find(v => v.id === data.landingPageViewId);
                if (landingView?.imageUrl) {
                    setView(landingView);
                }
            }
        } catch (error) {
            console.error("Failed to load view for landing page", error);
        }
        setIsLoaded(true);
    }, [projectId]);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        setCardPosition({ x: e.clientX, y: e.clientY });
    };

    if (!isLoaded) {
        return (
             <div className="h-full w-full flex items-center justify-center bg-neutral-900">
                <p className="text-muted-foreground animate-pulse">Loading View...</p>
            </div>
        )
    }

    if (!view) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No interactive view has been configured.</p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full" onMouseMove={handleMouseMove}>
            <Image src={view.imageUrl!} alt={view.name} layout="fill" objectFit="cover" />
            
            <svg className="absolute top-0 left-0 w-full h-full">
                {view.selections?.filter(s => s.details).map(selection => (
                    <polygon
                        key={selection.id}
                        points={selection.points.map(p => `${p.x},${p.y}`).join(' ')}
                        className="fill-yellow-400/20 hover:fill-yellow-400/40 stroke-yellow-500 stroke-2 transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredSelection(selection)}
                        onMouseLeave={() => setHoveredSelection(null)}
                    />
                ))}
            </svg>

            {hoveredSelection?.details && (
                <div
                    className="absolute pointer-events-none z-10"
                    style={{ top: cardPosition.y + 20, left: cardPosition.x + 20 }}
                >
                    <Card className="bg-black/70 backdrop-blur-sm text-white border-yellow-500 w-64 shadow-2xl animate-in fade-in-50">
                        <CardHeader>
                            <CardTitle className="text-base">{hoveredSelection.details.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            {hoveredSelection.details.description && <p className="text-neutral-300 mb-4">{hoveredSelection.details.description}</p>}
                            <div className="flex justify-between text-neutral-400">
                                <span>Width:</span>
                                <span className="font-mono">{hoveredSelection.details.width}m</span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                                <span>Height:</span>
                                <span className="font-mono">{hoveredSelection.details.height}m</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
