// Map hooks
export {
  useMapInitialization,
  useSearch,
  useMapInteraction,
  useMapCamera,
  useMapEvents,
} from "./use-map";

// Annotation hooks
export {
  useAnnotations,
  useFireworkAnnotations,
  useCustomAnnotations,
  useAudienceAreas,
  useMeasurements,
  useRestrictedAreas,
  useAnnotationTextRefresh,
} from "./use-annotations";

// Settings hooks
export {
  useSettings,
  useFormHandling,
  useCustomAnnotationForm,
  useSettingsValidation,
  useSettingsPersistence,
  useSettingsExport,
  useSettingsDialog,
} from "./use-settings";

// Dialog hooks
export {
  useDialogs,
  useShareDialog,
  useLoadingStates,
  useErrorHandling,
  useDialogState,
} from "./use-dialogs";

// Re-export store hooks for convenience
export {
  useMapStore,
  useAnnotationStore,
  useSettingsStore,
  useUIStore,
} from "@/lib/store";
