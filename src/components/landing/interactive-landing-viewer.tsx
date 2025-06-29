
'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {ReactPhotoSphereViewer} from 'react-photo-sphere-viewer'
import { Navigation, X, ArrowLeft, SlidersHorizontal, Info } from 'lucide-react';
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

export default function InteractiveLandingViewer() {
    const [currentView, setCurrentView] = useState<FullView | null>(null);
    const [entityViews, setEntityViews] = useState<View[]>([]);
    const [viewHistory, setViewHistory] = useState<string[]>([]); // Stores view IDs
    const [clickedSelection, setClickedSelection] = useState<Polygon | null>(null);
    const [hoveredSelectionId, setHoveredSelectionId] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<Partial<Filters>>({});
    const [projectId, setProjectId] = useState<string | null>(null);
    const [detailsPosition, setDetailsPosition] = useState<React.CSSProperties>({ opacity: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const getStorageKey = useCallback((key: string) => {
        if (!projectId) return '';
        return `project-${projectId}-${key}`;
    }, [projectId]);

    const loadDataFromStorage = useCallback(() => {
        if (typeof window === 'undefined' || !projectId) return { entities: [], landingPageEntityId: null };
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
    }, [getStorageKey, projectId]);

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
            const landingProjectId = window.localStorage.getItem('landing_project_id');
            setProjectId(landingProjectId);
        }
    }, []);
    
    useEffect(() => {
        if (typeof window !== 'undefined' && projectId) {
            setIsLoaded(false);
            const { entities, landingPageEntityId } = loadDataFromStorage();
            
            if (landingPageEntityId) {
                const landingEntity = entities.find(e => e.id === landingPageEntityId);
                if (landingEntity && landingEntity.defaultViewId) {
                    const defaultView = findViewInEntities(entities, landingEntity.defaultViewId);
                    setCurrentView(defaultView);
                    setEntityViews(landingEntity.views);
                }
            } else {
                setCurrentView(null);
                setEntityViews([]);
            }
            setViewHistory([]);
            setIsLoaded(true);
        } else {
             setIsLoaded(true);
             setCurrentView(null);
             setEntityViews([]);
        }
    }, [projectId, loadDataFromStorage]);
    
    const closeDetails = useCallback(() => {
        setClickedSelection(null);
        setDetailsPosition({ opacity: 0 }); // For fade-out transition
    }, []);

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

            if (renderedImageRect && containerRef.current) {
                const { x: imgX, y: imgY, width: imgWidth, height: imgHeight } = renderedImageRect;
                const { clientWidth: containerWidth } = containerRef.current;

                const xCoords = selection.points.map(p => p.x);
                const yCoords = selection.points.map(p => p.y);
                const minX = Math.min(...xCoords);
                const maxX = Math.max(...xCoords);
                const minY = Math.min(...yCoords);

                const relativeCenterX = (minX + maxX) / 2;
                
                const selectionTop = imgY + minY * imgHeight;
                const selectionLeftEdge = imgX + minX * imgWidth;
                const selectionRightEdge = imgX + maxX * imgWidth;

                const position: React.CSSProperties = {
                    position: 'absolute',
                    top: `${selectionTop}px`,
                    opacity: 1,
                    transition: 'opacity 0.3s ease, top 0.3s ease, left 0.3s ease, right 0.3s ease',
                };
                
                if (relativeCenterX > 0.5) {
                    // Selection is on the right, so panel appears on the left
                    position.right = `${containerWidth - selectionLeftEdge + 16}px`;
                } else {
                    // Selection is on the left, so panel appears on the right
                    position.left = `${selectionRightEdge + 16}px`;
                }
                setDetailsPosition(position);
            }
        }
    };

    const handleNavigate = (entityName: string) => {
        const entityId = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const { entities } = loadDataFromStorage();
        const targetEntity = entities.find(e => e.id === entityId);
        
        if (targetEntity && targetEntity.defaultViewId) {
            const newView = findViewInEntities(entities, targetEntity.defaultViewId);
            if (newView) {
                if (currentView) {
                    setViewHistory(prev => [...prev, currentView.id]);
                }
                setCurrentView(newView);
                setEntityViews(targetEntity.views);
                closeDetails();
                setHoveredSelectionId(null);
                setRenderedImageRect(null);
                setTimeout(calculateRect, 0);
            } else {
                 alert(`The default view for entity "${entityName}" could not be found.`);
                 closeDetails();
            }
        } else {
            alert(`The entity "${entityName}" or its default view could not be found.`);
            closeDetails();
        }
    };

    const handleBack = () => {
        if (viewHistory.length === 0) return;

        const previousViewId = viewHistory[viewHistory.length - 1];
        const { entities } = loadDataFromStorage();
        const previousView = findViewInEntities(entities, previousViewId);
        
        if (previousView) {
            setCurrentView(previousView);
            const parentEntity = entities.find(e => e.id === previousView.entityId);
            if (parentEntity) {
                setEntityViews(parentEntity.views);
            }
            setViewHistory(prev => prev.slice(0, -1));
        } else {
            alert(`The previous view "${previousViewId}" could not be found.`);
            setViewHistory(prev => prev.slice(0, -1));
        }
        closeDetails();
        setHoveredSelectionId(null);
        setRenderedImageRect(null);
        setTimeout(calculateRect, 0);
    };

    const handleViewSelect = (view: View) => {
        if (currentView?.id === view.id || !currentView?.entityId) return;

        const newFullView: FullView = { ...view, entityId: currentView.entityId };
        setCurrentView(newFullView);
        closeDetails();
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

    if (!projectId || !currentView || !currentView.imageUrl) {
        return <div className="h-full w-full flex items-center justify-center bg-muted"><p className="text-muted-foreground">No interactive view has been configured for the landing page.</p></div>;
    }
    
    return (
        <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden" onClick={closeDetails}>
            <div
                className={cn("absolute top-0 left-0 h-full z-40 w-72 transition-transform duration-300 ease-in-out", isFilterOpen ? "translate-x-0" : "-translate-x-full")}
                onClick={(e) => e.stopPropagation()}
            >
                <FilterSidebar onApplyFilters={handleApplyFilters} onResetFilters={handleResetFilters} />
            </div>
            
            <div
                className={cn("absolute top-4 z-50 flex gap-2 transition-all duration-300 ease-in-out", isFilterOpen ? "left-[19rem]" : "left-4")}
                onClick={(e) => e.stopPropagation()}
            >
                 <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={() => setIsFilterOpen(!isFilterOpen)} aria-label={isFilterOpen ? "Close filters" : "Open filters"}>
                    {isFilterOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
                </Button>
                {viewHistory.length > 0 && (
                     <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={handleBack} aria-label="Go back to previous view">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {currentView.type == '2d' ? 
                <Image ref={imageRef} src={currentView.imageUrl} alt={currentView.name} layout="fill" objectFit="contain" onLoad={calculateRect} key={currentView.id} className="transition-opacity duration-500" style={{ opacity: renderedImageRect ? 1 : 0 }} />
                :
                <ReactPhotoSphereViewer
                  src={currentView.imageUrl} // Path to your 360 image
                  alt={currentView.name}
                  width="100%"
                  height="100%"
                />
            }
            
            {renderedImageRect && (
                 <svg className="absolute top-0 left-0 w-full h-full z-10" style={{ transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`, width: renderedImageRect.width, height: renderedImageRect.height }}>
                    {filteredSelections.map(selection => {
                        const absPoints = selection.points.map(p => ({
                            x: p.x * renderedImageRect.width,
                            y: p.y * renderedImageRect.height,
                        }));

                        const xCoords = absPoints.map(p => p.x);
                        const yCoords = absPoints.map(p => p.y);
                        const minX = Math.min(...xCoords);
                        const maxX = Math.max(...xCoords);
                        const minY = Math.min(...yCoords);
                        const maxY = Math.max(...yCoords);

                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        
                        const isHighlighted = clickedSelection?.id === selection.id || hoveredSelectionId === selection.id;

                        return (
                            <g
                                key={selection.id}
                                onClick={(e) => handleSelectionClick(e, selection)}
                                onMouseEnter={() => setHoveredSelectionId(selection.id)}
                                onMouseLeave={() => setHoveredSelectionId(null)}
                                className="cursor-pointer"
                            >
                                <polygon
                                    points={absPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    className={cn(
                                        "stroke-2 transition-all",
                                        clickedSelection?.id === selection.id
                                            ? "stroke-yellow-400 fill-yellow-400/50"
                                            : hoveredSelectionId === selection.id
                                                ? "stroke-yellow-500 fill-yellow-400/20"
                                                : "stroke-transparent fill-transparent"
                                    )}
                                />
                                {!isHighlighted && (
                                     <foreignObject x={centerX - 16} y={centerY - 16} width="32" height="32" className="pointer-events-none">
                                        <div className="bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm">
                                            <Info className="h-5 w-5 text-white" />
                                        </div>
                                    </foreignObject>
                                )}
                            </g>
                        )
                    })}
                </svg>
            )}

            {clickedSelection?.details && (
                <div style={detailsPosition} className="z-30 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <Card className="pointer-events-auto bg-black/60 backdrop-blur-sm text-white border-yellow-500 w-72 shadow-2xl animate-in fade-in-50">
                        <CardHeader className="flex-row items-start justify-between pb-2">
                            <CardTitle className="text-base leading-tight pr-2">{clickedSelection.details.title}</CardTitle>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-neutral-400 hover:text-white" onClick={closeDetails}>
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
                         {clickedSelection.details.makeAsEntity && clickedSelection.details.title && (
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
            
            {entityViews.length > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 h-auto max-h-[calc(100%-8rem)] w-48 z-30 hidden lg:block">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto space-y-2">
                             {entityViews.map(view => (
                                <div
                                    key={view.id}
                                    onClick={(e) => { e.stopPropagation(); handleViewSelect(view); }}
                                    className={cn(
                                        "rounded-lg overflow-hidden cursor-pointer border-2 hover:border-yellow-500 transition-colors group",
                                        currentView?.id === view.id ? "border-yellow-500" : "border-transparent"
                                    )}
                                >
                                    <div className="aspect-video relative">
                                        {view.imageUrl ? (
                                            <Image src={view.imageUrl} alt={view.name} layout="fill" objectFit="cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-neutral-400 bg-neutral-800">No preview</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                    <p className="text-xs text-white p-2 truncate font-medium bg-black/50">{view.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
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

    
