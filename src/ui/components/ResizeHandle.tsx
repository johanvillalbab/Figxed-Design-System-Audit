import React, { useCallback, useRef } from 'react';
import { postToPlugin } from '../hooks/usePluginMessages';

export function ResizeHandle() {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newW = startSize.current.w + dx;
    const newH = startSize.current.h + dy;
    postToPlugin({ type: 'RESIZE', payload: { width: newW, height: newH } });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M9 5L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M9 9L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
