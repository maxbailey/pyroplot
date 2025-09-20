"use client";

import { HelpDialog } from "./dialogs/help-dialog";
import { useMapContext, useUIContext } from "@/lib/contexts";
import { useMapInitialization } from "@/lib/hooks";

interface MapProps {
  // Only essential props that can't be provided via context
  handleMapDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleMapDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const Map: React.FC<MapProps> = ({
  handleMapDrop,
  handleMapDragOver,
}) => {
  // Get context values
  const { mapContainerRef } = useMapContext();
  const { helpOpen, setHelpOpen } = useUIContext();
  return (
    <>
      <div className="flex-1">
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          onDrop={handleMapDrop}
          onDragOver={handleMapDragOver}
        />
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand text-black flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200 ease-in-out"
        aria-label="Open help"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>

      {/* Help Dialog */}
      <HelpDialog helpOpen={helpOpen} setHelpOpen={setHelpOpen} />
    </>
  );
};
