'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, X, ArrowLeft } from 'lucide-react';
import type { View, Polygon } from '@/contexts/views-context';

interface RenderedImageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function InteractiveLandingViewer({ projectId }: { projectId: string }) {
    const [currentView, setCurrentView] = useState<View | null>(null);
    const [viewHistory, setViewHistory] = useState<string[]>([]);
    const [clickedSelection, setClickedSelection] = useState<Polygon | null>(null);
    const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
    const [isLoaded, setIsLoaded] = useState(false);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const getStorageKey = useCallback((key: string) => `project-${projectId}-${key}`, [projectId]);

    const loadView = useCallback((viewId: string): View | null => {
        if (typeof window === 'undefined') return null;
        try {
            const projectDataStr = localStorage.getItem(getStorageKey('data'));
            if (!projectDataStr) return null;

            const projectData = JSON.parse(projectDataStr);
            const viewMetadata = projectData.views.find((v: any) => v.id === viewId);

            if (!viewMetadata) {
                console.warn(`View metadata for ID "${viewId}" not found.`);
                return null;
            }
            
            const imageUrl = localStorage.getItem(getStorageKey(`view-image-${viewId}`)) || undefined;
             if (!imageUrl) {
                console.warn(`Image for view ID "${viewId}" not found.`);
                return null;
            }

            const selectionsStr = localStorage.getItem(getStorageKey(`view-selections-${viewId}`));
            const selections = selectionsStr ? JSON.parse(selectionsStr) : [];

            return { ...viewMetadata, imageUrl, selections };
        } catch (error) {
            console.error(`Failed to load view ${viewId} from storage`, error);
            return null;
        }
    }, [getStorageKey]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoaded(false);
            const projectDataStr = localStorage.getItem(getStorageKey('data'));
            if (projectDataStr) {
                const projectData = JSON.parse(projectDataStr);
                const landingViewId = projectData.landingPageViewId;
                if (landingViewId) {
                    const view = loadView(landingViewId);
                    setCurrentView(view);
                    setViewHistory([]);
                }
            }
            setIsLoaded(true);
        }
    }, [projectId, getStorageKey, loadView]);
    

    const calculateRect = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return;
        
        const { naturalWidth, naturalHeight } = imageRef.current;
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        
        const imageAspectRatio = naturalWidth / naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let renderWidth, renderHeight, x, y;
        
        if (imageAspectRatio > containerAspectRatio) {
            renderWidth = containerWidth;
            renderHeight = containerWidth / imageAspectRatio;
            x = 0;
            y = (containerHeight - renderHeight) / 2;
        } else {
            renderHeight = containerHeight;
            renderWidth = containerHeight * imageAspectRatio;
            y = 0;
            x = (containerWidth - renderWidth) / 2;
        }
        
        setRenderedImageRect(prevRect => {
          const newRect = { width: renderWidth, height: renderHeight, x, y };
          if (prevRect && prevRect.width === newRect.width && prevRect.height === newRect.height && prevRect.x === newRect.x && prevRect.y === newRect.y) {
            return prevRect;
          }
          return newRect;
        });
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

    const handlePolygonClick = (e: MouseEvent, selection: Polygon) => {
        e.stopPropagation();
        if (selection.details) {
            setClickedSelection(selection);
            setCardPosition({ x: e.clientX, y: e.clientY });
        }
    };

    const handleNavigate = (viewName: string) => {
        const viewId = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const newView = loadView(viewId);
        if (newView) {
            if (currentView) {
                setViewHistory(prev => [...prev, currentView.id]);
            }
            setCurrentView(newView);
        } else {
            alert(`The view "${viewName}" could not be found. It may have been deleted or not yet configured.`);
        }
        setClickedSelection(null);
    };

    const handleBack = () => {
        if (viewHistory.length === 0) return;

        const previousViewId = viewHistory[viewHistory.length - 1];
        const previousView = loadView(previousViewId);
        
        if (previousView) {
            setCurrentView(previousView);
            setViewHistory(prev => prev.slice(0, -1));
        } else {
            alert(`The previous view "${previousViewId}" could not be found.`);
            // still pop from history to prevent getting stuck
            setViewHistory(prev => prev.slice(0, -1));
        }
        setClickedSelection(null);
    };

    if (!isLoaded) {
        return (
             <div className="h-full w-full flex items-center justify-center bg-neutral-900">
                <p className="text-muted-foreground animate-pulse">Loading View...</p>
            </div>
        )
    }

    if (!currentView || !currentView.imageUrl) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No interactive view has been configured.</p>
            </div>
        );
    }
    
    return (
        <div ref={containerRef} className="relative h-full w-full">
            {viewHistory.length > 0 && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 left-4 z-20 h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" 
                    onClick={handleBack}
                    aria-label="Go back to previous view"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}

            <Image
                ref={imageRef}
                src={currentView.imageUrl}
                alt={currentView.name}
                layout="fill"
                objectFit="contain"
                onLoad={calculateRect}
                key={currentView.id}
            />
            
            {renderedImageRect && currentView.selections && currentView.selections.length > 0 && (
                 <svg 
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`,
                        width: renderedImageRect.width,
                        height: renderedImageRect.height,
                    }}
                    onClick={() => setClickedSelection(null)}
                >
                    {currentView.selections.map(selection => (
                        <polygon
                            key={selection.id}
                            points={selection.points.map(p => `${p.x * renderedImageRect.width},${p.y * renderedImageRect.height}`).join(' ')}
                            className="fill-yellow-400/20 hover:fill-yellow-400/40 stroke-yellow-500 stroke-2 transition-all cursor-pointer"
                            onClick={(e) => handlePolygonClick(e, selection)}
                        />
                    ))}
                </svg>
            )}


            {clickedSelection?.details && (
                <div
                    className="absolute pointer-events-none z-10"
                    style={{ top: cardPosition.y + 20, left: cardPosition.x + 20 }}
                >
                    <Card className="pointer-events-auto bg-black/80 backdrop-blur-sm text-white border-yellow-500 w-64 shadow-2xl animate-in fade-in-50">
                        <CardHeader className="flex-row items-start justify-between pb-2">
                            <CardTitle className="text-base leading-tight pr-2">{clickedSelection.details.title}</CardTitle>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-neutral-400 hover:text-white" onClick={() => setClickedSelection(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="text-sm">
                            {clickedSelection.details.description && <p className="text-neutral-300 mb-4">{clickedSelection.details.description}</p>}
                            <div className="flex justify-between text-neutral-400">
                                <span>Width:</span>
                                <span className="font-mono">{clickedSelection.details.width}m</span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                                <span>Height:</span>
                                <span className="font-mono">{clickedSelection.details.height}m</span>
                            </div>
                        </CardContent>
                         {clickedSelection.details.makeAsView && clickedSelection.details.title && (
                            <CardFooter>
                                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => handleNavigate(clickedSelection.details!.title)}>
                                    <Navigation className="mr-2 h-4 w-4" />
                                    Navigate to
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
