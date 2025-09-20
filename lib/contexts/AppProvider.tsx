"use client";

import React from "react";
import { MapProvider } from "./MapContext";
import { AnnotationProvider } from "./AnnotationContext";
import { SettingsProvider } from "./SettingsContext";
import { UIProvider } from "./UIContext";

// Main app provider that wraps all context providers
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <MapProvider>
      <AnnotationProvider>
        <SettingsProvider>
          <UIProvider>{children}</UIProvider>
        </SettingsProvider>
      </AnnotationProvider>
    </MapProvider>
  );
};

// Export all context hooks for convenience
export {
  useMapContext,
  useMapState,
  useSearchState,
  useMapActions,
} from "./MapContext";

export {
  useAnnotationContext,
  useAnnotationState,
  useAnnotationCounters,
  useAnnotationActions,
} from "./AnnotationContext";

export {
  useSettingsContext,
  useSettingsState,
  useFormState,
  useSettingsActions,
} from "./SettingsContext";

export {
  useUIContext,
  useUIDialogState,
  useCustomAnnotationFormState as useUICustomAnnotationFormState,
  useUIActions,
} from "./UIContext";
