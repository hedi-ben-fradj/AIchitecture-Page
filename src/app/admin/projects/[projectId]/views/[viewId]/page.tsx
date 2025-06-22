'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import ImageEditor from '@/components/admin/image-editor';

export default function ViewEditorPage({ params }: { params: { projectId: string; viewId: string } }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const viewName = params.viewId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = () => {
    if (uploadedImage) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#313131]">
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-700 bg-[#3c3c3c]">
        <h1 className="text-xl font-semibold text-white">{viewName} Editor</h1>
        {currentStep === 1 && uploadedImage && (
          <Button onClick={handleNextStep}>Next Step</Button>
        )}
      </header>
      <div className="flex-1 p-8">
        {/* Step Indicator */}
        <ol className="flex items-center w-full max-w-2xl mx-auto mb-8">
            <li className={`flex w-full items-center ${currentStep >= 1 ? 'text-yellow-500' : 'text-neutral-500'} after:content-[''] after:w-full after:h-1 after:border-b ${currentStep > 1 ? 'after:border-yellow-500' : 'after:border-neutral-700'} after:border-2 after:inline-block`}>
                <span className={`flex items-center justify-center w-10 h-10 ${currentStep >= 1 ? 'bg-[#2a2a2a]' : 'bg-neutral-800'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                    1
                </span>
            </li>
            <li className="flex items-center">
                <span className={`flex items-center justify-center w-10 h-10 ${currentStep >= 2 ? 'bg-[#2a2a2a] text-yellow-500' : 'bg-neutral-800 text-neutral-500'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                   2
                </span>
            </li>
        </ol>

        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto bg-[#2a2a2a] border-neutral-700 text-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">Step 1: Upload Image</h2>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-neutral-600 border-dashed rounded-lg cursor-pointer bg-[#313131] hover:bg-neutral-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-neutral-400" />
                    <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-neutral-500">SVG, PNG, JPG or GIF</p>
                  </div>
                  <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {uploadedImage && (
                <div className="mt-4 text-center">
                  <p className="text-green-400">Image selected!</p>
                  <img src={uploadedImage} alt="Preview" className="mx-auto mt-2 max-h-40 rounded-md" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && uploadedImage && (
           <div>
             <h2 className="text-lg font-semibold mb-4 text-center text-white">Step 2: Define Selections</h2>
             <ImageEditor imageUrl={uploadedImage} />
           </div>
        )}
      </div>
    </div>
  );
}
