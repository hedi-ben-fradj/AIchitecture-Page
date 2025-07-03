import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface MagnifierProps {
  imageUrl: string;
  cursorPosition: { x: number; y: number } | null;
  imageSize: { width: number; height: number };
  magnifierSize?: number; // Diameter of the magnifier
  zoomFactor?: number;
}

const Magnifier = forwardRef<HTMLDivElement, MagnifierProps>(
  (
    {
      imageUrl,
      cursorPosition,
      imageSize,
      magnifierSize = 150, // Default size
      zoomFactor = 2, // Default zoom
    },
    ref
  ) => {
    if (!cursorPosition || !imageUrl || !imageSize || imageSize.width === 0 || imageSize.height === 0) {
      return null; // Don't render if not active or no image/size data
    }

    // Calculate the position of the magnifier
    // It should be centered around the cursor, but offset so the top-left
    // corner of the magnifier is at cursorPosition.x - magnifierSize / 2
    const magnifierStyle: React.CSSProperties = {
      position: 'absolute',
      top: `${cursorPosition.y - magnifierSize / 2}px`,
      left: `${cursorPosition.x - magnifierSize / 2}px`,
      width: `${magnifierSize}px`,
      height: `${magnifierSize}px`,
      borderRadius: '50%',
      border: '2px solid #fff',
      overflow: 'hidden',
      pointerEvents: 'none', // Ensures the magnifier doesn't interfere with mouse events on the image/SVG
      zIndex: 50, // Ensure it's above the image and SVG
      backgroundImage: `url(${imageUrl})`,
      backgroundRepeat: 'no-repeat',
      // Calculate background position
      // The background image needs to be shifted such that the point under the cursor
      // in the original image is at the center of the magnifier.
      // Original cursor position: cursorPosition.x, cursorPosition.y
      // Center of magnifier: magnifierSize / 2, magnifierSize / 2
      // Point in original image to display at magnifier center:
      // (cursorPosition.x / imageSize.width) * originalImageWidth, (cursorPosition.y / imageSize.height) * originalImageHeight
      // Background position should be -(point in original image * zoomFactor) + center of magnifier
      backgroundSize: `${imageSize.width * zoomFactor}px ${imageSize.height * zoomFactor}px`,
      backgroundPosition: `${-(cursorPosition.x * zoomFactor) + magnifierSize / 2}px ${-(cursorPosition.y * zoomFactor) + magnifierSize / 2}px`,
    };

    return <div ref={ref} style={magnifierStyle} className={cn("shadow-xl")} />;
  }
);

Magnifier.displayName = 'Magnifier';

export default Magnifier;
