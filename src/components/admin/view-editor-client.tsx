
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, ArrowLeft, Eye, Edit, Trash2, Loader2, Plus, FileCode } from 'lucide-react';
import ImageEditor, { type ImageEditorRef, type Hotspot, type Polygon } from '@/components/admin/image-editor';
import { useProjectData, type EntityType } from '@/contexts/views-context';
import { useRouter } from 'next/navigation';
import HotspotDetailsModal from './hotspot-details-modal';
import { Viewer, TypedEvent } from '@photo-sphere-viewer/core';
import type { ClickData } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';


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

  const view = useMemo(() => getView(entityId, viewId), [getView, entityId, viewId]);
  const entity = useMemo(() => getEntity(entityId), [getEntity, entityId]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State for 360 viewer
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [markersPlugin, setMarkersPlugin] = useState<MarkersPlugin | null>(null);
  const [viewerHotspots, setViewerHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(null);
  
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);

  const placementModeRef = useRef(isPlacingHotspot);
  const selectedHotspotIdRef = useRef(selectedHotspotId);
  useEffect(() => { placementModeRef.current = isPlacingHotspot; }, [isPlacingHotspot]);
  useEffect(() => { selectedHotspotIdRef.current = selectedHotspotId; }, [selectedHotspotId]);

  const allEntitiesRef = useRef(allEntities);
  allEntitiesRef.current = allEntities;


  useEffect(() => {
    if (!view) {
      router.replace(`/admin/projects/${projectId}/entities/${entityId}`);
      return;
    }
    if (view.imageUrl) {
      setImageToEdit(view.imageUrl);
      if (view.type === '360') {
        setViewerHotspots(view.hotspots || []);
      }
    } else {
      setImageToEdit(null);
      setViewerHotspots([]);
    }
    setSelectedHotspotId(null);
    setIsPlacingHotspot(false);
  }, [view, router, projectId, entityId]);

  useEffect(() => {
      if (viewerContainerRef.current) {
          if (isPlacingHotspot || selectedHotspotId) {
              viewerContainerRef.current.style.cursor = 'crosshair';
          } else {
              viewerContainerRef.current.style.cursor = 'default';
          }
      }
  }, [isPlacingHotspot, selectedHotspotId]);


  useEffect(() => {
    let viewer: Viewer | null = null;
    let autorotatePlugin: AutorotatePlugin | null = null;
    let idleTimeout: NodeJS.Timeout | null = null;
    let isViewerDestroyed = false;

    if (view?.type === '360' && imageToEdit && viewerContainerRef.current) {
        
        const startIdleTimer = () => {
            if (idleTimeout) clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
                autorotatePlugin?.start();
            }, 4000); // 4 seconds
        };

        const stopIdleRotation = () => {
            if (autorotatePlugin?.isStarted()) {
                autorotatePlugin.stop();
            }
            startIdleTimer();
        };

        const panoramaUrl = `/api/image-proxy?url=${encodeURIComponent(imageToEdit)}`;
        viewer = new Viewer({
            container: viewerContainerRef.current,
            panorama: panoramaUrl,
            caption: view.name,
            loadingImg: '/assets/orb.png',
            loadingTxt: 'Loading panorama...',
            touchmoveTwoFingers: true,
            navbar: ['zoom', 'move', 'caption', 'fullscreen'],
            plugins: [[MarkersPlugin, {}], [AutorotatePlugin, { autostartDelay: null, autorotateSpeed: '1rpm', autostartOnIdle: false }]],
        });

        viewerRef.current = viewer;

        viewer.addEventListener('ready', () => {
          if (!isViewerDestroyed) {
            setIsUploading(false);
            startIdleTimer();
          }
        }, { once: true });
        viewer.addEventListener('user-activity', stopIdleRotation);

        const currentMarkersPlugin = viewer.getPlugin(MarkersPlugin);
        autorotatePlugin = viewer.getPlugin(AutorotatePlugin);

        if (currentMarkersPlugin) {
          setMarkersPlugin(currentMarkersPlugin);

          const findViewName = (h: Hotspot) => {
            if (!h.linkedViewId) return 'Unlinked Hotspot';
            for (const entity of allEntitiesRef.current) {
                const foundView = entity.views.find(v => v.id === h.linkedViewId);
                if (foundView) return foundView.name;
            }
            return 'Link';
          };
          
          const initialMarkers = viewerHotspots.map(hotspot => {
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
      isViewerDestroyed = true;
      if (idleTimeout) clearTimeout(idleTimeout);
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [view?.id, imageToEdit]);

    useEffect(() => {
        if (!markersPlugin) return;

        const findViewName = (h: Hotspot) => {
            if (!h.linkedViewId) return 'Unlinked Hotspot';
            for (const entity of allEntitiesRef.current) {
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
                // This can happen if a marker is deleted, which is safe to ignore.
            }
        });
    }, [selectedHotspotId, markersPlugin, viewerHotspots]);


  const handleSaveHotspot = (hotspotData: { linkedViewId: string }) => {
    if (!hotspotToEdit) return;

    const updatedHotspot = { ...hotspotToEdit, ...hotspotData };

    if (view?.type === '360') {
      if (markersPlugin) {
        setViewerHotspots((prev) =>
          prev.map((h) => (h.id === updatedHotspot.id ? updatedHotspot : h))
        );
      }
    } else {
      editorRef.current?.updateHotspot(updatedHotspot);
    }
    
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
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-4">Loading view...</p>
        </div>
    );
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (view.type === 'Gausian Splatting' && !file.name.endsWith('.splat')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: "Please upload a .splat file."});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    if (file.size > 4 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: 'File too large', description: "File size exceeds 4MB. Please choose a smaller image."});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }
    
    setIsUploading(true);
    try {
        await updateViewImage(entityId, viewId, file);
        toast({ title: 'Success', description: 'Source updated successfully.' });
    } catch (error) {
        console.error("Image processing failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to process the file.'});
    } finally {
        setIsUploading(false);
    }
    if (event.target) event.target.value = '';
  };

  const handleMakeEntity = async (newEntityName: string, newEntityType: EntityType): Promise<string | null> => {
    return await addEntity(newEntityName, newEntityType, entityId);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveAndExit = async () => {
    setIsSaving(true);
    try {
        if (view.type === '360') {
            await updateViewHotspots(entityId, viewId, viewerHotspots);
        } else if (view.type !== 'Gausian Splatting') {
            const currentPolygons = editorRef.current?.getRelativePolygons();
            const currentHotspots = editorRef.current?.getRelativeHotspots();
            if (currentPolygons) {
                await updateViewSelections(entityId, view.id, currentPolygons);
            }
            if (currentHotspots) {
                await updateViewHotspots(entityId, view.id, currentHotspots);
            }
        }
        // No save action needed for Gaussian Splatting as it's saved on upload
        toast({ title: 'Success', description: 'Your changes have been saved.' });
        router.push(`/admin/projects/${projectId}/entities/${entityId}`);
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
        console.error("Save error:", error);
    } finally {
        setIsSaving(false);
    }
  };

  const viewName = view.name;

  return (
    <>
      <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept={view.type === 'Gausian Splatting' ? '.splat' : "image/png, image/jpeg, image/webp"} />
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
            <h2 className="text-lg font-semibold mb-4 text-center">Upload Source for {viewName}</h2>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                     <Loader2 className="w-8 h-8 mb-4 text-neutral-400 animate-spin" />
                  ) : (
                     <Upload className="w-8 h-8 mb-4 text-neutral-400" />
                  )}
                  <p className="mb-2 text-sm text-neutral-400">
                    {isUploading ? "Uploading..." : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {view.type === 'Gausian Splatting' ? '.SPLAT file' : 'PNG, JPG, or WEBP (MAX. 4MB)'}
                  </p>
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
                {
                  view.type === '360' ? `Editing Hotspots for ${viewName}` :
                  view.type === 'Gausian Splatting' ? `Editing ${viewName}` :
                  `Define Selections & Hotspots for ${viewName}`
                }
              </h2>
              <div className="flex justify-end gap-2">
                  <Button onClick={triggerFileInput} variant="outline" loading={isUploading}>
                      Change Source
                  </Button>
                  <Button onClick={handleSaveAndExit} className="bg-yellow-500 hover:bg-yellow-600 text-black" loading={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Save and Exit
                  </Button>
              </div>
           </div>
           {view.type === 'Gausian Splatting' ? (
                <div className="w-full h-[70vh] relative bg-black rounded-lg border border-neutral-600 flex items-center justify-center text-white">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-10 w-10 animate-spin" />
                            <p>Uploading source...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-neutral-300">
                           <FileCode className="h-20 w-20" />
                           <h3 className="text-xl font-semibold">Gaussian Splatting View</h3>
                           <p className="text-sm text-neutral-400 max-w-md text-center">
                            Source file: <span className="font-mono text-yellow-400 break-all">{view.name}.splat</span>
                           </p>
                           <p className="text-xs text-neutral-500">Preview is not available in the editor.</p>
                        </div>
                    )}
                </div>
           ) : view.type === '360' ? (
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
                <div className="w-full h-[70vh] relative bg-black rounded-lg border border-neutral-600 flex items-center justify-center">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2 text-white">
                            <Loader2 className="h-10 w-10 animate-spin" />
                            <p>Uploading and processing image...</p>
                        </div>
                    ) : (
                        <div ref={viewerContainerRef} className="w-full h-full" />
                    )}
                </div>
                <p className="text-center text-sm text-neutral-400 mt-2">Click on a hotspot to select it, or use the buttons above.</p>
              </div>
           ) : (
            <div className='relative'>
                {isUploading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-lg">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                )}
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
            </div>
           )}
         </div>
      )}
    </>
  );
}
