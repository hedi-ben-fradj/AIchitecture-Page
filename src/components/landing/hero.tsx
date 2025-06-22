import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative py-24 md:py-32 lg:py-40 bg-gradient-to-b from-background to-primary/10">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 text-center">
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground">
          Visualize the Future of Real Estate
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-foreground/80">
          AIchitect Viewer provides an immersive, interactive way to showcase properties, buildings, and residential complexes to your clients.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="#contact">
            <Button size="lg">
              Request a Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
          <a href="#features">
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
