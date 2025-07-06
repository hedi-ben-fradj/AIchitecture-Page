
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, ArrowLeft } from 'lucide-react';
import ImageEditor, { type ImageEditorRef, type Hotspot } from '@/components/admin/image-editor';
import { useProjectData, type EntityType } from '@/contexts/views-context';
import { useRouter } from 'next/navigation';
import HotspotDetailsModal from './hotspot-details-modal';
import { Viewer, TypedEvent } from '@photo-sphere-viewer/core';
import type { ClickData } from '@photo-sphere-viewer/core';
import { MarkersPlugin, Marker } from '@photo-sphere-viewer/markers-plugin';
import { useToast } from '@/hooks/use-toast';


interface ViewEditorClientProps {
  projectId: string;
  entityId: string;
  viewId: string;
}

// SVG for the hotspot marker
const hotspotIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye drop-shadow-lg">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
`;

export default function ViewEditorClient({ projectId, entityId, viewId }: ViewEditorClientProps) {
  const { getView, updateViewImage, updateViewSelections, updateViewHotspots, addEntity, getEntity } = useProjectData();
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
  const [markersPlugin, setMarkersPlugin] = useState<MarkersPlugin | null>(null);
  const [viewerHotspots, setViewerHotspots] = useState<Hotspot[]>([]);

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
  }, [view, router, projectId, entityId]);

  // Effect to manage the 360 viewer lifecycle
  useEffect(() => {
    if (view?.type !== '360' || !imageToEdit || !viewerContainerRef.current) {
        return;
    }

    const viewer = new Viewer({
        container: viewerContainerRef.current,
        panorama: imageToEdit,
        caption: view.name,
        touchmoveTwoFingers: true,
        navbar: ['zoom', 'move', 'caption', 'fullscreen'],
        plugins: [[MarkersPlugin, {}]],
    });

    const currentMarkersPlugin = viewer.getPlugin(MarkersPlugin);
    if (currentMarkersPlugin) {
      setMarkersPlugin(currentMarkersPlugin);

      const findViewName = (h: Hotspot) => {
        const targetEntity = getEntity(h.linkedViewId.split('__')[0]);
        return targetEntity?.views.find(v => v.id === h.linkedViewId)?.name || 'Link';
      };

      const initialMarkers = (view.hotspots || []).map(hotspot => ({
          id: String(hotspot.id),
          position: { 
            yaw: (hotspot.x - 0.5) * 2 * Math.PI, 
            pitch: (hotspot.y - 0.5) * -Math.PI 
          },
          html: hotspotIconSvg,
          size: { width: 50, height: 50 },
          anchor: 'center center',
          tooltip: findViewName(hotspot),
          data: hotspot,
      }));
      currentMarkersPlugin.setMarkers(initialMarkers);

      viewer.addEventListener('click', ((e: TypedEvent<Viewer, ClickData>) => {
        const { yaw, pitch } = e.data;
        if (!yaw || !pitch) return;
        
        const newHotspot: Hotspot = {
          id: Date.now(),
          x: (yaw / (2 * Math.PI)) + 0.5,
          y: (pitch / -Math.PI) + 0.5,
          linkedViewId: '',
        };
        setHotspotToEdit(newHotspot);
        setIsHotspotModalOpen(true);
      }) as (evt: TypedEvent<Viewer, any>) => void);

      currentMarkersPlugin.addEventListener('select-marker', (e) => {
        setHotspotToEdit(e.marker.data as Hotspot);
        setIsHotspotModalOpen(true);
      });
    }

    return () => {
      viewer.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.name, view?.hotspots, imageToEdit, getEntity]);


  const handleSaveHotspot = (hotspotData: { linkedViewId: string }) => {
    if (hotspotToEdit && markersPlugin) {
      const updatedHotspot = { ...hotspotToEdit, ...hotspotData };
      const findViewName = (h: Hotspot) => getEntity(h.linkedViewId.split('__')[0])?.views.find(v => v.id === h.linkedViewId)?.name || 'Link';
      
      const existingIndex = viewerHotspots.findIndex(h => h.id === updatedHotspot.id);

      if (existingIndex > -1) {
        setViewerHotspots(prev => prev.map(h => h.id === updatedHotspot.id ? updatedHotspot : h));
        markersPlugin.updateMarker({
          id: String(updatedHotspot.id),
          data: updatedHotspot,
          tooltip: findViewName(updatedHotspot),
        });
      } else {
        setViewerHotspots(prev => [...prev, updatedHotspot]);
        markersPlugin.addMarker({
            id: String(updatedHotspot.id),
            position: { 
                yaw: (updatedHotspot.x - 0.5) * 2 * Math.PI, 
                pitch: (updatedHotspot.y - 0.5) * -Math.PI 
            },
            html: hotspotIconSvg,
            size: { width: 50, height: 50 },
            anchor: 'center center',
            tooltip: findViewName(updatedHotspot),
            data: updatedHotspot,
        });
      }
      toast({ title: 'Hotspot saved!' });
      setHotspotToEdit(null);
    }
  };
  
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
        alert("File size exceeds 4MB. Please choose a smaller image.");
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const img = document.createElement('img');
        img.onload = () => {
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
             alert('Could not process image.');
             return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          const resizedImageUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageToEdit(resizedImageUrl);
          updateViewImage(entityId, viewId, resizedImageUrl);
        };
        img.onerror = () => alert("Failed to load the image file.");
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const handleMakeEntity = (newEntityName: string, newEntityType: EntityType) => {
    addEntity(newEntityName, newEntityType, entityId);
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
                <div ref={viewerContainerRef} className="w-full h-[70vh] relative bg-black rounded-lg border border-neutral-600" />
                <p className="text-center text-sm text-neutral-400 mt-2">Click on the view to add a hotspot. Click an existing hotspot to edit it.</p>
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
            />
           )}
         </div>
      )}
    </>
  );
}
