'use client';

import { useState, useRef, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  id: number;
  points: Point[];
}

interface DragInfo {
  type: 'polygon' | 'vertex';
  polygonId: number;
  vertexIndex?: number;
  offset: Point;
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

export default function ImageEditor({ imageUrl }: { imageUrl: string }) {
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleAddPolygon = () => {
    const newPolygon: Polygon = {
      id: Date.now(),
      points: [
        { x: 20, y: 20 },
        { x: 120, y: 20 },
        { x: 120, y: 80 },
        { x: 20, y: 80 },
      ],
    };
    setPolygons([...polygons, newPolygon]);
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
    const mousePos = getMousePosition(e);
    const polygon = polygons.find(p => p.id === polygonId);
    if (!polygon) return;
    
    // For simplicity, we use the first point to calculate offset
    const offset = {
        x: mousePos.x - polygon.points[0].x,
        y: mousePos.y - polygon.points[0].y,
    };
    setDragInfo({ type: 'polygon', polygonId, offset });
  };

  const handleMouseDownOnVertex = (e: MouseEvent, polygonId: number, vertexIndex: number) => {
    e.stopPropagation(); // Prevent polygon drag from firing
    const mousePos = getMousePosition(e);
    const point = polygons.find(p => p.id === polygonId)!.points[vertexIndex];
    setDragInfo({
      type: 'vertex',
      polygonId,
      vertexIndex,
      offset: { x: mousePos.x - point.x, y: mousePos.y - point.y },
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragInfo) return;

    const mousePos = getMousePosition(e);

    setPolygons(polys =>
      polys.map(p => {
        if (p.id !== dragInfo.polygonId) return p;

        if (dragInfo.type === 'vertex' && dragInfo.vertexIndex !== undefined) {
          // Move a single vertex
          const newPoints = [...p.points];
          newPoints[dragInfo.vertexIndex] = {
            x: mousePos.x - dragInfo.offset.x,
            y: mousePos.y - dragInfo.offset.y,
          };
          return { ...p, points: newPoints };
        } else if (dragInfo.type === 'polygon') {
          // Move the whole polygon
          const firstPointOriginal = polygons.find(poly => poly.id === dragInfo.polygonId)!.points[0];
          const dx = (mousePos.x - dragInfo.offset.x) - firstPointOriginal.x;
          const dy = (mousePos.y - dragInfo.offset.y) - firstPointOriginal.y;
          
          const newPoints = p.points.map(pt => ({
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
    setDragInfo(null);
  };

  const handlePolygonDoubleClick = (e: MouseEvent, polygonId: number) => {
    e.preventDefault();
    const mousePos = getMousePosition(e);
    const thresholdSquared = 100; // 10px threshold, squared for performance

    setPolygons(polys => {
        const polyIndex = polys.findIndex(p => p.id === polygonId);
        if (polyIndex === -1) return polys;

        const polygon = polys[polyIndex];
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
            const newPolygons = [...polys];
            const newPoints = [...polygon.points];
            newPoints.splice(closestEdgeIndex + 1, 0, mousePos);
            newPolygons[polyIndex] = { ...polygon, points: newPoints };
            return newPolygons;
        }

        return polys;
    });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <Button
            onClick={handleAddPolygon}
            className="absolute top-2 right-2 z-20 bg-yellow-500 hover:bg-yellow-600 text-black"
        >
            <Plus className="mr-2 h-4 w-4" />
            New Selection
        </Button>
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-neutral-600">
        <img src={imageUrl} alt="Editor background" className="absolute top-0 left-0 w-full h-full object-contain" />
        <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full z-10">
          {polygons.map(polygon => (
            <g key={polygon.id}>
              <polygon
                points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                className="fill-white/30 stroke-blue-500 stroke-2 cursor-move"
                onMouseDown={(e) => handleMouseDownOnPolygon(e, polygon.id)}
                onDoubleClick={(e) => handlePolygonDoubleClick(e, polygon.id)}
              />
              {polygon.points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="fill-blue-500 stroke-white stroke-1 cursor-grab"
                  onMouseDown={(e) => handleMouseDownOnVertex(e, polygon.id, index)}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
