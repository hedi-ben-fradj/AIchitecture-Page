
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save, ArrowLeft } from 'lucide-react';
import ImageEditor, { type ImageEditorRef } from '@/components/admin/image-editor';
import { useProjectData, type EntityType } from '@/contexts/views-context';
import { useRouter } from 'next/navigation';

interface ViewEditorClientProps {
  projectId: string;
  entityId: string;
  viewId: string;
}

export default function ViewEditorClient({ projectId, entityId, viewId }: ViewEditorClientProps) {
  const { getView, updateViewImage, updateViewSelections, addEntity, getEntity } = useProjectData();
  const router = useRouter();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);

  const view = getView(entityId, viewId);
  const entity = getEntity(entityId);

  useEffect(() => {
    if (!view) {
      router.replace(`/admin/projects/${projectId}/entities/${entityId}`);
      return;
    }
    if (view.imageUrl) {
      setImageToEdit(view.imageUrl);
    } else {
      setImageToEdit(null);
    }
  }, [view, router, projectId, entityId]);

  if (!view || !entity) {
    return (
        <div className="flex flex-col h-full bg-[#313131] items-center justify-center text-white">
            <p>Loading view...</p>
        </div>
    );
  }

  const viewName = view.name;

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
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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
    const currentPolygons = editorRef.current?.getRelativePolygons();
    if (view && currentPolygons) {
        updateViewSelections(entityId, view.id, currentPolygons);
        router.push(`/admin/projects/${projectId}/entities/${entityId}`);
    }
  };

  return (
    <>
      <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept="image/png, image/jpeg, image/webp" />
      
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
            <div className="flex justify-end gap-2 mb-4">
                <Button onClick={triggerFileInput} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Image
                </Button>
                <Button onClick={handleSaveAndExit} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    <Save className="mr-2 h-4 w-4" />
                    Save and Exit
                </Button>
            </div>
           <h2 className="text-lg font-semibold mb-4 text-center text-white">Define Selections for {viewName}</h2>
           <ImageEditor
              ref={editorRef}
              imageUrl={imageToEdit}
              onMakeEntity={handleMakeEntity}
              initialPolygons={view?.selections}
              parentEntityType={entity.entityType}
           />
         </div>
      )}
    </>
  );
}
