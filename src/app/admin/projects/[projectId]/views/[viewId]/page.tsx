'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import ImageEditor from '@/components/admin/image-editor';
import { useViews } from '@/contexts/views-context';

export default function ViewEditorPage({ params }: { params: { projectId: string; viewId: string } }) {
  const { getView, updateViewImage, addView } = useViews();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const view = getView(params.viewId);
  const viewName = view?.name || params.viewId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  useEffect(() => {
    if (view?.imageUrl) {
      setImageToEdit(view.imageUrl);
    } else {
      setImageToEdit(null); // Reset if navigating to a view without an image
    }
  }, [view]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageToEdit(result);
        updateViewImage(params.viewId, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMakeView = (newViewName: string) => {
    addView(newViewName);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#313131]">
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-700 bg-[#3c3c3c]">
        <h1 className="text-xl font-semibold text-white">{viewName} Editor</h1>
        {imageToEdit && (
          <Button onClick={triggerFileInput} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Change Image
          </Button>
        )}
      </header>
      <div className="flex-1 p-8">
        <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
        
        {!imageToEdit ? (
          <Card className="max-w-2xl mx-auto bg-[#2a2a2a] border-neutral-700 text-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">Upload Image for {viewName}</h2>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-neutral-400" />
                    <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-neutral-500">SVG, PNG, JPG or GIF</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        ) : (
           <div>
             <h2 className="text-lg font-semibold mb-4 text-center text-white">Define Selections for {viewName}</h2>
             <ImageEditor imageUrl={imageToEdit} onMakeView={handleMakeView} />
           </div>
        )}
      </div>
    </div>
  );
}
