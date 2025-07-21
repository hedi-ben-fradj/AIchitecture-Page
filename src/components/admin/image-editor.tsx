
'use client';

import { useState, useRef, type MouseEvent, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckSquare, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import SelectionDetailsModal from './selection-details-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EntityType, View } from '@/contexts/views-context';
import { useProjectData } from '@/contexts/views-context';
import Magnifier from './magnifier';

interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: number;
  points: Point[]; // Will be relative (0-1) when passed as props, but absolute internally.
  details?: {
    title: string;
    description?: string;
    defineSize?: boolean;
    width?: number;
    height?: number;
    area?: number;
    makeAsEntity?: boolean;
    entityType?: EntityType;
    linkedEntityId?: string;
  };
}

export interface Hotspot {
  id: number;
  x: number;
  y: number;
  linkedViewId: string;
  rotation?: number; // Field of view rotation in degrees
  fov?: number; // Field of view angle in degrees
}

interface DragInfo {
  type: 'polygon' | 'vertex' | 'hotspot' | 'hotspot-rotation';
  polygonId?: number;
  hotspotId?: number;
  vertexIndex?: number;
  offset: Point;
  initialPoints?: Point[];
  startAngle?: number;
  hotspotStartRotation?: number;
}

interface ImageEditorProps {
    imageUrl: string;
    onMakeEntity?: (entityName: string, entityType: EntityType) => Promise<string | null>;
    initialPolygons?: Polygon[];
    initialHotspots?: Hotspot[];
    parentEntityType?: EntityType;
    entityId?: string;
    onEditHotspot: (hotspot: Hotspot) => void;
    onPolygonsChange?: (polygons: Polygon[]) => void;
    onHotspotsChange?: (hotspots: Hotspot[]) => void;
}

export interface ImageEditorRef {
  getRelativePolygons: () => Polygon[];
  getRelativeHotspots: () => Hotspot[];
  updateHotspot: (hotspot: Hotspot) => void;
}

export interface RenderedImageRect {
    x: number;
    y: number;
    width: number;
    height: number;
}


function distToSegmentSquared(p: Point, v: Point, w: Point): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projectionX = v.x + t * (w.x - v.x);
    const projectionY = v.y + t * (w.y - v.y);
    return (p.x - projectionX) ** 2 + (p.y - projectionY) ** 2;
}

const ImageEditor = forwardRef<ImageEditorRef, ImageEditorProps>(
  ({ imageUrl, onMakeEntity, initialPolygons = [], initialHotspots = [], parentEntityType, entityId, onEditHotspot, onPolygonsChange, onHotspotsChange }, ref) => {
  const { getView, getEntity } = useProjectData();
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  
  const [magnifierPosition, setMagnifierPosition] = useState<{ x: number; y: number } | null>(null);
  const [renderedImageRect, setRenderedImageRect] = useState<RenderedImageRect | null>(null);
  
  const initialPolygonsKey = useMemo(() => JSON.stringify(initialPolygons), [initialPolygons]);
  const initialHotspotsKey = useMemo(() => JSON.stringify(initialHotspots), [initialHotspots]);
  
  const getRelativePolygonsFromAbsolute = useCallback((absolutePolygons: Polygon[]): Polygon[] => {
    if (!svgRef.current || !renderedImageRect) return [];
    const { width, height, x, y } = renderedImageRect;
    if (width === 0 || height === 0) return [];
    return absolutePolygons.map(poly => ({
        ...poly,
        points: poly.points.map(p => ({ x: (p.x - x) / width, y: (p.y - y) / height })),
    }));
  }, [renderedImageRect]);

  const getRelativeHotspotsFromAbsolute = useCallback((absoluteHotspots: Hotspot[]): Hotspot[] => {
      if (!svgRef.current || !renderedImageRect) return [];
      const { width, height, x, y } = renderedImageRect;
      if (width === 0 || height === 0) return [];
      return absoluteHotspots.map(spot => ({
          ...spot,
          x: (spot.x - x) / width,
          y: (spot.y - y) / height,
      }));
  }, [renderedImageRect]);

  const calculateRect = useCallback(() => {
    if (!imageRef.current || !svgRef.current) return;
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    if (naturalWidth === 0 || naturalHeight === 0) return;

    const { width: containerWidth, height: containerHeight } = svgRef.current.getBoundingClientRect();
    
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
    calculateRect();
    const currentImageRef = imageRef.current;
    if (currentImageRef) {
        currentImageRef.addEventListener('load', calculateRect);
        window.addEventListener('resize', calculateRect);
    }
    return () => {
        if (currentImageRef) {
            currentImageRef.removeEventListener('load', calculateRect);
            window.removeEventListener('resize', calculateRect);
        }
    };
  }, [calculateRect]);

  useEffect(() => {
    const currentInitialPolygons = JSON.parse(initialPolygonsKey) as Polygon[];
    const currentInitialHotspots = JSON.parse(initialHotspotsKey) as Hotspot[];
    
    if (renderedImageRect) {
        const { width, height, x, y } = renderedImageRect;
        const absolutePolygons = currentInitialPolygons.map(poly => ({
          ...poly,
          points: poly.points.map(p => ({ x: p.x * width + x, y: p.y * height + y })),
        }));
        const absoluteHotspots = currentInitialHotspots.map(spot => ({
          ...spot,
          x: spot.x * width + x,
          y: spot.y * height + y,
        }));
        setPolygons(absolutePolygons);
        setHotspots(absoluteHotspots);
    } else if (!imageUrl) {
      setPolygons([]);
      setHotspots([]);
    }
  }, [initialPolygonsKey, initialHotspotsKey, imageUrl, renderedImageRect]);

  useImperativeHandle(ref, () => ({
    getRelativePolygons: () => getRelativePolygonsFromAbsolute(polygons),
    getRelativeHotspots: () => getRelativeHotspotsFromAbsolute(hotspots),
    updateHotspot: (updatedHotspot: Hotspot) => {
        setHotspots(prevHotspots => {
            const newHotspots = prevHotspots.map(h => h.id === updatedHotspot.id ? { ...h, ...updatedHotspot} : h);
            onHotspotsChange?.(getRelativeHotspotsFromAbsolute(newHotspots));
            return newHotspots;
        });
    },
  }));

  const handleAddPolygon = () => {
    if (!svgRef.current || !renderedImageRect) return;
    const { width, height, x, y } = renderedImageRect;
    const newPolygon: Polygon = {
      id: Date.now(),
      points: [ { x: x + width * 0.2, y: y + height * 0.2 }, { x: x + width * 0.8, y: y + height * 0.2 }, { x: x + width * 0.8, y: y + height * 0.8 }, { x: x + width * 0.2, y: y + height * 0.8 } ],
    };
    const newPolygons = [...polygons, newPolygon];
    setPolygons(newPolygons);
    onPolygonsChange?.(getRelativePolygonsFromAbsolute(newPolygons));
    setSelectedPolygonId(newPolygon.id);
    setSelectedHotspotId(null);
  };
  
  const handleDeleteSelection = () => {
    if (!selectedPolygonId) return;
    const newPolygons = polygons.filter(p => p.id !== selectedPolygonId);
    setPolygons(newPolygons);
    onPolygonsChange?.(getRelativePolygonsFromAbsolute(newPolygons));
    setSelectedPolygonId(null);
  }

  const handleConfirmSelection = () => {
    if (!selectedPolygonId) return;
    setIsSelectionModalOpen(true);
  };
  
  const handleAddHotspot = () => {
    if (!svgRef.current || !renderedImageRect) return;
    const { width, height, x, y } = renderedImageRect;
    const newHotspot: Hotspot = {
      id: Date.now(),
      x: x + width * 0.5,
      y: y + height * 0.5,
      linkedViewId: '',
      rotation: 0,
      fov: 60,
    };
    const newHotspots = [...hotspots, newHotspot];
    setHotspots(newHotspots);
    onHotspotsChange?.(getRelativeHotspotsFromAbsolute(newHotspots));
    setSelectedHotspotId(newHotspot.id);
    setSelectedPolygonId(null);
  };

  const handleDeleteHotspot = () => {
    if (!selectedHotspotId) return;
    const newHotspots = hotspots.filter(h => h.id !== selectedHotspotId);
    setHotspots(newHotspots);
    onHotspotsChange?.(getRelativeHotspotsFromAbsolute(newHotspots));
    setSelectedHotspotId(null);
  };

  const handleConfirmHotspot = () => {
    const spot = hotspots.find(h => h.id === selectedHotspotId);
    if (spot) {
        // Convert to relative coordinates before passing to the modal
        const relativeHotspot = getRelativeHotspotsFromAbsolute([spot])[0];
        onEditHotspot(relativeHotspot);
    }
  };

  const handleSaveDetails = (data: Polygon['details']) => {
    if (!selectedPolygonId || !data) return;
    const newPolygons = polygons.map(p => p.id === selectedPolygonId ? { ...p, details: data } : p);
    setPolygons(newPolygons);
    onPolygonsChange?.(getRelativePolygonsFromAbsolute(newPolygons));
  };

  const getMousePosition = (e: MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
  };

  const handleMouseDownOnPolygon = (e: MouseEvent, polygonId: number) => {
    e.stopPropagation();
    setSelectedPolygonId(polygonId);
    setSelectedHotspotId(null);
    const mousePos = getMousePosition(e);
    const polygon = polygons.find(p => p.id === polygonId);
    if (!polygon) return;
    const offset = { x: mousePos.x - polygon.points[0].x, y: mousePos.y - polygon.points[0].y };
    setDragInfo({ type: 'polygon', polygonId, offset, initialPoints: polygon.points });
  };

  const handleMouseDownOnVertex = (e: MouseEvent, polygonId: number, vertexIndex: number) => {
    e.stopPropagation();
    setSelectedPolygonId(polygonId);
    setSelectedHotspotId(null);
    const mousePos = getMousePosition(e);
    const polygon = polygons.find(p => p.id === polygonId);
    if (!polygon) return;
    const point = polygon.points[vertexIndex];
    setDragInfo({ type: 'vertex', polygonId, vertexIndex, offset: { x: mousePos.x - point.x, y: mousePos.y - point.y }, initialPoints: polygon.points });
  };
  
  const handleMouseDownOnHotspot = (e: MouseEvent, hotspotId: number) => {
    e.stopPropagation();
    setSelectedHotspotId(hotspotId);
    setSelectedPolygonId(null);
    const mousePos = getMousePosition(e);
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (!hotspot) return;
    setDragInfo({ type: 'hotspot', hotspotId, offset: { x: mousePos.x - hotspot.x, y: mousePos.y - hotspot.y } });
  };

  const handleMouseDownOnRotationHandle = (e: MouseEvent, hotspotId: number) => {
    e.stopPropagation();
    const mousePos = getMousePosition(e);
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (!hotspot) return;

    const mouseAngle = Math.atan2(mousePos.y - hotspot.y, mousePos.x - hotspot.x) * (180 / Math.PI);
    
    setDragInfo({
        type: 'hotspot-rotation',
        hotspotId,
        offset: { x: 0, y: 0 },
        hotspotStartRotation: hotspot.rotation || 0,
        startAngle: mouseAngle
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    const mousePos = getMousePosition(e);

    if (renderedImageRect) {
        const { x, y, width, height } = renderedImageRect;
        if (mousePos.x < x || mousePos.x > x + width || mousePos.y < y || mousePos.y > y + height) {
            setMagnifierPosition(null);
        } else {
            setMagnifierPosition(mousePos);
        }
    } else {
         setMagnifierPosition(mousePos);
    }
    
    if (!dragInfo) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (dragInfo.type === 'hotspot') {
      setHotspots(spots => spots.map(s => s.id === dragInfo.hotspotId ? { ...s, x: mousePos.x - dragInfo.offset.x, y: mousePos.y - dragInfo.offset.y } : s));
    } else if (dragInfo.type === 'hotspot-rotation') {
        if (!dragInfo.hotspotId || dragInfo.startAngle === undefined || dragInfo.hotspotStartRotation === undefined) return;

        const hotspot = hotspots.find(h => h.id === dragInfo.hotspotId);
        if (!hotspot) return;

        const currentMouseAngle = Math.atan2(mousePos.y - hotspot.y, mousePos.x - hotspot.x) * (180 / Math.PI);
        const angleDelta = currentMouseAngle - dragInfo.startAngle;

        let newRotation = dragInfo.hotspotStartRotation + angleDelta;
        
        // Snap to 15 degree increments while holding shift
        if (e.shiftKey) {
            newRotation = Math.round(newRotation / 15) * 15;
        }

        setHotspots(spots => spots.map(s => 
            s.id === dragInfo.hotspotId 
                ? { ...s, rotation: newRotation } 
                : s
        ));
    } else {
      setPolygons(polys => polys.map(p => {
        if (p.id !== dragInfo.polygonId) return p;
        if (dragInfo.type === 'vertex' && dragInfo.vertexIndex !== undefined) {
          const newPoints = [...p.points];
          newPoints[dragInfo.vertexIndex] = { x: mousePos.x - dragInfo.offset.x, y: mousePos.y - dragInfo.offset.y };
          return { ...p, points: newPoints };
        } else if (dragInfo.type === 'polygon') {
          const firstPointOriginal = dragInfo.initialPoints![0];
          const dx = (mousePos.x - dragInfo.offset.x) - firstPointOriginal.x;
          const dy = (mousePos.y - dragInfo.offset.y) - firstPointOriginal.y;
          const newPoints = dragInfo.initialPoints!.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
          return { ...p, points: newPoints };
        }
        return p;
      }));
    }
  };

  const handleMouseUp = () => {
    if (dragInfo) {
      if (dragInfo.type === 'hotspot' || dragInfo.type === 'hotspot-rotation') {
        onHotspotsChange?.(getRelativeHotspotsFromAbsolute(hotspots));
      } else {
        onPolygonsChange?.(getRelativePolygonsFromAbsolute(polygons));
      }
    }
    setDragInfo(null);
  };
  
  const handleSvgMouseLeave = () => {
    setMagnifierPosition(null);
  };

  const handlePolygonDoubleClick = (e: MouseEvent, polygonId: number) => {
    e.preventDefault();
    const mousePos = getMousePosition(e);
    const thresholdSquared = 100;

    let newPolygons = [...polygons];
    const polyIndex = newPolygons.findIndex(p => p.id === polygonId);
    if (polyIndex === -1) return;

    const polygon = newPolygons[polyIndex];
    let closestEdgeIndex = -1;
    let minDistanceSquared = Infinity;

    for (let i = 0; i < polygon.points.length; i++) {
        const p1 = polygon.points[i];
        const p2 = polygon.points[(i + 1) % polygon.points.length];
        const distance = distToSegmentSquared(mousePos, p1, p2);
        if (distance < minDistanceSquared) {
            minDistanceSquared = distance;
            closestEdgeIndex = i;
        }
    }
    
    if (closestEdgeIndex !== -1 && minDistanceSquared < thresholdSquared) {
        const newPoints = [...polygon.points];
        newPoints.splice(closestEdgeIndex + 1, 0, mousePos);
        newPolygons[polyIndex] = { ...polygon, points: newPoints };
        setPolygons(newPolygons);
        onPolygonsChange?.(getRelativePolygonsFromAbsolute(newPolygons));
    }
  };
  
  const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);

  const findViewName = (viewId: string) => {
    if (!entityId) return 'Unknown View';
    const entity = getEntity(entityId);
    const view = entity?.views.find(v => v.id === viewId);
    return view?.name || 'Unknown View';
  }

  return (
    <TooltipProvider>
      <SelectionDetailsModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onSave={handleSaveDetails}
        selectionData={selectedPolygon}
        parentEntityType={parentEntityType}
        entityId={entityId}
        onMakeEntity={onMakeEntity}
      />
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex gap-2">
            <Button onClick={handleAddHotspot} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Eye className="mr-2 h-4 w-4" />
                New Hotspot
            </Button>
            <Button variant="outline" onClick={handleConfirmHotspot} disabled={!selectedHotspotId}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Hotspot
            </Button>
            <Button variant="destructive" onClick={handleDeleteHotspot} disabled={!selectedHotspotId}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </div>
        <div className="flex justify-end gap-2">
            <Button onClick={handleAddPolygon} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Plus className="mr-2 h-4 w-4" />
                New Selection
            </Button>
            <Button variant="outline" onClick={handleConfirmSelection} disabled={!selectedPolygonId} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckSquare className="mr-2 h-4 w-4" />
                Edit Details
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelection} disabled={!selectedPolygonId}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </div>
      </div>
      <div className="relative w-full max-w-5xl mx-auto">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-neutral-600" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <img ref={imageRef} src={imageUrl} alt="Editor background" className="absolute top-0 left-0 w-full h-full object-contain" />
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full z-10"
            onClick={() => { setSelectedPolygonId(null); setSelectedHotspotId(null); }}
            onMouseLeave={handleSvgMouseLeave}
          >
            
            {polygons.map(polygon => (
              <Tooltip key={polygon.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <g onClick={(e) => e.stopPropagation()}>
                    <polygon
                      points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                      className={cn( "stroke-2 cursor-move transition-colors", polygon.details ? "fill-green-600/40" : "fill-white/30", selectedPolygonId === polygon.id ? "stroke-yellow-500" : "stroke-blue-500 hover:stroke-yellow-400" )}
                      onMouseDown={(e) => handleMouseDownOnPolygon(e, polygon.id)}
                      onDoubleClick={(e) => handlePolygonDoubleClick(e, polygon.id)}
                    />
                    {polygon.points.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        className={cn( "stroke-white stroke-1 cursor-grab transition-colors", selectedPolygonId === polygon.id ? "fill-yellow-500" : "fill-blue-500" )}
                        onMouseDown={(e) => handleMouseDownOnVertex(e, polygon.id, index)}
                      />
                    ))}
                  </g>
                </TooltipTrigger>
                {polygon.details?.title && ( <TooltipContent className="bg-black text-white border-neutral-600"><p>{polygon.details.title}</p></TooltipContent> )}
              </Tooltip>
            ))}

            {hotspots.map(hotspot => {
                const rotation = hotspot.rotation || 0;
                const fov = hotspot.fov || 60;
                
                const innerRadius = 15;
                const outerRadius = 30;

                const rotationRad = rotation * (Math.PI / 180);
                const fovRad = fov * (Math.PI / 180);

                const startAngle = rotationRad - fovRad / 2;
                const endAngle = rotationRad + fovRad / 2;
                
                const p1_outer = {
                    x: outerRadius * Math.cos(startAngle),
                    y: outerRadius * Math.sin(startAngle)
                };
                const p2_outer = {
                    x: outerRadius * Math.cos(endAngle),
                    y: outerRadius * Math.sin(endAngle)
                };

                const p1_inner = {
                    x: innerRadius * Math.cos(startAngle),
                    y: innerRadius * Math.sin(startAngle)
                };
                const p2_inner = {
                    x: innerRadius * Math.cos(endAngle),
                    y: innerRadius * Math.sin(endAngle)
                };

                const largeArcFlag = fov > 180 ? 1 : 0;
                
                const pathData = [
                    `M ${p1_outer.x} ${p1_outer.y}`,
                    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2_outer.x} ${p2_outer.y}`,
                    `L ${p2_inner.x} ${p2_inner.y}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p1_inner.x} ${p1_inner.y}`,
                    'Z'
                ].join(' ');


                const handleRadius = outerRadius + 10;
                const rotationHandlePos = {
                    x: handleRadius * Math.cos(rotationRad),
                    y: handleRadius * Math.sin(rotationRad)
                };

                return (
                    <Tooltip key={hotspot.id} delayDuration={100}>
                        <TooltipTrigger asChild>
                            <g 
                                transform={`translate(${hotspot.x}, ${hotspot.y})`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <path
                                    d={pathData}
                                    className={cn("fill-opacity-30 stroke-opacity-50 transition-colors cursor-move", 
                                        selectedHotspotId === hotspot.id ? 'fill-yellow-400 stroke-yellow-400' : 'fill-blue-400 stroke-blue-400'
                                    )}
                                    strokeWidth="1"
                                    onMouseDown={(e) => handleMouseDownOnHotspot(e, hotspot.id)}
                                />
                                <g 
                                    onMouseDown={(e) => handleMouseDownOnHotspot(e, hotspot.id)}
                                    className="cursor-move"
                                >
                                    <Eye 
                                        className={cn("w-6 h-6 drop-shadow-lg transition-colors", selectedHotspotId === hotspot.id ? 'text-yellow-500' : 'text-blue-500')} 
                                        transform="translate(-12, -12)"
                                    />
                                </g>
                                {selectedHotspotId === hotspot.id && (
                                    <g className="cursor-alias">
                                        <line 
                                            x1={0} 
                                            y1={0} 
                                            x2={rotationHandlePos.x} 
                                            y2={rotationHandlePos.y} 
                                            className="stroke-yellow-400" 
                                            strokeWidth="1"
                                            strokeDasharray="3 3"
                                        />
                                        <circle
                                            cx={rotationHandlePos.x}
                                            cy={rotationHandlePos.y}
                                            r="6"
                                            className="fill-yellow-400 stroke-white stroke-2"
                                            onMouseDown={(e) => handleMouseDownOnRotationHandle(e, hotspot.id)}
                                        />
                                    </g>
                                )}
                            </g>
                        </TooltipTrigger>
                        {hotspot.linkedViewId && (
                            <TooltipContent className="bg-black text-white border-neutral-600">
                                <p>Links to: {findViewName(hotspot.linkedViewId)}</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                );
            })}

          </svg>
        </div>
        <Magnifier
          imageUrl={imageUrl}
          cursorPosition={dragInfo?.type === 'vertex' ? magnifierPosition : null}
          renderedImageRect={renderedImageRect}
          activePolygon={dragInfo?.type === 'vertex' ? selectedPolygon ?? null : null}
        />
      </div>
    </TooltipProvider>
  );
});

ImageEditor.displayName = "ImageEditor";
export default ImageEditor;
