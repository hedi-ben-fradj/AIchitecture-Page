'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { virtualStaging } from '@/ai/flows/virtual-staging';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

const furnitureStyles = ['Modern', 'Minimalist', 'Scandinavian', 'Bohemian', 'Industrial', 'Coastal'];

export default function VirtualStagingClient() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(furnitureStyles[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError("File size must be less than 4MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setStagedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!originalImage) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setStagedImage(null);

    try {
      const result = await virtualStaging({
        photoDataUri: originalImage,
        furnitureStyle: selectedStyle,
      });
      setStagedImage(result.stagedPhotoDataUri);
    } catch (err) {
      console.error(err);
      setError('An error occurred while staging the image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col gap-4">
            <h3 className="font-headline text-xl font-semibold text-center">1. Upload Your Image</h3>
            <Card className="aspect-video w-full flex items-center justify-center bg-muted/50 border-2 border-dashed">
              {originalImage ? (
                <div className="relative w-full h-full">
                  <Image src={originalImage} alt="Original room" layout="fill" objectFit="contain" />
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <Upload className="mx-auto h-12 w-12" />
                  <p className="mt-2">Click below to upload a photo</p>
                  <p className="text-xs mt-1">PNG, JPG, WEBP up to 4MB</p>
                </div>
              )}
            </Card>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
            <Button onClick={handleUploadClick} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-headline text-xl font-semibold text-center">3. See the Magic</h3>
            <Card className="aspect-video w-full flex items-center justify-center bg-muted/50">
              {isLoading && <Skeleton className="w-full h-full" />}
              {!isLoading && stagedImage && (
                <div className="relative w-full h-full">
                  <Image src={stagedImage} alt="Staged room" layout="fill" objectFit="contain" />
                </div>
              )}
              {!isLoading && !stagedImage && (
                <div className="text-center text-muted-foreground p-4">
                  <Sparkles className="mx-auto h-12 w-12" />
                  <p className="mt-2">Your virtually staged image will appear here</p>
                </div>
              )}
            </Card>
            <Button onClick={handleSubmit} disabled={isLoading || !originalImage}>
              {isLoading ? 'Staging...' : 'Generate'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-headline text-xl font-semibold text-center mb-4">2. Select a Style</h3>
          <div className="max-w-md mx-auto">
            <Select onValueChange={setSelectedStyle} defaultValue={selectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select a furniture style" />
              </SelectTrigger>
              <SelectContent>
                {furnitureStyles.map(style => (
                  <SelectItem key={style} value={style}>{style}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
