import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { MapPin } from 'lucide-react';

const stats = [
  { value: '5', label: 'minutes to the metro name' },
  { value: '17', label: 'minutes to the shopping center' },
  { value: '10', label: 'minutes to the center' },
];

export default function Hero() {
  return (
    <section id="home" className="relative h-screen min-h-[700px] w-full flex items-center justify-start text-white">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Modern apartment building"
        layout="fill"
        objectFit="cover"
        className="z-0"
        data-ai-hint="modern apartment building"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10" />
      
      <div className="container relative z-20 mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-xl text-left">
          <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-light tracking-wider uppercase">
            Your Place <br /> On Earth
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-md font-light">
            We are creating a complex for those who value living in a modern city. This is a new format that fully meets the requirements of a megapolis.
          </p>

          <Separator className="my-10 bg-white/20" />

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-headline text-5xl font-light">{stat.value}</p>
                <p className="text-sm text-white/70 mt-2 max-w-[100px] font-light tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-3 text-white/80 font-light">
            <MapPin className="h-5 w-5" />
            <span>Warsaw, str. Krasickiego</span>
          </div>
        </div>
      </div>
    </section>
  );
}
