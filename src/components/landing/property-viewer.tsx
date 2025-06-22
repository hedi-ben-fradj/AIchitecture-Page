'use client';

import InteractiveLandingViewer from './interactive-landing-viewer';

export default function PropertyViewer() {
  return (
    <section
      id="explore"
      className="relative h-screen w-full text-white overflow-hidden"
    >
      <InteractiveLandingViewer projectId="porto-montenegro" />
    </section>
  );
}
