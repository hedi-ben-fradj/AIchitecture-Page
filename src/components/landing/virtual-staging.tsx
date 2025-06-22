import VirtualStagingClient from './virtual-staging-client';

export default function VirtualStaging() {
  return (
    <section id="staging" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">AI-Powered Virtual Staging</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Upload a photo of an empty room and let our AI furnish it. Help clients visualize the potential of any space.
          </p>
        </div>
        <VirtualStagingClient />
      </div>
    </section>
  );
}
