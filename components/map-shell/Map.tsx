"use client";

import { DisclaimerDialog } from "./dialogs/disclaimer-dialog";
import { HelpDialog } from "./dialogs/help-dialog";

interface MapProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMapDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleMapDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  disclaimerOpen: boolean;
  setDisclaimerOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  safetyDistance: 70 | 100;
}

export const Map: React.FC<MapProps> = ({
  mapContainerRef,
  handleMapDrop,
  handleMapDragOver,
  disclaimerOpen,
  setDisclaimerOpen,
  helpOpen,
  setHelpOpen,
}) => {
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

      {/* Disclaimer Dialog */}
      <DisclaimerDialog
        disclaimerOpen={disclaimerOpen}
        setDisclaimerOpen={setDisclaimerOpen}
      />

      {/* Help Dialog */}
      <HelpDialog helpOpen={helpOpen} setHelpOpen={setHelpOpen} />
    </>
  );
};
