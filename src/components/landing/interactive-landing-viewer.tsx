'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer'
import { Image as ImageIcon, Crop as CropIcon, Navigation as NavigationIcon, SlidersHorizontal, X, ArrowLeft, Info, Phone } from 'lucide-react'; // Importing specific icons
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

// Define types for View, Polygon, and Entity if not already imported from a central location
export interface View {
  id: string;
  name: string;
  imageUrl?: string;
  type: '2d' | '360';
  selections?: Polygon[];
}

export interface Polygon {
  id: number;
  points: { x: number; y: number; }[];
  details?: {
    title: string;
    description?: string;
    width?: number;
    height?: number;
    area?: number;
    makeAsEntity?: boolean;
    entityType?: EntityType;
  };
}

export type EntityType = 'residential compound' | 'residential building' | 'Apartment' | 'Floor' | 'Room' | 'Furniture/Appliance' | 'house';

export interface RoomDetail {
  id: string;
  name: string;
  size: number;
}
export interface Entity {
  id: string;
  name: string;
  entityType: EntityType;
  parentId?: string | null;
  views: View[];
  defaultViewId: string | null;
  plotArea?: number;
  houseArea?: number;
  price?: number;
  status?: 'available' | 'sold';
  availableDate?: string;
  floors?: number;
  rooms?: number;
  detailedRooms?: RoomDetail[];
}


export default function InteractiveLandingViewer({ setActiveView }: { setActiveView: (view: string) => void }) {
    const [currentView, setCurrentView] = useState<FullView | null>(null);
    const [entityViews, setEntityViews] = useState<View[]>([]);
    const [allEntities, setAllEntities] = useState<Entity[]>([]);
    const [viewHistory, setViewHistory] = useState<string[]>([]); // Stores view IDs
    const [clickedSelection, setClickedSelection] = useState<Polygon | null>(null);
    const [clickedEntity, setClickedEntity] = useState<Entity | null>(null);
    const [hoveredSelectionId, setHoveredSelectionId] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<Partial<Filters>>({});
    const [projectId, setProjectId] = useState<string | null>(null);
    const [detailsPosition, setDetailsPosition] = useState<React.CSSProperties>({ opacity: 0 });
    const [currentViewType, setCurrentViewType] = useState<'2d' | '360'>('2d');

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const isFilterApplied = useMemo(() => {
        return Object.values(appliedFilters).some(val => val !== '' && val !== undefined && val !== 'all');
    }, [appliedFilters]);

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

            const loadedEntities: Entity[] = projectData.entities.map((entityMeta: any) => ({
                ...entityMeta,
                detailedRooms: entityMeta.detailedRooms || [],
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
            
            setAllEntities(entities);

            if (landingPageEntityId) {
                const landingEntity = entities.find(e => e.id === landingPageEntityId);
                if (landingEntity && landingEntity.defaultViewId) {
                    const defaultView = findViewInEntities(entities, landingEntity.defaultViewId);
                    setCurrentView(defaultView);
                    if (defaultView) setCurrentViewType(defaultView.type);
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
             setAllEntities([]);
             setEntityViews([]);
        }
    }, [projectId, loadDataFromStorage]);
    
    const closeDetails = useCallback(() => {
        setClickedSelection(null);
        setClickedEntity(null);
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

             if (selection.details.makeAsEntity && selection.details.title) {
                const { entities } = loadDataFromStorage();
                const entityId = selection.details.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const targetEntity = entities.find((e: Entity) => e.id === entityId);
                setClickedEntity(targetEntity || null);
            } else {
                setClickedEntity(null);
            }


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
                setCurrentViewType(newView.type);
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
            setCurrentViewType(previousView.type);
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
        setCurrentViewType(newFullView.type);
        setCurrentView(newFullView);
        closeDetails();
        setHoveredSelectionId(null);
        setRenderedImageRect(null);
        setTimeout(calculateRect, 0);
    };

    const views2d = useMemo(() => entityViews.filter(v => v.type === '2d'), [entityViews]);
    const views360 = useMemo(() => entityViews.filter(v => v.type === '360'), [entityViews]);

    const entityMatchesFilters = useCallback((entity: Entity, filters: Filters): boolean => {
        if (entity.entityType !== 'Apartment' && entity.entityType !== 'house') {
            return false;
        }

        const { minPrice, maxPrice, minArea, maxArea, availability, minRooms, maxRooms } = filters;

        const pricePass = 
            (minPrice === undefined || minPrice === '' || (entity.price && entity.price >= Number(minPrice))) &&
            (maxPrice === undefined || maxPrice === '' || (entity.price && entity.price <= Number(maxPrice)));

        const areaPass =
            (minArea === undefined || minArea === '' || (entity.houseArea && entity.houseArea >= Number(minArea))) &&
            (maxArea === undefined || maxArea === '' || (entity.houseArea && entity.houseArea <= Number(maxArea)));
        
        const availabilityPass =
            (availability === 'all' || availability === undefined || (entity.status && entity.status === availability));

        const roomsPass =
            (minRooms === undefined || minRooms === '' || (entity.rooms && entity.rooms >= Number(minRooms))) &&
            (maxRooms === undefined || maxRooms === '' || (entity.rooms && entity.rooms <= Number(maxRooms)));

        return pricePass && areaPass && availabilityPass && roomsPass;
    }, []);

    const getMatchingDescendantCount = useCallback((entityId: string, filters: Filters, allEntities: Entity[]): number => {
        let count = 0;
        const children = allEntities.filter(e => e.parentId === entityId);
    
        for (const child of children) {
            if (entityMatchesFilters(child, filters)) {
                count++;
            }
            count += getMatchingDescendantCount(child.id, filters, allEntities);
        }
    
        return count;
    }, [entityMatchesFilters]);

    const filteredSelections = useMemo(() => {
        if (!currentView?.selections) return [];

        const selectionsWithDetails = currentView.selections.filter(s => s.details?.makeAsEntity && s.details.title);
        
        if (!isFilterApplied) {
            return [];
        }
        
        return selectionsWithDetails
            .map(selection => {
                const entityId = selection.details!.title!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const entity = allEntities.find(e => e.id === entityId);
                
                if (!entity) return null;

                let totalMatches = 0;
                if (entity.entityType === 'Apartment' || entity.entityType === 'house') {
                    if (entityMatchesFilters(entity, appliedFilters)) {
                        totalMatches = 1;
                    }
                }
                
                const descendantMatches = getMatchingDescendantCount(entity.id, appliedFilters, allEntities);
                totalMatches += descendantMatches;
                
                if (totalMatches > 0) {
                    return { selection, matchCount: totalMatches };
                }

                return null;
            })
            .filter((item): item is { selection: Polygon; matchCount: number } => item !== null);
    }, [currentView?.selections, isFilterApplied, appliedFilters, allEntities, entityMatchesFilters, getMatchingDescendantCount]);

    const handleApplyFilters = (filters: Filters) => {
        setAppliedFilters(filters);
        setIsFilterOpen(false);
    };

    const handleResetFilters = () => {
        setAppliedFilters({});
        setIsFilterOpen(false);
    };

    const toggleViewType = () => {
         if (!currentView || !currentView.entityId) return;

        const otherViewType = currentViewType === '2d' ? '360' : '2d';
        const targetView = entityViews.find(view => view.type === otherViewType);

        if (targetView) handleViewSelect(targetView);
    };

    if (!isLoaded) {
        return <div className="h-full w-full flex items-center justify-center bg-neutral-900"><p className="text-muted-foreground animate-pulse">Loading View...</p></div>;
    }

    if (!projectId || !currentView || !currentView.imageUrl) {
        return <div className="h-full w-full flex items-center justify-center bg-muted"><p className="text-muted-foreground">No interactive view has been configured for the landing page.</p></div>;
    }
    
    return (
 <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden" onClick={closeDetails}>
 {entityViews.some(view => view.type === '2d') && entityViews.some(view => view.type === '360') && (
 <div className="absolute top-4 right-4 z-50 flex items-center bg-black/50 text-white rounded-full p-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleViewType(); }}>
 <span className={cn("px-3 py-1 text-sm font-medium flex items-center gap-1", currentViewType === '2d' && "bg-white text-black rounded-full")}>
 2D image
 </span>
 <div className="w-px h-4 bg-white mx-1"></div>
 <span className={cn("px-3 py-1 text-sm font-medium flex items-center gap-1", currentViewType === '360' && "bg-white text-black rounded-full")}>
 360 Image
 </span>
 </div>
 )}

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
                    {isFilterOpen ? <X size={20} /> : <SlidersHorizontal size={20} />}
                </Button>
                {viewHistory.length > 0 && (
                     <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/50 hover:bg-black/75 text-white rounded-full" onClick={handleBack} aria-label="Go back to previous view">
                        <ArrowLeft size={20} />
                    </Button>
                )}
            </div>

            {currentViewType == '2d' ?
                <Image ref={imageRef} src={currentView.imageUrl} alt={currentView.name} layout="fill" objectFit="contain" onLoad={calculateRect} key={currentView.id} className="transition-opacity duration-500" style={{ opacity: renderedImageRect ? 1 : 0 }} />
                :
                <ReactPhotoSphereViewer
                  src={currentView.imageUrl} // Path to your 360 image
                  alt={currentView.name}
                  width="100%"
                  height="100%"
                />
            }
            
            {/* Overlay for 2D view interactions */}
            {currentViewType === '2d' && renderedImageRect && (
                <svg className="absolute top-0 left-0 w-full h-full z-10" style={{ transform: `translate(${renderedImageRect.x}px, ${renderedImageRect.y}px)`, width: renderedImageRect.width, height: renderedImageRect.height }}>
                    {(isFilterApplied ? filteredSelections.map(f => f.selection) : (currentView.selections || [])).map(selection => {
                         const match = isFilterApplied ? filteredSelections.find(f => f.selection.id === selection.id) : null;
                         const matchCount = match ? match.matchCount : 0;

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

                        const isClicked = clickedSelection?.id === selection.id;
                        const isHovered = hoveredSelectionId === selection.id;
                        const isHighlighted = isFilterApplied && matchCount > 0;
                        const hasDetails = !!selection.details?.title;

                        if (!hasDetails) return null;

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
                                        isClicked
                                            ? "stroke-yellow-400 fill-yellow-400/50"
                                            : isHovered
                                                ? "stroke-yellow-500 fill-yellow-400/20"
                                                : isHighlighted
                                                    ? "stroke-yellow-500 fill-yellow-400/20"
                                                    : "stroke-transparent fill-transparent"
                                    )}
                                />
                                {!isClicked && !isHovered && !isFilterApplied && (
                                    <foreignObject x={centerX - 16} y={centerY - 16} width="32" height="32" className="pointer-events-none">
                                        <div className="bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm">
                                            <Info className="h-5 w-5 text-white" />
                                        </div>
                                    </foreignObject>
                                )}
                                {isFilterApplied && matchCount > 0 && (
                                    <g transform={`translate(${centerX}, ${centerY})`} className="pointer-events-none">
                                        <circle r="16" fill="rgba(250, 204, 21, 0.9)" stroke="white" strokeWidth="1.5" />
                                        <text
                                            textAnchor="middle"
                                            dy=".3em"
                                            fill="black"
                                            fontSize="14"
                                            fontWeight="bold"
                                        >
                                            {matchCount}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}

            {/* Details card */}
            {clickedSelection?.details && (
                <div style={detailsPosition} className="z-30 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <Card className="pointer-events-auto bg-black/80 backdrop-blur-md text-white border-none w-auto max-w-2xl shadow-2xl animate-in fade-in-50 rounded-2xl">
                        
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 shrink-0 text-neutral-400 hover:text-white z-10" onClick={closeDetails}>
                            <X className="h-5 w-5" />
                        </Button>
                        
                        {clickedEntity && (clickedEntity.entityType === 'Apartment' || clickedEntity.entityType === 'house') ? (
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4 p-1">
                                    <div className="flex-1">
                                        <h3 className="text-4xl font-light text-white leading-none">{clickedEntity.name}</h3>
                                    </div>
                                    <div className="flex gap-x-4 text-left">
                                        <div>
                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Plot, M²</p>
                                            <p className="text-xl font-light text-white mt-1">{clickedEntity.plotArea ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">House, M²</p>
                                            <p className="text-xl font-light text-white mt-1">{clickedEntity.houseArea ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Price, EUR</p>
                                                {clickedEntity.status === 'sold' ? (
                                                <div className="mt-1 text-xs font-semibold uppercase bg-neutral-600 text-neutral-200 px-2 py-1 rounded-md inline-block">SOLD</div>
                                            ) : (
                                                <p className="text-xl font-light text-white mt-1">{clickedEntity.price ? `€${clickedEntity.price.toLocaleString()}` : 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {(clickedEntity.detailedRooms && clickedEntity.detailedRooms.length > 0 || clickedEntity.availableDate) && (
                                    <>
                                        <hr className="border-neutral-700 my-3" />

                                        <div className="grid grid-cols-4 gap-x-4 p-1">
                                        <div className="text-left">
                                                <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Date</p>
                                                <p className="text-xl font-light text-white mt-1">{clickedEntity.availableDate ?? '—'}</p>
                                            </div>

                                            {clickedEntity.detailedRooms?.map(room => (
                                                <div key={room.id} className="text-left">
                                                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider truncate">{room.name}</p>
                                                    <p className="text-xl font-light text-white mt-1">{room.size} m²</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-center items-center mt-5 gap-4">
                                    {clickedEntity && (clickedEntity.entityType === 'Apartment' || clickedEntity.entityType === 'house') && (
                                        <Button 
                                            className="bg-white/90 hover:bg-white text-black rounded-full px-5 h-9 text-[11px] font-semibold tracking-wide disabled:bg-neutral-600 disabled:text-neutral-200"
                                            onClick={() => setActiveView('contact')} 
                                            disabled={clickedEntity.status === 'sold'}>
                                            {clickedEntity.status === 'sold' ? 'SOLD' : 'BOOK A CALL'}
                                        </Button>
                                    )}

                                    {clickedSelection.details.makeAsEntity && clickedSelection.details.title && (
                                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full px-5 h-9 text-[11px] font-semibold" onClick={() => handleNavigate(clickedSelection.details!.title)}>
                                            NAVIGATE TO
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        ) : (
                             <CardContent className="p-6 max-w-sm">
                                <CardTitle className="text-xl font-semibold mb-2">{clickedSelection.details.title}</CardTitle>
                                {clickedSelection.details.description && (
                                    <p className="text-neutral-300 mt-2 text-sm mb-4">{clickedSelection.details.description}</p>
                                )}
                                
                                {(clickedSelection.details.width || clickedSelection.details.height || clickedSelection.details.area) && (
                                    <>
                                        <div className="border-t border-neutral-700 my-4" />
                                        <div className="space-y-2 text-sm">
                                            <h4 className="text-sm font-semibold text-neutral-400 mb-2">Dimensions</h4>
                                            {clickedSelection.details.width && clickedSelection.details.height && (
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-400">W x H: </span>
                                                    <span>{clickedSelection.details.width}m x {clickedSelection.details.height}m</span>
                                                </div>
                                            )}
                                            {clickedSelection.details.area && (
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-400">Area: </span>
                                                    <span>{clickedSelection.details.area} m²</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                
                                {clickedSelection.details.makeAsEntity && clickedSelection.details.title && (
                                    <Button className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => handleNavigate(clickedSelection.details!.title)}>
                                        <NavigationIcon className="mr-2 h-4 w-4" />
                                        Navigate to
                                    </Button>
                                )}
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
            
            {/* Views list sidebar */}
            {entityViews.length > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 h-auto max-h-[calc(100%-8rem)] w-48 z-30 hidden lg:block">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto space-y-2">
                            {views2d.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="px-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">2D View</h4>
                                    {views2d.map(view => (
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
                            )}

                            {views2d.length > 0 && views360.length > 0 && (
                                <div className="py-2">
                                    <div className="w-full border-t border-neutral-700" />
                                </div>
                            )}

                            {views360.length > 0 && (
                                <div className="space-y-2">
                                     <h4 className="px-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">3D Panoramic View</h4>
                                     {views360.map(view => (
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
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(filteredSelections.length > 0 || !isFilterApplied) && (
                 <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                    <div className="pointer-events-auto overflow-x-auto pb-2 -mb-2 flex justify-center">
                        <div className="flex gap-4 w-max">
                            {(!isFilterApplied ? currentView.selections?.filter(s => s.details?.title) || [] : filteredSelections.map(f => f.selection)).map((selection) => (
                                <Card
                                    key={selection.id}
                                    className={cn(
                                        "w-56 bg-black/70 backdrop-blur-sm text-white border-neutral-700 transition-colors shrink-0",
                                        "cursor-pointer hover:border-yellow-500",
                                        (hoveredSelectionId === selection.id || clickedSelection?.id === selection.id) && "border-yellow-500",
                                        isFilterApplied && filteredSelections.some(f => f.selection.id === selection.id) && "border-yellow-500"
                                    )}
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
