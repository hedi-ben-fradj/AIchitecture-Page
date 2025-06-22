import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Bath, Car, AreaChart } from 'lucide-react';

const propertyInfo = {
  title: 'Modern Villa with Ocean View',
  location: 'Malibu, California',
  price: '$5,450,000',
  specs: [
    { icon: <BedDouble className="h-5 w-5" />, label: '4 Bedrooms' },
    { icon: <Bath className="h-5 w-5" />, label: '5 Bathrooms' },
    { icon: <Car className="h-5 w-5" />, label: '3-Car Garage' },
    { icon: <AreaChart className="h-5 w-5" />, label: '4,800 sq. ft.' },
  ],
  gallery: [
    { src: 'https://placehold.co/600x400.png', alt: 'Living room', hint: 'living room' },
    { src: 'https://placehold.co/600x400.png', alt: 'Kitchen', hint: 'kitchen modern' },
    { src: 'https://placehold.co/600x400.png', alt: 'Bedroom', hint: 'bedroom modern' },
    { src: 'https://placehold.co/600x400.png', alt: 'Exterior view', hint: 'modern house' },
  ],
};

export default function PropertyViewer() {
  return (
    <section id="apartments" className="py-20 md:py-28 bg-background/80">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Apartments</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Explore our available apartments. Use our interactive tools to explore every detail.
          </p>
        </div>
        <Card className="overflow-hidden bg-card border-border shadow-2xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 md:p-8">
                <Badge variant="outline" className="mb-2 border-primary/20 text-primary">Featured Property</Badge>
                <h3 className="font-headline text-2xl md:text-3xl font-bold text-primary">{propertyInfo.title}</h3>
                <p className="text-muted-foreground mt-1">{propertyInfo.location}</p>
                <p className="font-headline text-3xl md:text-4xl font-bold text-primary my-4">{propertyInfo.price}</p>
                
                <div className="grid grid-cols-2 gap-4 my-6">
                  {propertyInfo.specs.map(spec => (
                    <div key={spec.label} className="flex items-center gap-3 text-foreground">
                      <div className="text-primary">{spec.icon}</div>
                      <span>{spec.label}</span>
                    </div>
                  ))}
                </div>

                <div className="relative aspect-video w-full rounded-lg overflow-hidden mt-6 bg-muted">
                   <Image src="https://placehold.co/800x450.png" alt="3D property viewer" fill className="object-cover" data-ai-hint="3d model property"/>
                   <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                     <p className="text-white font-semibold text-lg">Interactive 3D Viewer</p>
                   </div>
                </div>
              </div>
              <div className="p-6 md:p-8 bg-black/20">
                <h4 className="font-headline text-xl font-semibold mb-4 text-primary">Image Gallery</h4>
                <div className="grid grid-cols-2 gap-4">
                  {propertyInfo.gallery.map((image, index) => (
                    <div key={index} className="relative aspect-video w-full rounded-lg overflow-hidden group">
                      <Image src={image.src} alt={image.alt} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={image.hint}/>
                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-semibold">{image.alt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
