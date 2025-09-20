// Store exports
export { useMapStore, mapSelectors } from "./map-store";
export { useAnnotationStore, annotationSelectors } from "./annotation-store";
export { useSettingsStore, settingsSelectors } from "./settings-store";
export { useUIStore, uiSelectors } from "./ui-store";

// Re-export store types for convenience
export type { MapStore } from "./map-store";
export type { AnnotationStore } from "./annotation-store";
export type { SettingsStore } from "./settings-store";
export type { UIStore } from "./ui-store";

// Combined store type for when you need access to all stores
export type AllStores = {
  map: ReturnType<typeof useMapStore>;
  annotation: ReturnType<typeof useAnnotationStore>;
  settings: ReturnType<typeof useSettingsStore>;
  ui: ReturnType<typeof useUIStore>;
};

// Store initialization helper
export const initializeStores = () => {
  // This function can be used to initialize stores with default values
  // or perform any setup that needs to happen when the app starts
  console.log("Initializing Zustand stores...");

  // TODO: Add any initialization logic here
  // For example, loading saved settings from localStorage
  // or setting up store subscriptions
};

// Store cleanup helper
export const cleanupStores = () => {
  // This function can be used to clean up stores when the app unmounts
  // or when navigating away from the app
  console.log("Cleaning up Zustand stores...");

  // TODO: Add any cleanup logic here
  // For example, saving state to localStorage
  // or unsubscribing from external services
};

// Store persistence helpers (for future use)
export const persistStores = () => {
  // This function can be used to persist store state to localStorage
  // or other storage mechanisms
  console.log("Persisting store state...");

  // TODO: Implement persistence logic
};

export const restoreStores = () => {
  // This function can be used to restore store state from localStorage
  // or other storage mechanisms
  console.log("Restoring store state...");

  // TODO: Implement restoration logic
};
