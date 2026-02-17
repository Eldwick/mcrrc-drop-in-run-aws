"use client";

import { useRef, useCallback, useState } from "react";

type SnapState = "collapsed" | "half" | "full";

interface BottomSheetProps {
  snapState: SnapState;
  onSnapStateChange: (state: SnapState) => void;
  summary: string;
  collapsedHeight?: number;
  children: React.ReactNode;
}

const HANDLE_HEIGHT = 70;
const HALF_RATIO = 0.75;

function getSnapHeight(state: SnapState, collapsedH: number): string {
  switch (state) {
    case "collapsed":
      return `${collapsedH}px`;
    case "half":
      return `${HALF_RATIO * 100}vh`;
    case "full":
      return "calc(100vh - 40px)";
  }
}

function getVisibleHeight(state: SnapState, viewportHeight: number, collapsedH: number): number {
  switch (state) {
    case "collapsed":
      return collapsedH;
    case "half":
      return viewportHeight * HALF_RATIO;
    case "full":
      return viewportHeight - 40;
  }
}

function nearestSnap(visibleHeight: number, viewportHeight: number, collapsedH: number): SnapState {
  const halfH = viewportHeight * HALF_RATIO;
  const fullH = viewportHeight - 40;

  const midCollapseHalf = (collapsedH + halfH) / 2;
  const midHalfFull = (halfH + fullH) / 2;

  if (visibleHeight < midCollapseHalf) return "collapsed";
  if (visibleHeight < midHalfFull) return "half";
  return "full";
}

export const BottomSheet = ({
  snapState,
  onSnapStateChange,
  summary,
  collapsedHeight = HANDLE_HEIGHT,
  children,
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVisibleHeight = useRef(0);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const height = dragHeight !== null ? `${dragHeight}px` : getSnapHeight(snapState, collapsedHeight);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startVisibleHeight.current = getVisibleHeight(
        snapState,
        window.innerHeight,
        collapsedHeight
      );
      setTransitionEnabled(false);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [snapState, collapsedHeight]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaY = startY.current - e.clientY;
    const newVisibleHeight = Math.max(
      HANDLE_HEIGHT,
      Math.min(window.innerHeight - 40, startVisibleHeight.current + deltaY)
    );
    setDragHeight(newVisibleHeight);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const deltaY = startY.current - e.clientY;
      const newVisibleHeight = Math.max(
        HANDLE_HEIGHT,
        Math.min(
          window.innerHeight - 40,
          startVisibleHeight.current + deltaY
        )
      );

      const snap = nearestSnap(newVisibleHeight, window.innerHeight, collapsedHeight);
      setTransitionEnabled(true);
      setDragHeight(null);
      onSnapStateChange(snap);
    },
    [onSnapStateChange, collapsedHeight]
  );

  const handleHandleClick = useCallback(() => {
    if (snapState === "collapsed") {
      onSnapStateChange("half");
    } else if (snapState === "half") {
      onSnapStateChange("collapsed");
    }
  }, [snapState, onSnapStateChange]);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-10 flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{
        height,
        transition: transitionEnabled
          ? "height 300ms ease-out"
          : "none",
      }}
    >
      {/* Handle area */}
      <div
        className="flex shrink-0 cursor-pointer flex-col items-center rounded-t-2xl border-b border-gray-200 bg-gray-50 pb-3 pt-3 touch-none select-none transition-colors active:bg-gray-100"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleHandleClick}
      >
        <div className="h-1.5 w-12 rounded-full bg-gray-400" />
        <div className="mt-2 flex items-center gap-1.5">
          <p className="text-sm font-semibold text-brand-navy">{summary}</p>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              snapState !== "collapsed" ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        data-bottom-sheet-scroll
        className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6"
      >
        {children}
      </div>
    </div>
  );
};
