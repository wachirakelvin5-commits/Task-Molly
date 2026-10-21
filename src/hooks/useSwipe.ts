import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';

interface SwipeOptions {
  /** Called once the pointer has moved far enough sideways to count as a swipe. */
  onStart: () => void;
  /** Called on every move with the horizontal distance (px) since the swipe began. */
  onMove: (dx: number) => void;
  /** Called when the finger or mouse is released, with the release speed in px per ms. */
  onEnd: (velocity: number) => void;
  /** Pixels of sideways movement before a press becomes a swipe instead of a tap. */
  threshold?: number;
}

/**
 * Touch and mouse swipe handling for horizontal carousels.
 *
 * Spread the returned handlers on the carousel container and give it the
 * `touch-action: pan-y` style (Tailwind `touch-pan-y`) so the page can still
 * scroll vertically. A tap still works as a normal click; a swipe swallows the
 * click that would follow it so a card doesn't open by accident.
 */
export function useSwipe({ onStart, onMove, onEnd, threshold = 6 }: SwipeOptions) {
  const state = useRef({
    active: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const suppressClick = useRef(false);

  const finish = (e: ReactPointerEvent<HTMLElement>) => {
    const s = state.current;
    if (!s.active || e.pointerId !== s.pointerId) return;
    s.active = false;
    if (!s.dragging) return;
    s.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Ignore old speed if the pointer was held still before release.
    const velocity = performance.now() - s.lastT > 80 ? 0 : s.velocity;
    suppressClick.current = true;
    // The click (if any) fires right after pointerup; clear the flag after it.
    setTimeout(() => { suppressClick.current = false; }, 0);
    onEnd(velocity);
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const s = state.current;
      s.active = true;
      s.dragging = false;
      s.pointerId = e.pointerId;
      s.startX = s.lastX = e.clientX;
      s.startY = e.clientY;
      s.lastT = performance.now();
      s.velocity = 0;
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.dragging) {
        if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
          s.dragging = true;
          // Capture only once it is a swipe, so plain taps still click the card under the finger.
          e.currentTarget.setPointerCapture(e.pointerId);
          onStart();
        } else if (Math.abs(dy) > threshold) {
          s.active = false; // Vertical gesture: let the page scroll.
          return;
        } else {
          return;
        }
      }

      const now = performance.now();
      const dt = now - s.lastT;
      if (dt > 0) {
        // Smooth the speed a little so one jittery sample doesn't dominate.
        s.velocity = 0.8 * ((e.clientX - s.lastX) / dt) + 0.2 * s.velocity;
      }
      s.lastX = e.clientX;
      s.lastT = now;
      onMove(dx);
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => {
      if (suppressClick.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick.current = false;
      }
    },
    onDragStart: (e: ReactMouseEvent<HTMLElement>) => e.preventDefault(),
  };
}
