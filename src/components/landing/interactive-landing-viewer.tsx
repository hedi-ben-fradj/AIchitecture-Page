'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, X, ArrowLeft } from 'lucide-react';
import type { View, Polygon } from '@/contexts/views-context';
import { cn } from '@/lib/utils';

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
    const [hoveredSelectionId, setHoveredSelectionId] = useState<number | null>(null);
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
        if (naturalWidth === 0 || naturalHeight === 0) return;

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
        const image = imageRef.current;

        if (container) {
            resizeObserver.observe(container);
        }
        if (image) {
            image.addEventListener('load', calculateRect);
        }
        
        return () => {
            if (container) {
                resizeObserver.unobserve(container);
            }
            if (image) {
                image.removeEventListener('load', calculateRect);
            }
        };
    }, [calculateRect]);

    const handleSelectionClick = (e: MouseEvent, selection: Polygon) => {
        e.stopPropagation();
        if (selection.details) {
            setClickedSelection(selection);
        }
    };

    const handleNavigate = (viewName: string) => {
        const viewId = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        if (currentView && currentView.id === viewId) {
            setClickedSelection(null);
            return;
        }

        const newView = loadView(viewId);
        if (newView) {
            if (currentView) {
                setViewHistory(prev => [...prev, currentView.id]);
            }
            setCurrentView(newView);
            setClickedSelection(null);
            setHoveredSelectionId(null);
            setRenderedImageRect(null);
            setTimeout(calculateRect, 0);
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
            setViewHistory(prev => prev.slice(0, -1));
        }
        setClickedSelection(null);
        setHoveredSelectionId(null);
        setRenderedImageRect(null);
        setTimeout(calculateRect, 0);
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
        <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden" onClick={() => setClickedSelection(null)}>
            {viewHistory.length > 0 && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 left-4 z-30 h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" 
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
                className="transition-opacity duration-500"
                style={{ opacity: renderedImageRect ? 1 : 0 }}
            />
            
            {renderedImageRect && currentView.selections && currentView.selections.length > 0 && (
                 <svg 
                    className="absolute top-0 left-0 w-full h-full z-10"
                    style={{
                        transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`,
                        width: renderedImageRect.width,
                        height: renderedImageRect.height,
                    }}
                >
                    {currentView.selections.map(selection => (
                        <polygon
                            key={selection.id}
                            points={selection.points.map(p => `${p.x * renderedImageRect.width},${p.y * renderedImageRect.height}`).join(' ')}
                            className={cn(
                                "stroke-2 transition-all cursor-pointer",
                                clickedSelection?.id === selection.id
                                  ? "stroke-yellow-400 fill-yellow-400/50"
                                  : "stroke-yellow-500 fill-yellow-400/20",
                                hoveredSelectionId === selection.id && clickedSelection?.id !== selection.id && "fill-yellow-400/40",
                                "hover:fill-yellow-400/40"
                            )}
                            onClick={(e) => handleSelectionClick(e, selection)}
                            onMouseEnter={() => setHoveredSelectionId(selection.id)}
                            onMouseLeave={() => setHoveredSelectionId(null)}
                        />
                    ))}
                </svg>
            )}

            {clickedSelection?.details && (
                <div
                    className="absolute top-20 left-4 z-30 pointer-events-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Card className="pointer-events-auto bg-black/60 backdrop-blur-sm text-white border-yellow-500 w-72 shadow-2xl animate-in fade-in-50 slide-in-from-left-5">
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
            
            {currentView?.selections && currentView.selections.some(s => s.details) && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                    <div className="pointer-events-auto overflow-x-auto pb-2 -mb-2">
                        <div className="flex gap-4 w-max">
                            {currentView.selections.filter(s => s.details).map((selection) => (
                                <Card
                                    key={selection.id}
                                    className={cn(
                                        "w-56 bg-black/70 backdrop-blur-sm text-white border-neutral-700 transition-colors shrink-0",
                                        "cursor-pointer hover:border-yellow-500",
                                        (hoveredSelectionId === selection.id || clickedSelection?.id === selection.id) && "border-yellow-500"
                                    )}
                                    onMouseEnter={() => setHoveredSelectionId(selection.id)}
                                    onMouseLeave={() => setHoveredSelectionId(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectionClick(e, selection);
                                    }}
                                >
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base truncate">{selection.details?.title}</CardTitle>
                                    </CardHeader>
                                    {selection.details?.description && (
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-xs text-neutral-400 line-clamp-2">
                                                {selection.details.description}
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
