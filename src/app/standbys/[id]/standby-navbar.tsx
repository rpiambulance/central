'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'units', label: 'Units' },
  { id: 'encounters', label: 'Encounters' },
  { id: 'personnel', label: 'On standby' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'forms', label: 'Forms' },
];

/** Breathing room between the bar and the heading it scrolls to. */
const GAP = 8;

/**
 * Jumping about a long board.
 *
 * The bar is sticky, so it covers the top of the page: anything that scrolls
 * a heading to the top of the viewport scrolls it underneath this. Every
 * measurement here is against the line just below the bar rather than
 * against the top of the window.
 */
export function StandbyNavbar() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const barRef = useRef<HTMLDivElement>(null);
  /**
   * A click says where we are going. The smooth scroll that follows fires a
   * run of scroll events, and every one of them would otherwise vote on
   * where we are while we are still on the way there — which is how
   * pressing one name lit up another.
   */
  const holding = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lineY = () =>
    (barRef.current?.getBoundingClientRect().height ?? 0) + GAP;

  const spy = useCallback(() => {
    if (holding.current) return;
    const line = lineY();

    // The last section is usually too short to reach the line: the page
    // runs out before it gets there, and no amount of scrolling will bring
    // it up. Being unable to scroll any further is what "you are at the
    // end" means, whatever the arithmetic says about tops.
    const atEnd =
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2;
    if (atEnd) {
      const last = [...SECTIONS]
        .reverse()
        .find((section) => document.getElementById(section.id));
      if (last) setActive(last.id);
      return;
    }

    // Otherwise: the last one whose top has passed the line, which is the
    // one being read. Taking every section above the middle of the window
    // instead meant a short section handed the highlight to the one after.
    // Above the first heading nothing has passed it, and the first section
    // is the honest answer.
    let current = SECTIONS[0].id;
    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el && el.getBoundingClientRect().top - line <= 1) current = section.id;
    }
    setActive(current);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        spy();
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      if (holding.current) clearTimeout(holding.current);
    };
  }, [spy]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    if (holding.current) clearTimeout(holding.current);
    holding.current = setTimeout(() => {
      holding.current = null;
    }, 700);
    window.scrollTo({
      top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - lineY()),
      behavior: 'smooth',
    });
  };

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav className="flex gap-1 overflow-x-auto py-2 text-sm">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => go(section.id)}
            aria-current={active === section.id ? 'true' : undefined}
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
