import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { MeasurementUnit, SafetyDistance } from "../types";

// Settings state interface
interface SettingsState {
  // Project settings
  projectName: string;

  // Measurement settings
  measurementUnit: MeasurementUnit;
  safetyDistance: SafetyDistance;

  // Form state (for dialogs)
  formProjectName: string;
  formMeasurementUnit: MeasurementUnit;
  formSafetyDistance: SafetyDistance;
  hasFormChanges: boolean;

  // Custom annotation form state
  customLabel: string;
  customColor: string;
}

// Settings actions interface
interface SettingsActions {
  // Project settings
  setProjectName: (name: string) => void;

  // Measurement settings
  setMeasurementUnit: (unit: MeasurementUnit) => void;
  setSafetyDistance: (distance: SafetyDistance) => void;

  // Form state management
  setFormProjectName: (name: string) => void;
  setFormMeasurementUnit: (unit: MeasurementUnit) => void;
  setFormSafetyDistance: (distance: SafetyDistance) => void;
  setHasFormChanges: (hasChanges: boolean) => void;

  // Custom annotation form
  setCustomLabel: (label: string) => void;
  setCustomColor: (color: string) => void;

  // Form actions
  handleFormChange: () => void;
  saveSettings: () => void;
  cancelSettings: () => void;
  resetForm: () => void;

  // Bulk operations
  loadSettings: (settings: Partial<SettingsState>) => void;
  resetAllSettings: () => void;
}

// Combined store type
type SettingsStore = SettingsState & SettingsActions;

// Initial state
const initialState: SettingsState = {
  projectName: "",
  measurementUnit: "feet",
  safetyDistance: 70,
  formProjectName: "",
  formMeasurementUnit: "feet",
  formSafetyDistance: 70,
  hasFormChanges: false,
  customLabel: "",
  customColor: "#8B5CF6", // Default custom color
};

// Create the settings store
export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Project settings
    setProjectName: (name) => set({ projectName: name }),

    // Measurement settings
    setMeasurementUnit: (unit) => set({ measurementUnit: unit }),
    setSafetyDistance: (distance) => set({ safetyDistance: distance }),

    // Form state management
    setFormProjectName: (name) => set({ formProjectName: name }),
    setFormMeasurementUnit: (unit) => set({ formMeasurementUnit: unit }),
    setFormSafetyDistance: (distance) => set({ formSafetyDistance: distance }),
    setHasFormChanges: (hasChanges) => set({ hasFormChanges: hasChanges }),

    // Custom annotation form
    setCustomLabel: (label) => set({ customLabel: label }),
    setCustomColor: (color) => set({ customColor: color }),

    // Form actions
    handleFormChange: () => set({ hasFormChanges: true }),

    saveSettings: () => {
      const state = get();
      set({
        projectName: state.formProjectName,
        measurementUnit: state.formMeasurementUnit,
        safetyDistance: state.formSafetyDistance,
        hasFormChanges: false,
      });
    },

    cancelSettings: () => {
      const state = get();
      set({
        formProjectName: state.projectName,
        formMeasurementUnit: state.measurementUnit,
        formSafetyDistance: state.safetyDistance,
        hasFormChanges: false,
      });
    },

    resetForm: () =>
      set({
        formProjectName: "",
        formMeasurementUnit: "feet",
        formSafetyDistance: 70,
        hasFormChanges: false,
        customLabel: "",
        customColor: "#8B5CF6",
      }),

    // Bulk operations
    loadSettings: (settings) =>
      set((state) => ({
        ...state,
        ...settings,
        // Reset form state when loading new settings
        formProjectName: settings.projectName ?? state.projectName,
        formMeasurementUnit: settings.measurementUnit ?? state.measurementUnit,
        formSafetyDistance: settings.safetyDistance ?? state.safetyDistance,
        hasFormChanges: false,
      })),

    resetAllSettings: () => set(initialState),
  }))
);

// Selector functions for performance optimization
export const settingsSelectors = {
  // Basic settings selectors
  projectName: (state: SettingsStore) => state.projectName,
  measurementUnit: (state: SettingsStore) => state.measurementUnit,
  safetyDistance: (state: SettingsStore) => state.safetyDistance,

  // Form state selectors
  formProjectName: (state: SettingsStore) => state.formProjectName,
  formMeasurementUnit: (state: SettingsStore) => state.formMeasurementUnit,
  formSafetyDistance: (state: SettingsStore) => state.formSafetyDistance,
  hasFormChanges: (state: SettingsStore) => state.hasFormChanges,

  // Custom annotation form selectors
  customLabel: (state: SettingsStore) => state.customLabel,
  customColor: (state: SettingsStore) => state.customColor,

  // Computed selectors
  isFormDirty: (state: SettingsStore) =>
    state.formProjectName !== state.projectName ||
    state.formMeasurementUnit !== state.measurementUnit ||
    state.formSafetyDistance !== state.safetyDistance,

  hasProjectName: (state: SettingsStore) => state.projectName.length > 0,

  // Settings object selectors
  currentSettings: (state: SettingsStore) => ({
    projectName: state.projectName,
    measurementUnit: state.measurementUnit,
    safetyDistance: state.safetyDistance,
  }),

  formSettings: (state: SettingsStore) => ({
    projectName: state.formProjectName,
    measurementUnit: state.formMeasurementUnit,
    safetyDistance: state.formSafetyDistance,
  }),

  customAnnotationForm: (state: SettingsStore) => ({
    label: state.customLabel,
    color: state.customColor,
  }),
};
