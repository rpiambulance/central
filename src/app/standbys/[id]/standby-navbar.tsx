'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'units', label: 'Units' },
  { id: 'encounters', label: 'Encounters' },
  { id: 'personnel', label: 'On standby' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'forms', label: 'Forms' },
];

export function StandbyNavbar() {
  const [active, setActive] = useState<string>('units');

  useEffect(() => {
    const handleScroll = () => {
      // Find which section is in view
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If section is in the top half of viewport, mark it active
          if (rect.top < window.innerHeight / 2) {
            setActive(section.id);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scroll = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      setActive(sectionId);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="flex gap-1 overflow-x-auto px-4 py-2 text-sm">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => scroll(section.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors',
              active === section.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
