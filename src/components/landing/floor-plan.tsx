import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

export default function FloorPlan() {
  return (
    <section id="plans" className="py-20 md:py-28 bg-primary/5">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Interactive Floor Plans</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Understand the property layout at a glance. Click, zoom, and explore every room's dimensions and flow.
          </p>
        </div>
        <Card className="overflow-hidden shadow-xl">
          <CardContent className="p-4 md:p-6">
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-muted">
              <Image 
                src="https://placehold.co/1200x675.png" 
                alt="Interactive Floor Plan" 
                layout="fill" 
                objectFit="cover" 
                data-ai-hint="floor plan"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                <h3 className="font-headline text-xl md:text-2xl font-bold text-white">The Grand Residence - Floor 1</h3>
                <p className="text-white/80 mt-1">2,400 sq. ft. | 2 Bedrooms + Office</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
