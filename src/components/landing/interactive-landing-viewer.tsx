'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, X, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import type { View, Polygon, Entity } from '@/contexts/views-context';
import { cn } from '@/lib/utils';
import FilterSidebar, { type Filters } from './filter-sidebar';

interface RenderedImageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// A combined type for easier state management
interface FullView extends View {
    entityId: string;
}

export default function InteractiveLandingViewer({ projectId }: { projectId: string }) {
    const [currentView, setCurrentView] = useState<FullView | null>(null);
    const [viewHistory, setViewHistory] = useState<string[]>([]); // Stores view IDs
    const [clickedSelection, setClickedSelection] = useState<Polygon | null>(null);
    const [hoveredSelectionId, setHoveredSelectionId] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<Partial<Filters>>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const getStorageKey = useCallback((key: string) => `project-${projectId}-${key}`, [projectId]);

    const loadDataFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return { entities: [], landingPageEntityId: null };
        try {
            const projectDataStr = localStorage.getItem(getStorageKey('data'));
            if (!projectDataStr) return { entities: [], landingPageEntityId: null };

            const projectData = JSON.parse(projectDataStr);

            if (!projectData || !Array.isArray(projectData.entities)) {
                console.warn("Project data in localStorage is malformed. Resetting state.", projectData);
                return { entities: [], landingPageEntityId: null };
            }

            const loadedEntities = projectData.entities.map((entityMeta: any) => ({
                ...entityMeta,
                views: entityMeta.views.map((viewMeta: any) => {
                    const imageUrl = localStorage.getItem(getStorageKey(`view-image-${viewMeta.id}`)) || undefined;
                    const selectionsStr = localStorage.getItem(getStorageKey(`view-selections-${viewMeta.id}`));
                    const selections = selectionsStr ? JSON.parse(selectionsStr) : [];
                    return { ...viewMeta, imageUrl, selections };
                })
            }));

            return { entities: loadedEntities, landingPageEntityId: projectData.landingPageEntityId };
        } catch (error) {
            console.error("Failed to load project data from storage", error);
            return { entities: [], landingPageEntityId: null };
        }
    }, [getStorageKey]);

    const findViewInEntities = (entities: Entity[], viewId: string): FullView | null => {
        for (const entity of entities) {
            const view = entity.views.find(v => v.id === viewId);
            if (view) {
                return { ...view, entityId: entity.id };
            }
        }
        return null;
    };
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoaded(false);
            const { entities, landingPageEntityId } = loadDataFromStorage();
            
            if (landingPageEntityId) {
                const landingEntity = entities.find(e => e.id === landingPageEntityId);
                if (landingEntity && landingEntity.defaultViewId) {
                    const defaultView = findViewInEntities(entities, landingEntity.defaultViewId);
                    setCurrentView(defaultView);
                }
            }
            setViewHistory([]);
            setIsLoaded(true);
        }
    }, [projectId, loadDataFromStorage]);
    

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
        
        setRenderedImageRect({ width: renderWidth, height: renderHeight, x, y });
    }, []);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(calculateRect);
        const container = containerRef.current;
        const image = imageRef.current;

        if (container) resizeObserver.observe(container);
        if (image) image.addEventListener('load', calculateRect);
        
        return () => {
            if (container) resizeObserver.unobserve(container);
            if (image) image.removeEventListener('load', calculateRect);
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

        const { entities } = loadDataFromStorage();
        const newView = findViewInEntities(entities, viewId);
        
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
            alert(`The view "${viewName}" could not be found.`);
        }
        setClickedSelection(null);
    };

    const handleBack = () => {
        if (viewHistory.length === 0) return;

        const previousViewId = viewHistory[viewHistory.length - 1];
        const { entities } = loadDataFromStorage();
        const previousView = findViewInEntities(entities, previousViewId);
        
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

    const filteredSelections = useMemo(() => {
        if (!currentView?.selections) return [];

        const selectionsWithDetails = currentView.selections.filter(s => s.details);
        const hasFilters = Object.values(appliedFilters).some(val => val !== '' && val !== undefined);

        if (!hasFilters) return selectionsWithDetails;

        return selectionsWithDetails.filter(selection => {
            const { width, height } = selection.details!;
            const { minWidth, maxWidth, minHeight, maxHeight } = appliedFilters;

            const widthPass = 
                (minWidth === undefined || minWidth === '' || width >= Number(minWidth)) &&
                (maxWidth === undefined || maxWidth === '' || width <= Number(maxWidth));
            
            const heightPass =
                (minHeight === undefined || minHeight === '' || height >= Number(minHeight)) &&
                (maxHeight === undefined || maxHeight === '' || height <= Number(maxHeight));
            
            return widthPass && heightPass;
        });
    }, [currentView?.selections, appliedFilters]);

    const handleApplyFilters = (filters: Filters) => {
        setAppliedFilters(filters);
        setIsFilterOpen(false);
    };

    const handleResetFilters = () => {
        setAppliedFilters({});
        setIsFilterOpen(false);
    };


    if (!isLoaded) {
        return <div className="h-full w-full flex items-center justify-center bg-neutral-900"><p className="text-muted-foreground animate-pulse">Loading View...</p></div>;
    }

    if (!currentView || !currentView.imageUrl) {
        return <div className="h-full w-full flex items-center justify-center bg-muted"><p className="text-muted-foreground">No interactive view has been configured.</p></div>;
    }
    
    return (
        <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden" onClick={() => setClickedSelection(null)}>
            <div className={cn("absolute top-0 left-0 h-full z-40 w-72 transition-transform duration-300 ease-in-out", isFilterOpen ? "translate-x-0" : "-translate-x-full")}>
                <FilterSidebar onApplyFilters={handleApplyFilters} onResetFilters={handleResetFilters} />
            </div>
            
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                 <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={() => setIsFilterOpen(!isFilterOpen)} aria-label={isFilterOpen ? "Close filters" : "Open filters"}>
                    {isFilterOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
                </Button>
                {viewHistory.length > 0 && (
                     <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={handleBack} aria-label="Go back to previous view">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <Image ref={imageRef} src={currentView.imageUrl} alt={currentView.name} layout="fill" objectFit="contain" onLoad={calculateRect} key={currentView.id} className="transition-opacity duration-500" style={{ opacity: renderedImageRect ? 1 : 0 }} />
            
            {renderedImageRect && (
                 <svg className="absolute top-0 left-0 w-full h-full z-10" style={{ transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`, width: renderedImageRect.width, height: renderedImageRect.height }}>
                    {filteredSelections.map(selection => (
                        <polygon
                            key={selection.id}
                            points={selection.points.map(p => `${p.x * renderedImageRect.width},${p.y * renderedImageRect.height}`).join(' ')}
                            className={cn("stroke-2 transition-all cursor-pointer", clickedSelection?.id === selection.id ? "stroke-yellow-400 fill-yellow-400/50" : "stroke-yellow-500 fill-yellow-400/20", hoveredSelectionId === selection.id && clickedSelection?.id !== selection.id && "fill-yellow-400/40", "hover:fill-yellow-400/40")}
                            onClick={(e) => handleSelectionClick(e, selection)}
                            onMouseEnter={() => setHoveredSelectionId(selection.id)}
                            onMouseLeave={() => setHoveredSelectionId(null)}
                        />
                    ))}
                </svg>
            )}

            {clickedSelection?.details && (
                <div className="absolute top-4 right-4 z-30 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <Card className="pointer-events-auto bg-black/60 backdrop-blur-sm text-white border-yellow-500 w-72 shadow-2xl animate-in fade-in-50 slide-in-from-right-5">
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
            
            {filteredSelections.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                    <div className="pointer-events-auto overflow-x-auto pb-2 -mb-2 flex justify-center">
                        <div className="flex gap-4 w-max">
                            {filteredSelections.map((selection) => (
                                <Card
                                    key={selection.id}
                                    className={cn("w-56 bg-black/70 backdrop-blur-sm text-white border-neutral-700 transition-colors shrink-0", "cursor-pointer hover:border-yellow-500", (hoveredSelectionId === selection.id || clickedSelection?.id === selection.id) && "border-yellow-500")}
                                    onMouseEnter={() => setHoveredSelectionId(selection.id)}
                                    onMouseLeave={() => setHoveredSelectionId(null)}
                                    onClick={(e) => { e.stopPropagation(); handleSelectionClick(e, selection); }}
                                >
                                    <CardHeader className="p-4"><CardTitle className="text-base truncate">{selection.details?.title}</CardTitle></CardHeader>
                                    {selection.details?.description && ( <CardContent className="p-4 pt-0"><p className="text-xs text-neutral-400 line-clamp-2">{selection.details.description}</p></CardContent> )}
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
