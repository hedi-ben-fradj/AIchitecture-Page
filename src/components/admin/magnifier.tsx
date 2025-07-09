import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { RenderedImageRect } from './image-editor';

// Minimal type definition to avoid circular dependencies
// This should match the relevant parts of the Polygon type in image-editor.tsx
interface Point {
  x: number;
  y: number;
}
interface ActivePolygon {
  id: number;
  points: Point[];
}

interface MagnifierProps {
  imageUrl: string;
  cursorPosition: { x: number; y: number } | null;
  renderedImageRect: RenderedImageRect | null;
  magnifierSize?: number; // Diameter of the magnifier
  zoomFactor?: number;
  activePolygon: ActivePolygon | null;
}

const Magnifier = forwardRef<HTMLDivElement, MagnifierProps>(
  (
    {
      imageUrl,
      cursorPosition,
      renderedImageRect,
      magnifierSize = 200,
      zoomFactor = 2.5,
      activePolygon,
    },
    ref
  ) => {
    if (!cursorPosition || !imageUrl || !renderedImageRect || !activePolygon) {
      return null;
    }

    const { x: imageOffsetX, y: imageOffsetY, width: imageWidth, height: imageHeight } = renderedImageRect;

    const magnifierStyle: React.CSSProperties = {
      position: 'absolute',
      top: `${cursorPosition.y - magnifierSize / 2}px`,
      left: `${cursorPosition.x - magnifierSize / 2}px`,
      width: `${magnifierSize}px`,
      height: `${magnifierSize}px`,
      borderRadius: '50%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 50,
      backgroundImage: `url(${imageUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${imageWidth * zoomFactor}px ${imageHeight * zoomFactor}px`,
      backgroundPosition: `${-(cursorPosition.x - imageOffsetX) * zoomFactor + magnifierSize / 2}px ${-(cursorPosition.y - imageOffsetY) * zoomFactor + magnifierSize / 2}px`,
    };

    const transformPoint = (point: Point) => ({
      x: magnifierSize / 2 + (point.x - cursorPosition.x) * zoomFactor,
      y: magnifierSize / 2 + (point.y - cursorPosition.y) * zoomFactor,
    });
    
    const crosshairSize = 10;
    const center = magnifierSize / 2;

    return (
        <div 
          ref={ref} 
          style={magnifierStyle} 
          className={cn(
            "bg-black shadow-2xl [mask-image:radial-gradient(circle,white_80%,transparent_100%)]"
          )}
        >
          <svg width={magnifierSize} height={magnifierSize} viewBox={`0 0 ${magnifierSize} ${magnifierSize}`}>
            <polygon
              points={activePolygon.points.map(p => {
                const t = transformPoint(p);
                return `${t.x},${t.y}`;
              }).join(' ')}
              className="fill-yellow-400/20 stroke-yellow-500"
              strokeWidth={2 / zoomFactor}
            />
            {activePolygon.points.map((p, index) => {
              const t = transformPoint(p);
              return (
                <circle
                  key={index}
                  cx={t.x}
                  cy={t.y}
                  r={5}
                  className="fill-yellow-500 stroke-white"
                  strokeWidth={1 / zoomFactor}
                />
              );
            })}
            <line x1={center - crosshairSize} y1={center} x2={center + crosshairSize} y2={center} stroke="#fff" strokeWidth="1" />
            <line x1={center} y1={center - crosshairSize} x2={center} y2={center + crosshairSize} stroke="#fff" strokeWidth="1" />
          </svg>
        </div>
    );
  }
);

Magnifier.displayName = 'Magnifier';

export default Magnifier;
