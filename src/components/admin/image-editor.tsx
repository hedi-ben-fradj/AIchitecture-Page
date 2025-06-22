'use client';

import { useState, useRef, type MouseEvent, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import SelectionDetailsModal from './selection-details-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    width: number;
    height: number;
    makeAsView?: boolean;
  };
}

interface DragInfo {
  type: 'polygon' | 'vertex';
  polygonId: number;
  vertexIndex?: number;
  offset: Point;
  initialPoints: Point[];
}

interface ImageEditorProps {
    imageUrl: string;
    onMakeView?: (viewName: string) => void;
    initialPolygons?: Polygon[]; // These are expected to be in relative (0-1) format
}

export interface ImageEditorRef {
  getRelativePolygons: () => Polygon[];
}

// Helper function to calculate the squared distance from a point to a line segment
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
  ({ imageUrl, onMakeView, initialPolygons = [] }, ref) => {
  // `polygons` state is for internal use and stores coordinates in ABSOLUTE pixels for easier editing.
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [history, setHistory] = useState<Polygon[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // This effect converts incoming RELATIVE polygons into ABSOLUTE coordinates for editing.
  useEffect(() => {
    if (svgRef.current && imageUrl) {
      const { width, height } = svgRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) {
        const absolutePolygons = initialPolygons.map(poly => ({
          ...poly,
          points: poly.points.map(p => ({
            x: p.x * width,
            y: p.y * height,
          })),
        }));
        setPolygons(absolutePolygons);
        setHistory([absolutePolygons]);
        setHistoryIndex(0);
      }
    } else if (!imageUrl) {
      // Clear polygons if image is removed
      setPolygons([]);
      setHistory([[]]);
      setHistoryIndex(0);
    }
  }, [initialPolygons, imageUrl]);

  useImperativeHandle(ref, () => ({
    getRelativePolygons: () => {
      // On save, convert internal ABSOLUTE coordinates back to RELATIVE.
      if (!svgRef.current) return [];
      const { width, height } = svgRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) return []; // Avoid division by zero
      
      return polygons.map(poly => ({
        ...poly,
        points: poly.points.map(p => ({
          x: p.x / width,
          y: p.y / height
        }))
      }));
    },
  }));

  const saveToHistory = (newState: Polygon[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPolygons(history[newIndex]);
      setSelectedPolygonId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [history, historyIndex]);

  const handleAddPolygon = () => {
    if (!svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    // Create new polygons with absolute coordinates based on the editor size.
    const newPolygon: Polygon = {
      id: Date.now(),
      points: [
        { x: width * 0.2, y: height * 0.2 },
        { x: width * 0.8, y: height * 0.2 },
        { x: width * 0.8, y: height * 0.8 },
        { x: width * 0.2, y: height * 0.8 },
      ],
    };
    const newPolygons = [...polygons, newPolygon];
    setPolygons(newPolygons);
    saveToHistory(newPolygons);
    setSelectedPolygonId(newPolygon.id);
  };
  
  const handleDeleteSelection = () => {
    if (!selectedPolygonId) return;
    const newPolygons = polygons.filter(p => p.id !== selectedPolygonId);
    setPolygons(newPolygons);
    setSelectedPolygonId(null);
    saveToHistory(newPolygons);
  }

  const handleConfirmSelection = () => {
    if (!selectedPolygonId) return;
    setIsModalOpen(true);
  };

  const handleSaveDetails = (data: Polygon['details']) => {
    if (!selectedPolygonId || !data) return;

    if (data.makeAsView && data.title && onMakeView) {
        onMakeView(data.title);
    }

    const newPolygons = polygons.map(p => {
        if (p.id === selectedPolygonId) {
            return { ...p, details: data };
        }
        return p;
    });

    setPolygons(newPolygons);
    saveToHistory(newPolygons);
  };

  const getMousePosition = (e: MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  };

  const handleMouseDownOnPolygon = (e: MouseEvent, polygonId: number) => {
    setSelectedPolygonId(polygonId);
    const mousePos = getMousePosition(e);
    const polygon = polygons.find(p => p.id === polygonId);
    if (!polygon) return;
    
    const offset = {
        x: mousePos.x - polygon.points[0].x,
        y: mousePos.y - polygon.points[0].y,
    };
    setDragInfo({ type: 'polygon', polygonId, offset, initialPoints: polygon.points });
  };

  const handleMouseDownOnVertex = (e: MouseEvent, polygonId: number, vertexIndex: number) => {
    e.stopPropagation();
    setSelectedPolygonId(polygonId);
    const mousePos = getMousePosition(e);
    const polygon = polygons.find(p => p.id === polygonId);
    if (!polygon) return;
    const point = polygon.points[vertexIndex];
    setDragInfo({
      type: 'vertex',
      polygonId,
      vertexIndex,
      offset: { x: mousePos.x - point.x, y: mousePos.y - point.y },
      initialPoints: polygon.points,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragInfo) return;

    const mousePos = getMousePosition(e);

    setPolygons(polys =>
      polys.map(p => {
        if (p.id !== dragInfo.polygonId) return p;

        if (dragInfo.type === 'vertex' && dragInfo.vertexIndex !== undefined) {
          const newPoints = [...p.points];
          newPoints[dragInfo.vertexIndex] = {
            x: mousePos.x - dragInfo.offset.x,
            y: mousePos.y - dragInfo.offset.y,
          };
          return { ...p, points: newPoints };
        } else if (dragInfo.type === 'polygon') {
          const firstPointOriginal = dragInfo.initialPoints[0];
          const dx = (mousePos.x - dragInfo.offset.x) - firstPointOriginal.x;
          const dy = (mousePos.y - dragInfo.offset.y) - firstPointOriginal.y;
          
          const newPoints = dragInfo.initialPoints.map(pt => ({
            x: pt.x + dx,
            y: pt.y + dy,
          }));
          return { ...p, points: newPoints };
        }
        return p;
      })
    );
  };

  const handleMouseUp = () => {
    if (dragInfo) {
      saveToHistory(polygons);
    }
    setDragInfo(null);
  };

  const handlePolygonDoubleClick = (e: MouseEvent, polygonId: number) => {
    e.preventDefault();
    setSelectedPolygonId(polygonId);
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
        saveToHistory(newPolygons);
    }
  };
  
  const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);

  return (
    <TooltipProvider>
      <SelectionDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDetails}
        selectionData={selectedPolygon}
      />
      <div className="flex flex-col gap-4 items-center">
        <div className="w-full flex justify-end gap-2">
            <Button
                onClick={handleAddPolygon}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
                <Plus className="mr-2 h-4 w-4" />
                New Selection
            </Button>
            <Button 
                variant="outline"
                onClick={handleConfirmSelection}
                disabled={!selectedPolygonId}
                className="bg-green-600 hover:bg-green-700 text-white"
            >
                <CheckSquare className="mr-2 h-4 w-4" />
                Edit Details
            </Button>
            <Button 
                variant="destructive" 
                onClick={handleDeleteSelection} 
                disabled={!selectedPolygonId}
                className="bg-red-600 hover:bg-red-700 text-white"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </div>
        <div className="relative w-full max-w-5xl mx-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-neutral-600">
            <img src={imageUrl} alt="Editor background" className="absolute top-0 left-0 w-full h-full object-contain" />
            <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full z-10" onClick={() => setSelectedPolygonId(null)}>
              {polygons.map(polygon => (
                <Tooltip key={polygon.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <g onClick={(e) => e.stopPropagation()}>
                      <polygon
                        points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                        className={cn(
                            "stroke-2 cursor-move transition-colors",
                            polygon.details ? "fill-green-600/40" : "fill-white/30",
                            selectedPolygonId === polygon.id ? "stroke-yellow-500" : "stroke-blue-500 hover:stroke-yellow-400"
                        )}
                        onMouseDown={(e) => handleMouseDownOnPolygon(e, polygon.id)}
                        onDoubleClick={(e) => handlePolygonDoubleClick(e, polygon.id)}
                      />
                      {polygon.points.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          className={cn(
                            "stroke-white stroke-1 cursor-grab transition-colors",
                            selectedPolygonId === polygon.id ? "fill-yellow-500" : "fill-blue-500"
                          )}
                          onMouseDown={(e) => handleMouseDownOnVertex(e, polygon.id, index)}
                        />
                      ))}
                    </g>
                  </TooltipTrigger>
                  {polygon.details?.title && (
                    <TooltipContent className="bg-black text-white border-neutral-600">
                      <p>{polygon.details.title}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

ImageEditor.displayName = "ImageEditor";
export default ImageEditor;
