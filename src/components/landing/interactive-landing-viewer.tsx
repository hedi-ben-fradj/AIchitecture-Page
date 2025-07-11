
'use client';

import { useState, useEffect, type MouseEvent, useRef, useCallback, useMemo, Fragment } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { Image as ImageIcon, Crop as CropIcon, Navigation as NavigationIcon, SlidersHorizontal, X, ArrowLeft, Info, Phone, Layers, Volume2, VolumeX, Maximize, Minimize, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import FilterSidebar, { type Filters } from './filter-sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';


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

export interface Hotspot {
  id: number;
  x: number;
  y: number;
  linkedViewId: string;
  rotation?: number;
  fov?: number;
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
    linkedEntityId?: string;
  };
}

export type EntityType = 'residential compound' | 'residential building' | 'Apartment' | 'Floor' | 'Room' | 'house';

export interface RoomDetail {
  id: string;
  name: string;
  size: number;
}
export interface Entity {
  id: string;
  projectId: string;
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
// Define types for View if not already imported from a central location
export interface View {
  id: string;
  name: string;
  imageUrl?: string;
  type: string;
  selections?: Polygon[];
  hotspots?: Hotspot[];
}

const getHotspotMarkerHtml = (text: string) => `
  <div style="text-align: center; color: white; font-family: sans-serif; font-size: 14px; text-shadow: 0 0 5px black;">
    <img src="/assets/orb.png" width="80" height="80" style="filter: drop-shadow(0 0 8px white); transition: filter 0.2s ease-in-out; margin-bottom: 5px;" />
    <p style="margin: 0; padding: 2px 8px; background-color: rgba(0,0,0,0.6); border-radius: 4px; display: inline-block;">${text}</p>
  </div>
`;

function InteractiveViewerSkeleton() {
    return (
        <div className="h-full w-full flex items-center justify-center bg-neutral-900">
            <div className="flex flex-col items-center gap-4 text-neutral-500">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p>Loading Interactive View...</p>
            </div>
        </div>
    );
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
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<Partial<Filters>>({});
    const [projectId, setProjectId] = useState<string | null>(null);
    const [detailsPosition, setDetailsPosition] = useState<React.CSSProperties>({ opacity: 0 });
    const [currentViewType, setCurrentViewType] = useState<string>('2d');
    const [viewTypes, setViewTypes] = useState<string[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlanOverlayVisible, setIsPlanOverlayVisible] = useState(false);
    const [planOverlayView, setPlanOverlayView] = useState<View | null>(null);
    const [isPlanExpanded, setIsPlanExpanded] = useState(false);
    const [planOverlayImageRect, setPlanOverlayImageRect] = useState<RenderedImageRect | null>(null);
    const [volume, setVolume] = useState(0.5);


    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const prevEntityIdRef = useRef<string | null>(null);
    const planOverlayContainerRef = useRef<HTMLDivElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const isFilterApplied = useMemo(() => {
        return Object.values(appliedFilters).some(val => val !== '' && val !== undefined && val !== 'all');
    }, [appliedFilters]);

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
        const loadInitialData = async () => {
            try {
                const globalsDoc = await getDoc(doc(db, 'globals', 'config'));
                const landingProjectId = globalsDoc.exists() ? globalsDoc.data().landingProjectId : null;
                
                if (!landingProjectId) {
                    console.warn("No landing project is configured.");
                    setIsLoaded(true);
                    return;
                }
                setProjectId(landingProjectId);

                const viewTypesDoc = await getDoc(doc(db, 'app_config', 'view_types'));
                if (viewTypesDoc.exists()) {
                    setViewTypes(viewTypesDoc.data().types);
                }

                const projectDoc = await getDoc(doc(db, 'projects', landingProjectId));
                if (!projectDoc.exists()) {
                    console.warn(`Landing project with ID "${landingProjectId}" not found.`);
                    setIsLoaded(true);
                    return;
                }
                const projectData = projectDoc.data();
                const landingPageEntityId = projectData.landingPageEntityId;

                const entitiesSnapshot = await getDocs(query(collection(db, 'entities'), where('projectId', '==', landingProjectId)));
                const loadedEntities = entitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Entity[];
                setAllEntities(loadedEntities);

                if (landingPageEntityId) {
                    const landingEntity = loadedEntities.find(e => e.id === landingPageEntityId);
                    if (landingEntity && landingEntity.defaultViewId) {
                        const defaultView = findViewInEntities(loadedEntities, landingEntity.defaultViewId);
                        setCurrentView(defaultView);
                        if (defaultView) {
                             setCurrentViewType(defaultView.type);
                             setIsImageLoading(true);
                        }
                        setEntityViews(landingEntity.views);
                    }
                }
            } catch (error) {
                console.error("Failed to load initial data from Firestore:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadInitialData();
    }, []);
    
    useEffect(() => {
        const currentEntityId = currentView?.entityId || null;
        setIsPlanExpanded(false); 

        if (currentEntityId && currentEntityId !== prevEntityIdRef.current) {
            const has2dPlan = entityViews.some(view => view.type.toLowerCase() === '2d plan');
            
            if (has2dPlan) {
                const twoDPlanView = entityViews.find(view => view.type.toLowerCase() === '2d plan');
                setPlanOverlayView(twoDPlanView || null);
                setIsPlanOverlayVisible(true);
            } else {
                setIsPlanOverlayVisible(false);
                setPlanOverlayView(null);
            }
        }
        prevEntityIdRef.current = currentEntityId;
    }, [currentView, entityViews]);

    const closeDetails = useCallback(() => {
        setClickedSelection(null);
        setClickedEntity(null);
        setDetailsPosition({ opacity: 0 });
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
        setIsImageLoading(false);
    }, []);

    const calculatePlanOverlayRect = useCallback(() => {
        const imageElement = planOverlayContainerRef.current?.querySelector('img');
        const containerElement = planOverlayContainerRef.current;
    
        if (!imageElement || !containerElement) {
            setPlanOverlayImageRect(null);
            return;
        }
    
        const { naturalWidth, naturalHeight } = imageElement;
        if (naturalWidth === 0 || naturalHeight === 0) {
            setPlanOverlayImageRect(null);
            return;
        }
    
        const { width: containerWidth, height: containerHeight } = containerElement.getBoundingClientRect();
        
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
        
        setPlanOverlayImageRect({ width: renderWidth, height: renderHeight, x, y });
    }, []);
    
    useEffect(() => {
        if (!isPlanOverlayVisible) {
            setPlanOverlayImageRect(null);
            return;
        }
    
        const container = planOverlayContainerRef.current;
        if (!container) return;
    
        const resizeObserver = new ResizeObserver(calculatePlanOverlayRect);
        resizeObserver.observe(container);
    
        const imageElement = container.querySelector('img');
        if (imageElement) {
            if (imageElement.complete) {
                calculatePlanOverlayRect();
            } else {
                imageElement.addEventListener('load', calculatePlanOverlayRect);
            }
        }
    
        calculatePlanOverlayRect(); 
    
        return () => {
            resizeObserver.disconnect();
            if (imageElement) {
                imageElement.removeEventListener('load', calculatePlanOverlayRect);
            }
        };
    }, [isPlanOverlayVisible, isPlanExpanded, calculatePlanOverlayRect]);

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
    
    const handleHotspotNavigate = useCallback((viewId: string) => {
        if (!viewId) return;
        const newView = findViewInEntities(allEntities, viewId);
        
        if (newView) {
            if (currentView) {
                setViewHistory(prev => [...prev, currentView.id]);
            }
            setCurrentViewType(newView.type);
            setCurrentView(newView);
            setIsImageLoading(true);
            const parentEntity = allEntities.find(e => e.id === newView.entityId);
            if (parentEntity) {
                setEntityViews(parentEntity.views);
            }
            closeDetails();
            setHoveredSelectionId(null);
            setRenderedImageRect(null);
            setTimeout(calculateRect, 0);
        } else {
             console.warn(`Could not find the view with ID "${viewId}".`);
             closeDetails();
        }
    }, [allEntities, currentView, closeDetails, calculateRect]);

    useEffect(() => {
        let viewer: Viewer | null = null;
        if (currentViewType === '360' && currentView?.imageUrl && viewerContainerRef.current) {
            const panoramaUrl = `/api/image-proxy?url=${encodeURIComponent(currentView.imageUrl)}`;
             viewer = new Viewer({
                container: viewerContainerRef.current,
                panorama: panoramaUrl,
                caption: currentView.name,
                loadingImg: '/assets/orb.png',
                loadingTxt: 'Loading panorama...',
                touchmoveTwoFingers: true,
                navbar: ['zoom', 'move', 'caption', 'fullscreen'],
                plugins: [[MarkersPlugin, {}]],
            });

            const markersPlugin = viewer.getPlugin(MarkersPlugin);
            if (markersPlugin) {
                const findViewName = (h: Hotspot) => {
                    if (!h.linkedViewId) return 'Unlinked Hotspot';
                    for (const entity of allEntities) {
                        const foundView = entity.views.find(v => v.id === h.linkedViewId);
                        if (foundView) return foundView.name;
                    }
                    return 'Link';
                };

                const initialMarkers = (currentView.hotspots || []).map(hotspot => {
                    const tooltipText = findViewName(hotspot);
                    return {
                        id: String(hotspot.id),
                        position: {
                            yaw: (hotspot.x - 0.5) * 2 * Math.PI,
                            pitch: (hotspot.y - 0.5) * -Math.PI
                        },
                        html: getHotspotMarkerHtml(tooltipText),
                        size: { width: 80, height: 110 },
                        anchor: 'center center',
                        tooltip: null,
                        data: { linkedViewId: hotspot.linkedViewId },
                    };
                });
                markersPlugin.setMarkers(initialMarkers);

                markersPlugin.addEventListener('select-marker', (e) => {
                    if (e.marker.data?.linkedViewId) {
                        handleHotspotNavigate(e.marker.data.linkedViewId);
                    }
                });
            }
        }

        return () => {
            viewer?.destroy();
        };
    }, [currentView, currentViewType, allEntities, handleHotspotNavigate]);
    
    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
            if (newVolume > 0 && isMuted) {
                setIsMuted(false);
            } else if (newVolume === 0 && !isMuted) {
                setIsMuted(true);
            }
        }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            if (currentViewType === '360') {
                audio.volume = volume;
            } else {
                audio.pause();
            }
        }
    }, [currentViewType, volume]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted]);


    const handleSelectionClick = (e: MouseEvent, selection: Polygon) => {
        e.stopPropagation();
        if (selection.details) {
            setClickedSelection(selection);

            if (selection.details.makeAsEntity && selection.details.linkedEntityId) {
                const targetEntity = allEntities.find(e => e.id === selection.details!.linkedEntityId);
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
                    position.right = `${containerWidth - selectionLeftEdge + 16}px`;
                } else {
                    position.left = `${selectionRightEdge + 16}px`;
                }
                setDetailsPosition(position);
            }
        }
    };

    const handleNavigate = (entityId: string) => {
        const targetEntity = allEntities.find(e => e.id === entityId);
        
        if (targetEntity && targetEntity.defaultViewId) {
            const newView = findViewInEntities(allEntities, targetEntity.defaultViewId);
            if (newView) {
                if (currentView) {
                    setViewHistory(prev => [...prev, currentView.id]);
                }
                setCurrentViewType(newView.type);
                setCurrentView(newView);
                setIsImageLoading(true);
                setEntityViews(targetEntity.views);
                closeDetails();
                setHoveredSelectionId(null);
                setRenderedImageRect(null);
                setTimeout(calculateRect, 0);
            } else {
                 alert(`The default view for entity "${targetEntity.name}" could not be found.`);
                 closeDetails();
            }
        } else {
            alert(`The entity with ID "${entityId}" or its default view could not be found.`);
            closeDetails();
        }
    };

    const handleBack = () => {
        if (viewHistory.length === 0) return;

        const previousViewId = viewHistory[viewHistory.length - 1];
        const previousView = findViewInEntities(allEntities, previousViewId);
        
        if (previousView) {
            setCurrentViewType(previousView.type);
            setCurrentView(previousView);
            setIsImageLoading(true);
            const parentEntity = allEntities.find(e => e.id === previousView.entityId);
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
        setIsImageLoading(true);
        closeDetails();
        setHoveredSelectionId(null);
        setRenderedImageRect(null);
        setTimeout(calculateRect, 0);
    };

    const groupedViews = useMemo(() => {
        if (!entityViews.length || !viewTypes.length) return {};

        const groups: { [key: string]: View[] } = {};

        viewTypes.forEach(type => {
            if (type.toLowerCase() === '2d plan') {
                return;
            }
            const viewsOfType = entityViews.filter(v => v.type === type);
            if (viewsOfType.length > 0) {
                groups[type] = viewsOfType;
            }
        });

        return groups;
    }, [entityViews, viewTypes]);

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
        if (!currentView?.selections || !currentView.entityId) return [];

        const selectionsWithDetails = currentView.selections.filter(s => s.details?.makeAsEntity && s.details.title);
        
        if (!isFilterApplied) {
            return [];
        }
        
        return selectionsWithDetails
            .map(selection => {
                const targetEntity = allEntities.find(e => e.parentId === currentView.entityId && e.name === selection.details?.title);
                
                if (!targetEntity) return null;

                let totalMatches = 0;
                if (entityMatchesFilters(targetEntity, appliedFilters)) {
                    totalMatches = 1;
                }
                
                const descendantMatches = getMatchingDescendantCount(targetEntity.id, appliedFilters, allEntities);
                totalMatches += descendantMatches;
                
                if (totalMatches > 0) {
                    return { selection, matchCount: totalMatches };
                }

                return null;
            })
            .filter((item): item is { selection: Polygon; matchCount: number } => item !== null);
    }, [currentView?.selections, currentView?.entityId, isFilterApplied, appliedFilters, allEntities, entityMatchesFilters, getMatchingDescendantCount]);

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

        let targetView;
        if (currentViewType === '360') {
            targetView = entityViews.find(view => view.type.toLowerCase() === '2d') || entityViews.find(view => view.type !== '360');
        } else {
            targetView = entityViews.find(view => view.type === '360');
        }

        if (targetView) handleViewSelect(targetView);
    };
    
    const togglePlanOverlay = () => {
        if (isPlanOverlayVisible) {
            setIsPlanOverlayVisible(false);
            setIsPlanExpanded(false);
            return;
        }

        const twoDPlanView = entityViews.find(view => view.type.toLowerCase() === '2d plan');
        if (twoDPlanView?.imageUrl) {
            setPlanOverlayView(twoDPlanView);
            setIsPlanOverlayVisible(true);
        } else {
            console.warn("Could not find a 2D plan image to display in the overlay.");
        }
    };


    if (!isLoaded) {
        return <InteractiveViewerSkeleton />;
    }

    if (!projectId || !currentView || !currentView.imageUrl) {
        return <div className="h-full w-full flex items-center justify-center bg-muted"><p className="text-muted-foreground">No interactive view has been configured for the landing page.</p></div>;
    }
    
    return (
 <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden" onClick={closeDetails}>
    <audio ref={audioRef} src="/assets/audio.mp3" loop />
 {entityViews.some(view => view.type === '360') && entityViews.some(view => view.type !== '360') && (
 <div className="absolute top-4 right-4 z-50 flex items-center bg-black/50 text-white rounded-full p-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleViewType(); }}>
 <span className={cn("px-3 py-1 text-sm font-medium flex items-center gap-1", currentViewType !== '360' && "bg-white text-black rounded-full")}>
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

            <div className="absolute bottom-20 left-4 z-50 flex flex-col gap-3">
                <TooltipProvider>
                    {currentViewType === '360' && (
                        <div className="relative group/volume-control">
                            <div className={cn(
                                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-4 pt-2 pb-2 bg-black/50 rounded-full backdrop-blur-sm",
                                "transition-opacity duration-300",
                                isMuted ? "opacity-0 pointer-events-none" : "opacity-100"
                            )}>
                                <Slider
                                    orientation="vertical"
                                    value={[volume]}
                                    max={1}
                                    step={0.05}
                                    onValueChange={handleVolumeChange}
                                    className="h-24"
                                />
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-12 w-12 bg-black/50 hover:bg-black/75 text-white rounded-full backdrop-blur-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const audio = audioRef.current;
                                            if (audio) {
                                                if(isMuted && audio.paused) {
                                                    audio.play().catch(error => console.warn("Audio play failed:", error));
                                                }
                                                setIsMuted(!isMuted);
                                            }
                                        }}
                                    >
                                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{isMuted ? 'Unmute' : 'Mute'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {entityViews.some(view => view.type.toLowerCase() === '2d plan') && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 bg-black/50 hover:bg-black/75 text-white rounded-full backdrop-blur-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlanOverlay();
                                    }}
                                >
                                    <Layers size={24} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>2D Plan</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </TooltipProvider>
            </div>
            
            {planOverlayView?.imageUrl && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "absolute z-40 transition-all duration-500 ease-in-out",
                        !isPlanExpanded && "bottom-20 left-20 w-96 aspect-video transform-origin-bottom-left",
                        isPlanExpanded && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] max-w-7xl max-h-[85vh]",
                        isPlanOverlayVisible
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-50 pointer-events-none"
                    )}
                >
                    <Card className="w-full h-full bg-black/80 backdrop-blur-md border-neutral-600 overflow-hidden shadow-2xl relative">
                        <CardContent className="p-4 w-full h-full relative" ref={planOverlayContainerRef}>
                            <Image
                                src={planOverlayView.imageUrl}
                                alt="2D Plan Overlay"
                                layout="fill"
                                objectFit="contain"
                                className="rounded-md"
                                key={planOverlayView.imageUrl}
                            />
                             {planOverlayImageRect && (planOverlayView.hotspots?.length ?? 0) > 0 && (
                                <svg
                                    className="absolute top-0 left-0 w-full h-full z-10"
                                    style={{
                                        transform: `translate(${planOverlayImageRect.x}px, ${planOverlayImageRect.y}px)`,
                                        width: planOverlayImageRect.width,
                                        height: planOverlayImageRect.height,
                                    }}
                                >
                                    {(planOverlayView.hotspots || []).map(hotspot => {
                                        const absX = hotspot.x * planOverlayImageRect.width;
                                        const absY = hotspot.y * planOverlayImageRect.height;
                                        
                                        const scaleFactor = isPlanExpanded ? 1.5 : 1;
                                        
                                        const rotation = hotspot.rotation || 0;
                                        const fov = hotspot.fov || 60;
                                        
                                        const innerRadius = 20 * scaleFactor;
                                        const outerRadius = 35 * scaleFactor;
                                        const eyeIconSize = 24 * scaleFactor;

                                        const rotationRad = rotation * (Math.PI / 180);
                                        const fovRad = fov * (Math.PI / 180);

                                        const startAngle = rotationRad - fovRad / 2;
                                        const endAngle = rotationRad + fovRad / 2;
                                        
                                        const p1_outer = { x: outerRadius * Math.cos(startAngle), y: outerRadius * Math.sin(startAngle) };
                                        const p2_outer = { x: outerRadius * Math.cos(endAngle), y: outerRadius * Math.sin(endAngle) };
                                        const p1_inner = { x: innerRadius * Math.cos(startAngle), y: innerRadius * Math.sin(startAngle) };
                                        const p2_inner = { x: innerRadius * Math.cos(endAngle), y: innerRadius * Math.sin(endAngle) };

                                        const largeArcFlag = fov > 180 ? 1 : 0;
                                        
                                        const pathData = [
                                            `M ${p1_outer.x} ${p1_outer.y}`,
                                            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2_outer.x} ${p2_outer.y}`,
                                            `L ${p2_inner.x} ${p2_inner.y}`,
                                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p1_inner.x} ${p1_inner.y}`,
                                            'Z'
                                        ].join(' ');

                                        return (
                                            <g 
                                                key={`plan-hotspot-${hotspot.id}`} 
                                                transform={`translate(${absX}, ${absY})`}
                                                className="group cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); handleHotspotNavigate(hotspot.linkedViewId); }}
                                            >
                                               <g className="pointer-events-none">
                                                    <path
                                                        d={pathData}
                                                        className="fill-blue-400/30 stroke-blue-400/50 group-hover:fill-yellow-400/40 group-hover:stroke-yellow-400/60 transition-colors"
                                                        strokeWidth="1"
                                                    />
                                                    <Eye 
                                                        className="drop-shadow-lg text-blue-500 group-hover:text-yellow-500 transition-colors"
                                                        style={{ width: eyeIconSize, height: eyeIconSize }} 
                                                        transform={`translate(-${eyeIconSize / 2}, -${eyeIconSize / 2})`}
                                                    />
                                                </g>
                                                <circle cx={0} cy={0} r={outerRadius} className="pointer-events-auto" fill="transparent" />
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}
                        </CardContent>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-10 w-10 text-white bg-black/25 hover:bg-black/50 rounded-full"
                            onClick={(e) => { e.stopPropagation(); setIsPlanExpanded(!isPlanExpanded); }}
                        >
                            {isPlanExpanded ? <Minimize size={20} /> : <Maximize size={20} />}
                            <span className="sr-only">{isPlanExpanded ? 'Minimize' : 'Expand'}</span>
                        </Button>
                    </Card>
                </div>
            )}


            {currentViewType === '360' ? (
                <div ref={viewerContainerRef} key={currentView.id} className="w-full h-full" />
            ) : (
                <>
                    {isImageLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                            <Loader2 className="h-10 w-10 animate-spin text-white" />
                        </div>
                    )}
                    <Image
                        ref={imageRef}
                        src={`/api/image-proxy?url=${encodeURIComponent(currentView.imageUrl)}`}
                        alt={currentView.name}
                        layout="fill"
                        objectFit="contain"
                        onLoad={() => {
                            calculateRect();
                            setIsImageLoading(false);
                        }}
                        key={currentView.id}
                        className={cn("transition-opacity duration-300", isImageLoading ? "opacity-0" : "opacity-100")}
                    />
                </>
            )}
            
            {currentViewType !== '360' && renderedImageRect && (
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

                        const entityForSelection = allEntities.find(e => e.id === selection.details?.linkedEntityId);
                        const isProperty = entityForSelection && (entityForSelection.entityType === 'Apartment' || entityForSelection.entityType === 'house');

                        const getHighlightClasses = () => {
                            const isInteractedWith = isClicked || isHovered || isHighlighted;
                            if (!isInteractedWith) {
                                return "stroke-transparent fill-transparent";
                            }
                        
                            if (isProperty) {
                                if (entityForSelection.status === 'available') {
                                    return 'stroke-green-400 fill-green-400/50';
                                }
                                if (entityForSelection.status === 'sold') {
                                     return 'stroke-orange-400 fill-orange-400/50';
                                }
                            }
                            
                            return 'stroke-yellow-400 fill-yellow-400/50';
                        };

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
                                    className={cn("stroke-2 transition-all", getHighlightClasses())}
                                />
                                {!isClicked && !isHovered && !isFilterApplied && (
                                    <foreignObject x={centerX - 16} y={centerY - 16} width="32" height="32" className="pointer-events-none">
                                        <div className="bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm">
                                            <Info className="h-5 w-5 text-white" />
                                        </div>
                                    </foreignObject>
                                )}
                                {isFilterApplied && matchCount > 0 && !isProperty && (
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

                    {(currentView.hotspots || []).map(hotspot => {
                        const absX = hotspot.x * renderedImageRect.width;
                        const absY = hotspot.y * renderedImageRect.height;
                        
                        const rotation = hotspot.rotation || 0;
                        const fov = hotspot.fov || 60;
                        
                        const innerRadius = 20;
                        const outerRadius = 35;

                        const rotationRad = rotation * (Math.PI / 180);
                        const fovRad = fov * (Math.PI / 180);

                        const startAngle = rotationRad - fovRad / 2;
                        const endAngle = rotationRad + fovRad / 2;
                        
                        const p1_outer = { x: outerRadius * Math.cos(startAngle), y: outerRadius * Math.sin(startAngle) };
                        const p2_outer = { x: outerRadius * Math.cos(endAngle), y: outerRadius * Math.sin(endAngle) };
                        const p1_inner = { x: innerRadius * Math.cos(startAngle), y: innerRadius * Math.sin(startAngle) };
                        const p2_inner = { x: innerRadius * Math.cos(endAngle), y: innerRadius * Math.sin(endAngle) };

                        const largeArcFlag = fov > 180 ? 1 : 0;
                        
                        const pathData = [
                            `M ${p1_outer.x} ${p1_outer.y}`,
                            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2_outer.x} ${p2_outer.y}`,
                            `L ${p2_inner.x} ${p2_inner.y}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p1_inner.x} ${p1_inner.y}`,
                            'Z'
                        ].join(' ');

                        return (
                            <g 
                                key={hotspot.id} 
                                transform={`translate(${absX}, ${absY})`}
                                className="group cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); handleHotspotNavigate(hotspot.linkedViewId); }}
                            >
                               <g className="pointer-events-none">
                                    <path
                                        d={pathData}
                                        className="fill-blue-400/30 stroke-blue-400/50 group-hover:fill-yellow-400/40 group-hover:stroke-yellow-400/60 transition-colors"
                                        strokeWidth="1"
                                    />
                                    <Eye 
                                        className="w-6 h-6 drop-shadow-lg text-blue-500 group-hover:text-yellow-500 transition-colors" 
                                        transform="translate(-12, -12)"
                                    />
                                </g>
                                <circle cx={0} cy={0} r={outerRadius} className="pointer-events-auto" fill="transparent" onClick={(e) => { e.stopPropagation(); handleHotspotNavigate(hotspot.linkedViewId); }} />
                            </g>
                        );
                    })}
                </svg>
            )}

            {clickedSelection?.details && (
                <div style={detailsPosition} className="z-30 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <Card className="pointer-events-auto bg-black/80 backdrop-blur-md text-white border-none w-auto max-w-2xl shadow-2xl animate-in fade-in-50 rounded-2xl">
                        
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 shrink-0 text-neutral-400 hover:text-white z-10" onClick={closeDetails}>
                            <X className="h-5 w-5" />
                        </Button>
                        
                        {clickedEntity && (clickedEntity.entityType === 'Apartment' || clickedEntity.entityType === 'house') ? (
                           <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4 p-1">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-light text-white leading-none">{clickedEntity.name}</h3>
                                    </div>
                                    <div className="flex gap-x-4 text-left">
                                        {clickedEntity.entityType === 'house' && (
                                            <div>
                                                <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Plot, M²</p>
                                                <p className="text-lg font-light text-white mt-1">{clickedEntity.plotArea ?? '—'}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">{clickedEntity.entityType === 'house' ? 'House, M²' : 'Area, M²'}</p>
                                            <p className="text-lg font-light text-white mt-1">{clickedEntity.houseArea ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Price, EUR</p>
                                                {clickedEntity.status === 'sold' ? (
                                                <div className="mt-1 text-xs font-semibold uppercase bg-neutral-600 text-neutral-200 px-2 py-1 rounded-md inline-block">SOLD</div>
                                            ) : (
                                                <p className="text-lg font-light text-white mt-1">{clickedEntity.price ? `€${clickedEntity.price.toLocaleString()}` : 'N/A'}</p>
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
                                                <p className="text-lg font-light text-white mt-1">{clickedEntity.availableDate ?? '—'}</p>
                                            </div>

                                            {clickedEntity.detailedRooms?.map(room => (
                                                <div key={room.id} className="text-left">
                                                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider truncate">{room.name}</p>
                                                    <p className="text-lg font-light text-white mt-1">{room.size} m²</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-end items-center mt-5 gap-4">
                                    {clickedEntity && (clickedEntity.entityType === 'Apartment' || clickedEntity.entityType === 'house') && (
                                        <Button 
                                            className="bg-white/90 hover:bg-white text-black rounded-full px-5 h-9 text-[11px] font-semibold tracking-wide disabled:bg-neutral-600 disabled:text-neutral-400"
                                            onClick={() => setActiveView('contact')} 
                                            disabled={clickedEntity.status === 'sold'}>
                                            {clickedEntity.status === 'sold' ? 'SOLD' : 'BOOK A CALL'}
                                        </Button>
                                    )}

                                    {clickedEntity && clickedSelection?.details?.makeAsEntity && (
                                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full px-5 h-9 text-[11px] font-semibold" onClick={() => handleNavigate(clickedEntity.id)}>
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
                                
                                {clickedEntity && clickedSelection?.details?.makeAsEntity && (
                                    <div className="flex justify-end mt-6">
                                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => handleNavigate(clickedEntity.id)}>
                                            <NavigationIcon className="mr-2 h-4 w-4" />
                                            Navigate to
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
            
            {Object.keys(groupedViews).length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 h-auto max-h-[calc(100%-8rem)] w-48 z-30 hidden lg:block">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto space-y-2">
                            {Object.entries(groupedViews).map(([type, views], index) => (
                                <Fragment key={type}>
                                    {index > 0 && (
                                        <div className="py-2">
                                            <div className="w-full border-t border-neutral-700" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <h4 className="px-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider capitalize">{type}</h4>
                                        {views.map(view => (
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
                                                        <Image src={`/api/image-proxy?url=${encodeURIComponent(view.imageUrl)}`} alt={view.name} layout="fill" objectFit="cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xs text-neutral-400 bg-neutral-800">No preview</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                                </div>
                                                <p className="text-xs text-white p-2 truncate font-medium bg-black/50">{view.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(filteredSelections.length > 0 || !isFilterApplied) && (
                 <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                    <div className="pointer-events-auto overflow-x-auto pb-2 -mb-2 flex justify-center">
                        <div className="flex gap-4 w-max">
                            {(!isFilterApplied ? currentView.selections?.filter(s => s.details?.title) || [] : filteredSelections.map(f => f.selection)).map((selection) => {
                                const entityForSelection = allEntities.find(e => e.id === selection.details?.linkedEntityId);
                                const isProperty = entityForSelection && (entityForSelection.entityType === 'Apartment' || entityForSelection.entityType === 'house');
                                
                                const isClicked = clickedSelection?.id === selection.id;
                                const isFiltered = isFilterApplied && filteredSelections.some(f => f.selection.id === selection.id);
                                const isHovered = hoveredSelectionId === selection.id;

                                const isHighlighted = isClicked || isFiltered;

                                let highlightClass = 'border-yellow-500';
                                let hoverClass = 'hover:border-yellow-500';

                                if (isProperty) {
                                    if (entityForSelection.status === 'available') {
                                        highlightClass = 'border-green-400';
                                        hoverClass = 'hover:border-green-400';
                                    } else if (entityForSelection.status === 'sold') {
                                        highlightClass = 'border-orange-400';
                                        hoverClass = 'hover:border-orange-400';
                                    }
                                }

                                return (
                                <Card
                                    key={selection.id}
                                    className={cn(
                                        "w-56 bg-black/70 backdrop-blur-sm text-white border-neutral-700 transition-colors shrink-0",
                                        "cursor-pointer",
                                        hoverClass,
                                        (isHighlighted || isHovered) && highlightClass
                                    )}
                                    onMouseEnter={() => setHoveredSelectionId(selection.id)}
                                    onMouseLeave={() => setHoveredSelectionId(null)}
                                    onClick={(e) => { e.stopPropagation(); handleSelectionClick(e, selection); }}
                                >
                                    <CardHeader className="p-4"><CardTitle className="text-base truncate">{selection.details?.title}</CardTitle></CardHeader>
                                    {(selection.details?.area || selection.details?.description) && 
                                        <CardContent className="p-4 pt-0">
                                            {selection.details.area && <p className="text-sm font-semibold">{selection.details.area} m²</p>}
                                            {selection.details.description && <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{selection.details.description}</p>}
                                        </CardContent>
                                    }
                                </Card>
                            )})}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
