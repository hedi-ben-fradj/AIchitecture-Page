'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { View, Polygon } from '@/contexts/views-context';

interface RenderedImageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function InteractiveLandingViewer({ projectId }: { projectId: string }) {
    const [view, setView] = useState<View | null>(null);
    const [hoveredSelection, setHoveredSelection] = useState<Polygon | null>(null);
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
    const [isLoaded, setIsLoaded] = useState(false);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const getStorageKey = (key: string) => `project-${projectId}-${key}`;
        
        if (typeof window !== 'undefined') {
            setIsLoaded(false);
            try {
                const projectDataStr = window.localStorage.getItem(getStorageKey('data'));
                if (projectDataStr) {
                    const projectData = JSON.parse(projectDataStr);
                    const landingViewId = projectData.landingPageViewId;

                    if (landingViewId) {
                        const viewMetadata = projectData.views.find((v: any) => v.id === landingViewId);
                        if (viewMetadata) {
                            const imageUrl = window.localStorage.getItem(getStorageKey(`view-image-${landingViewId}`)) || undefined;
                            const selectionsStr = window.localStorage.getItem(getStorageKey(`view-selections-${landingViewId}`));
                            const selections = selectionsStr ? JSON.parse(selectionsStr) : [];
                            
                            const landingView: Partial<View> = {
                                ...viewMetadata,
                                imageUrl,
                                selections,
                            };

                            if (landingView.imageUrl) {
                                setView(landingView as View);
                            } else {
                                setView(null);
                            }
                        } else {
                           setView(null);
                        }
                    } else {
                        setView(null);
                    }
                }
            } catch (error) {
                console.error("Failed to load view for landing page", error);
                setView(null);
            }
            setIsLoaded(true);
        }
    }, [projectId]);

    const calculateRect = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return;
        
        const { naturalWidth, naturalHeight } = imageRef.current;
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        
        const imageAspectRatio = naturalWidth / naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let renderWidth, renderHeight, x, y;
        
        // Image is wider than container, so it's constrained by width (letterboxed top/bottom)
        if (imageAspectRatio > containerAspectRatio) {
            renderWidth = containerWidth;
            renderHeight = containerWidth / imageAspectRatio;
            x = 0;
            y = (containerHeight - renderHeight) / 2;
        } else { // Image is taller or same aspect, constrained by height (letterboxed left/right)
            renderHeight = containerHeight;
            renderWidth = containerHeight * imageAspectRatio;
            y = 0;
            x = (containerWidth - renderWidth) / 2;
        }
        
        setRenderedImageRect({ width: renderWidth, height: renderHeight, x, y });
    }, []);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(calculateRect);
        const container = containerRef.current;
        if (container) {
            resizeObserver.observe(container);
        }
        
        return () => {
            if (container) {
                resizeObserver.unobserve(container);
            }
        };
    }, [calculateRect]);


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

    if (!view || !view.imageUrl) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No interactive view has been configured.</p>
            </div>
        );
    }
    
    return (
        <div ref={containerRef} className="relative h-full w-full" onMouseMove={handleMouseMove}>
            <Image
                ref={imageRef}
                src={view.imageUrl!}
                alt={view.name}
                layout="fill"
                objectFit="contain"
                onLoad={calculateRect}
            />
            
            {renderedImageRect && view.selections && (
                 <svg 
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`,
                        width: renderedImageRect.width,
                        height: renderedImageRect.height,
                    }}
                >
                    {view.selections.map(selection => (
                        <polygon
                            key={selection.id}
                            points={selection.points.map(p => `${p.x * renderedImageRect.width},${p.y * renderedImageRect.height}`).join(' ')}
                            className="fill-yellow-400/20 hover:fill-yellow-400/40 stroke-yellow-500 stroke-2 transition-all cursor-pointer"
                            onMouseEnter={() => selection.details && setHoveredSelection(selection)}
                            onMouseLeave={() => setHoveredSelection(null)}
                        />
                    ))}
                </svg>
            )}


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
