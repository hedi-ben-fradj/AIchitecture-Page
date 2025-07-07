
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, ArrowLeft, Eye, Edit, Trash2 } from 'lucide-react';
import ImageEditor, { type ImageEditorRef, type Hotspot, type Polygon } from '@/components/admin/image-editor';
import { useProjectData, type EntityType } from '@/contexts/views-context';
import { useRouter } from 'next/navigation';
import HotspotDetailsModal from './hotspot-details-modal';
import { Viewer, TypedEvent } from '@photo-sphere-viewer/core';
import type { ClickData } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { useToast } from '@/hooks/use-toast';


interface ViewEditorClientProps {
  projectId: string;
  entityId: string;
  viewId: string;
}

const getHotspotMarkerHtml = (color: string, text: string) => `
  <div style="text-align: center; color: white; font-family: sans-serif; font-size: 14px; text-shadow: 0 0 5px black;">
    <img src="/assets/orb.png" width="80" height="80" style="filter: drop-shadow(0 0 8px ${color}); transition: filter 0.2s ease-in-out; margin-bottom: 5px;" />
    <p style="margin: 0; padding: 2px 8px; background-color: rgba(0,0,0,0.6); border-radius: 4px; display: inline-block;">${text}</p>
  </div>
`;


export default function ViewEditorClient({ projectId, entityId, viewId }: ViewEditorClientProps) {
  const { getView, updateViewImage, updateViewSelections, updateViewHotspots, addEntity, getEntity, entities: allEntities } = useProjectData();
  const router = useRouter();
  const { toast } = useToast();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);
  
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [hotspotToEdit, setHotspotToEdit] = useState<Hotspot | null>(null);

  const view = getView(entityId, viewId);
  const entity = getEntity(entityId);

  // State for 360 viewer
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [markersPlugin, setMarkersPlugin] = useState<MarkersPlugin | null>(null);
  const [viewerHotspots, setViewerHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(null);
  
  // New state for hotspot creation/moving workflow
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);

  // Refs to hold current mode for event listeners, preventing re-renders
  const placementModeRef = useRef(isPlacingHotspot);
  const selectedHotspotIdRef = useRef(selectedHotspotId);
  useEffect(() => { placementModeRef.current = isPlacingHotspot; }, [isPlacingHotspot]);
  useEffect(() => { selectedHotspotIdRef.current = selectedHotspotId; }, [selectedHotspotId]);


  useEffect(() => {
    if (!view) {
      router.replace(`/admin/projects/${projectId}/entities/${entityId}`);
      return;
    }
    if (view.imageUrl) {
      setImageToEdit(view.imageUrl);
      setViewerHotspots(view.hotspots || []);
    } else {
      setImageToEdit(null);
    }
    setSelectedHotspotId(null);
  }, [view, router, projectId, entityId]);

  // Effect to manage cursor style
  useEffect(() => {
      if (viewerContainerRef.current) {
          if (isPlacingHotspot || selectedHotspotId) {
              viewerContainerRef.current.style.cursor = 'crosshair';
          } else {
              viewerContainerRef.current.style.cursor = 'default';
          }
      }
  }, [isPlacingHotspot, selectedHotspotId]);


  // Effect to manage the 360 viewer lifecycle
  useEffect(() => {
    let viewer: Viewer | null = null;
    
    if (view?.type === '360' && imageToEdit && viewerContainerRef.current) {
        const panoramaUrl = `/api/image-proxy?url=${encodeURIComponent(imageToEdit)}`;
        viewer = new Viewer({
            container: viewerContainerRef.current,
            panorama: panoramaUrl,
            caption: view.name,
            touchmoveTwoFingers: true,
            navbar: ['zoom', 'move', 'caption', 'fullscreen'],
            plugins: [[MarkersPlugin, {}]],
        });

        viewerRef.current = viewer;

        const currentMarkersPlugin = viewer.getPlugin(MarkersPlugin);
        if (currentMarkersPlugin) {
          setMarkersPlugin(currentMarkersPlugin);

          const findViewName = (h: Hotspot) => {
            if (!h.linkedViewId) return 'Unlinked Hotspot';
            for (const entity of allEntities) {
                const foundView = entity.views.find(v => v.id === h.linkedViewId);
                if (foundView) return foundView.name;
            }
            return 'Link';
          };

          const initialMarkers = (view.hotspots || []).map(hotspot => {
            const tooltipText = findViewName(hotspot);
            return {
              id: String(hotspot.id),
              position: { 
                yaw: (hotspot.x - 0.5) * 2 * Math.PI, 
                pitch: (hotspot.y - 0.5) * -Math.PI 
              },
              html: getHotspotMarkerHtml('white', tooltipText),
              size: { width: 80, height: 110 },
              anchor: 'center center',
              tooltip: null,
              data: hotspot,
            }
          });
          currentMarkersPlugin.setMarkers(initialMarkers);

          currentMarkersPlugin.addEventListener('select-marker', (e) => {
            toast({ title: 'Hotspot Selected', description: 'Click anywhere to move it, or click "Edit Hotspot".' });
            setIsPlacingHotspot(false);
            setSelectedHotspotId(e.marker.data.id as number);
          });

          viewer.addEventListener('click', ((e: TypedEvent<Viewer, ClickData>) => {
            if (e.data.marker) {
                return;
            }
            
            if (placementModeRef.current) {
                const newHotspot: Hotspot = {
                    id: Date.now(),
                    x: (e.data.yaw / (2 * Math.PI)) + 0.5,
                    y: (e.data.pitch / -Math.PI) + 0.5,
                    linkedViewId: '',
                };
                
                setViewerHotspots(prev => [...prev, newHotspot]);
                currentMarkersPlugin.addMarker({
                    id: String(newHotspot.id),
                    position: { yaw: e.data.yaw, pitch: e.data.pitch },
                    html: getHotspotMarkerHtml('white', 'New Hotspot'),
                    size: { width: 80, height: 110 },
                    anchor: 'center center',
                    tooltip: null,
                    data: newHotspot,
                });

                setIsPlacingHotspot(false);
                setSelectedHotspotId(newHotspot.id);
                toast({ title: 'Hotspot Placed', description: "Click to move, or click 'Edit Hotspot' to link it." });
                return;
            }
            
            if (selectedHotspotIdRef.current) {
                const newPosition = { yaw: e.data.yaw, pitch: e.data.pitch };
                const newNormalizedCoords = {
                    x: (newPosition.yaw / (2 * Math.PI)) + 0.5,
                    y: (newPosition.pitch / -Math.PI) + 0.5,
                };

                setViewerHotspots(prev => prev.map(h => h.id === selectedHotspotIdRef.current ? { ...h, ...newNormalizedCoords } : h));
                currentMarkersPlugin.updateMarker({ id: String(selectedHotspotIdRef.current), position: newPosition });
                toast({ title: 'Hotspot Moved' });
                return;
            }

            setSelectedHotspotId(null);
          }) as (evt: TypedEvent<Viewer, any>) => void);
        }
    }
    
    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.name, view?.hotspots, imageToEdit, getEntity, allEntities]);

    useEffect(() => {
        if (!markersPlugin) return;

        const findViewName = (h: Hotspot) => {
            if (!h.linkedViewId) return 'Unlinked Hotspot';
            for (const entity of allEntities) {
                const foundView = entity.views.find(v => v.id === h.linkedViewId);
                if (foundView) return foundView.name;
            }
            return 'Link';
        };
        
        const currentMarkers = markersPlugin.getMarkers();

        currentMarkers.forEach(marker => {
            const isSelected = marker.id === String(selectedHotspotId);
            const hotspotData = viewerHotspots.find(h => String(h.id) === marker.id);
            const tooltipText = hotspotData ? findViewName(hotspotData) : 'New Hotspot';
            
            try {
                if (markersPlugin.getMarker(marker.id)) {
                    markersPlugin.updateMarker({
                        id: marker.id,
                        html: getHotspotMarkerHtml(isSelected ? '#facc15' : 'white', tooltipText),
                    });
                }
            } catch (e) {
                console.warn(`Could not update marker ${marker.id}, it might have been removed.`, e);
                if (isSelected) {
                    setSelectedHotspotId(null);
                }
            }
        });
    }, [selectedHotspotId, markersPlugin, viewerHotspots, allEntities]);


  const handleSaveHotspot = (hotspotData: { linkedViewId: string }) => {
    if (!hotspotToEdit) return;

    const updatedHotspot = { ...hotspotToEdit, ...hotspotData };

    if (view?.type === '360') {
      if (markersPlugin) {
        setViewerHotspots((prev) =>
          prev.map((h) => (h.id === updatedHotspot.id ? updatedHotspot : h))
        );
        // The useEffect will handle the visual update
      }
    } else {
      // Logic for 2D editor
      editorRef.current?.updateHotspot(updatedHotspot);
    }
    
    // Common logic to close modal and reset state
    setSelectedHotspotId(null);
    setHotspotToEdit(null);
    setIsHotspotModalOpen(false);
    toast({ title: 'Hotspot saved!' });
  };

  const handleAddNewHotspot = () => {
    if (view?.type === '360') {
        setIsPlacingHotspot(true);
        setSelectedHotspotId(null);
        toast({ title: 'Placement Mode Active', description: 'Click anywhere on the panorama to place the new hotspot.' });
    }
  };
  
  const handleEditSelectedHotspot = () => {
    if (view?.type === '360') {
      if (!selectedHotspotId) return;
      const spotToEdit = viewerHotspots.find(h => h.id === selectedHotspotId);
      if (spotToEdit) {
          setHotspotToEdit(spotToEdit);
          setIsHotspotModalOpen(true);
      }
    }
  };

  const handleDeleteSelectedHotspot = () => {
    if (view?.type === '360') {
      if (!selectedHotspotId || !markersPlugin) return;
      markersPlugin.removeMarker(String(selectedHotspotId));
      setViewerHotspots(prev => prev.filter(h => h.id !== selectedHotspotId));
      setSelectedHotspotId(null);
    }
  };

  const handlePolygonsChange = useCallback((newRelativePolygons: Polygon[]) => {
    if (view) {
      updateViewSelections(entityId, view.id, newRelativePolygons);
    }
  }, [updateViewSelections, entityId, view]);

  const handleHotspotsChange = useCallback((newRelativeHotspots: Hotspot[]) => {
      if (view) {
        updateViewHotspots(entityId, view.id, newRelativeHotspots);
      }
  }, [updateViewHotspots, entityId, view]);
  
  if (!view || !entity) {
    return (
        <div className="flex flex-col h-full bg-[#313131] items-center justify-center text-white">
            <p>Loading view...</p>
        </div>
    );
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: 'File too large', description: "File size exceeds 4MB. Please choose a smaller image."});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const img = document.createElement('img');
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = view.type === '360' ? 4096 : 1920;
          const MAX_HEIGHT = view.type === '360' ? 2048 : 1080;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not process image.' });
             return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          const resizedImageUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageToEdit(resizedImageUrl);
          await updateViewImage(entityId, viewId, resizedImageUrl);
        };
        img.onerror = () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the image file.'});
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const handleMakeEntity = async (newEntityName: string, newEntityType: EntityType): Promise<string | null> => {
    return await addEntity(newEntityName, newEntityType, entityId);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveAndExit = () => {
    if (view.type === '360') {
      updateViewHotspots(entityId, viewId, viewerHotspots);
    } else {
      const currentPolygons = editorRef.current?.getRelativePolygons();
      const currentHotspots = editorRef.current?.getRelativeHotspots();
      if (currentPolygons && currentHotspots) {
          updateViewSelections(entityId, view.id, currentPolygons);
          updateViewHotspots(entityId, view.id, currentHotspots);
      }
    }
    toast({ title: 'Success', description: 'Your changes have been saved.' });
    router.push(`/admin/projects/${projectId}/entities/${entityId}`);
  };

  const viewName = view.name;

  return (
    <>
      <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept="image/png, image/jpeg, image/webp" />
      <HotspotDetailsModal 
        isOpen={isHotspotModalOpen}
        onClose={() => { setIsHotspotModalOpen(false); setHotspotToEdit(null); }}
        onSave={handleSaveHotspot}
        entity={entity}
        hotspot={hotspotToEdit}
      />
      
      {!imageToEdit ? (
        <Card className="max-w-2xl mx-auto bg-[#2a2a2a] border-neutral-700 text-white">
          <CardContent className="p-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back to Entity
            </Button>
            <h2 className="text-lg font-semibold mb-4 text-center">Upload Image for {viewName}</h2>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-neutral-400" />
                  <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-neutral-500">PNG, JPG, or WEBP (MAX. 4MB)</p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
         <div>
           <div className="flex justify-between items-start mb-4">
              <div/>
              <h2 className="text-lg font-semibold text-center text-white self-center">
                {view.type === '360' ? `Editing Hotspots for ${viewName}` : `Define Selections & Hotspots for ${viewName}`}
              </h2>
              <div className="flex justify-end gap-2">
                  <Button onClick={triggerFileInput} variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Change Image
                  </Button>
                  <Button onClick={handleSaveAndExit} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                      <Save className="mr-2 h-4 w-4" />
                      Save and Exit
                  </Button>
              </div>
           </div>
           {view.type === '360' ? (
              <div>
                <div className="flex gap-2 mb-4">
                    <Button onClick={handleAddNewHotspot} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isPlacingHotspot || !!selectedHotspotId}>
                        <Eye className="mr-2 h-4 w-4" />
                        New Hotspot
                    </Button>
                    <Button variant="outline" onClick={handleEditSelectedHotspot} disabled={!selectedHotspotId || isPlacingHotspot}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Hotspot
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteSelectedHotspot} disabled={!selectedHotspotId || isPlacingHotspot}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
                <div ref={viewerContainerRef} className="w-full h-[70vh] relative bg-black rounded-lg border border-neutral-600" />
                <p className="text-center text-sm text-neutral-400 mt-2">Click on a hotspot to select it, or use the buttons above.</p>
              </div>
           ) : (
            <ImageEditor
                ref={editorRef}
                imageUrl={imageToEdit}
                onMakeEntity={handleMakeEntity}
                initialPolygons={view?.selections}
                initialHotspots={view?.hotspots}
                parentEntityType={entity.entityType}
                entityId={entityId}
                onEditHotspot={(hotspot) => {
                  setHotspotToEdit(hotspot);
                  setIsHotspotModalOpen(true);
                }}
                onPolygonsChange={handlePolygonsChange}
                onHotspotsChange={handleHotspotsChange}
            />
           )}
         </div>
      )}
    </>
  );
}
