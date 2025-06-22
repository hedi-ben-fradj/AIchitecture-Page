'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Save } from 'lucide-react';
import ImageEditor, { type ImageEditorRef } from '@/components/admin/image-editor';
import { useViews } from '@/contexts/views-context';
import { useRouter } from 'next/navigation';

interface ViewEditorClientProps {
  projectId: string;
  viewId: string;
}

export default function ViewEditorClient({ projectId, viewId }: ViewEditorClientProps) {
  const { getView, updateViewImage, updateViewSelections, addView } = useViews();
  const router = useRouter();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);

  const view = getView(viewId);

  useEffect(() => {
    // If the view doesn't exist (e.g., after deletion or bad URL), redirect.
    if (!view) {
      router.replace(`/admin/projects/${projectId}`);
      return;
    }
    if (view.imageUrl) {
      setImageToEdit(view.imageUrl);
    } else {
      setImageToEdit(null); // Reset if navigating to a view without an image
    }
  }, [view, router, projectId]);

  // If view is not found yet, show a loading state or return null to avoid errors.
  if (!view) {
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
      // 10MB limit as a safeguard against very large files crashing the browser.
      if (file.size > 10 * 1024 * 1024) { 
        alert("File size exceeds 10MB. Please choose a smaller image.");
        if(fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
          
          // Use JPEG with quality 0.9 for efficient compression.
          const resizedImageUrl = canvas.toDataURL('image/jpeg', 0.9);

          setImageToEdit(resizedImageUrl);
          updateViewImage(viewId, resizedImageUrl);
        };
        img.onerror = () => {
            alert("Failed to load the image file. It may be corrupt or in an unsupported format.");
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
    // Always reset the file input after a file is selected.
    // This allows the user to select the same file again if they need to.
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleMakeView = (newViewName: string) => {
    addView(newViewName);
    // No longer navigating, so the user stays on the editor page.
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveAndExit = () => {
    const currentPolygons = editorRef.current?.getRelativePolygons();
    if (view && currentPolygons) {
        updateViewSelections(view.id, currentPolygons);
        router.push(`/admin/projects/${projectId}`);
    }
  };


  return (
    <div className="flex flex-col h-full bg-[#313131]">
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-700 bg-[#3c3c3c]">
        <h1 className="text-xl font-semibold text-white">{viewName} Editor</h1>
        {imageToEdit && (
          <div className="flex gap-2">
            <Button onClick={triggerFileInput} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Change Image
            </Button>
            <Button onClick={handleSaveAndExit} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              <Save className="mr-2 h-4 w-4" />
              Save and Exit
            </Button>
          </div>
        )}
      </header>
      <div className="flex-1 p-8">
        <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept="image/png, image/jpeg, image/webp" />
        
        {!imageToEdit ? (
          <Card className="max-w-2xl mx-auto bg-[#2a2a2a] border-neutral-700 text-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">Upload Image for {viewName}</h2>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-neutral-400" />
                    <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>

                    <p className="text-xs text-neutral-500">PNG, JPG, or WEBP (MAX. 10MB)</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        ) : (
           <div>
             <h2 className="text-lg font-semibold mb-4 text-center text-white">Define Selections for {viewName}</h2>
             <ImageEditor
                ref={editorRef}
                imageUrl={imageToEdit}
                onMakeView={handleMakeView}
                initialPolygons={view?.selections}
             />
           </div>
        )}
      </div>
    </div>
  );
}
