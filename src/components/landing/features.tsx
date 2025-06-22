import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Box, Image as ImageIcon, Sparkles, Ruler, Info, Mail } from 'lucide-react';

const features = [
  {
    icon: <Box className="h-8 w-8 text-primary" />,
    title: '3D Property Viewer',
    description: 'Explore properties in interactive 3D with intuitive controls and multiple camera angles.',
  },
  {
    icon: <ImageIcon className="h-8 w-8 text-primary" />,
    title: 'Image Gallery',
    description: 'Display stunning, high-resolution photos of properties, including interiors and exteriors.',
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: 'Virtual Staging',
    description: 'Use AI to virtually stage homes with various furniture styles to inspire potential buyers.',
  },
  {
    icon: <Ruler className="h-8 w-8 text-primary" />,
    title: 'Interactive Floor Plans',
    description: 'View and interact with detailed floor plans, complete with dimensions and room layouts.',
  },
  {
    icon: <Info className="h-8 w-8 text-primary" />,
    title: 'Detailed Information',
    description: 'Provide comprehensive property details, including specs, amenities, and unique features.',
  },
  {
    icon: <Mail className="h-8 w-8 text-primary" />,
    title: 'Contact & Inquiries',
    description: 'Enable clients to easily contact agents or managers for specific property inquiries.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">A New Dimension in Property Tours</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Our powerful features are designed to create compelling and informative virtual experiences.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card hover:bg-accent/50 border-border transition-colors duration-300">
              <CardHeader className="flex flex-col items-center text-center p-6">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="font-headline text-xl text-primary">{feature.title}</CardTitle>
                <CardDescription className="mt-2 text-base text-muted-foreground">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
