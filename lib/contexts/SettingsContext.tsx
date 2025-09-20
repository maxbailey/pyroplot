"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useSettingsStore, settingsSelectors } from "@/lib/store";
import {
  useSettings,
  useFormHandling,
  useCustomAnnotationForm,
  useSettingsValidation,
  useSettingsDialog,
} from "@/lib/hooks";
import type { MeasurementUnit, SafetyDistance } from "@/lib/types";

// Settings context interface
interface SettingsContextValue {
  // Settings state
  measurementUnit: MeasurementUnit;
  safetyDistance: SafetyDistance;
  projectName: string;
  settingsOpen: boolean;

  // Form state
  formProjectName: string;
  formMeasurementUnit: MeasurementUnit;
  formSafetyDistance: SafetyDistance;
  hasFormChanges: boolean;

  // Validation state
  isValid: boolean;
  errors: Record<string, string>;

  // Settings actions
  setMeasurementUnit: (unit: MeasurementUnit) => void;
  setSafetyDistance: (distance: SafetyDistance) => void;
  setProjectName: (name: string) => void;

  // Form actions
  setFormProjectName: (name: string) => void;
  setFormMeasurementUnit: (unit: MeasurementUnit) => void;
  setFormSafetyDistance: (distance: SafetyDistance) => void;
  setHasFormChanges: (hasChanges: boolean) => void;

  // Dialog actions
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;

  // Form handling
  handleFormChange: (field: string, value: string | number) => void;
  handleSaveSettings: () => void;
  handleCancelSettings: () => void;
  resetForm: () => void;

  // Validation
  validateForm: () => { isValid: boolean; errors: string[] };
  isFormDirty: () => boolean;
}

// Create the context
const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

// Settings context provider
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get store state and actions
  const {
    measurementUnit,
    safetyDistance,
    projectName,
    settingsOpen,
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
    hasFormChanges,
    setMeasurementUnit,
    setSafetyDistance,
    setProjectName,
    setFormProjectName,
    setFormMeasurementUnit,
    setFormSafetyDistance,
    setHasFormChanges,
    openSettingsDialog: storeOpenSettingsDialog,
    closeSettingsDialog: storeCloseSettingsDialog,
    handleFormChange: storeHandleFormChange,
    saveSettings: storeSaveSettings,
    cancelSettings: storeCancelSettings,
    resetForm: storeResetForm,
    validateForm: storeValidateForm,
    isFormDirty: storeIsFormDirty,
    setCustomLabel,
    setCustomColor,
  } = useSettingsStore();

  // Get hooks - custom annotation form is handled in UI context

  // Memoized computed values
  const validation = useMemo(() => {
    return storeValidateForm();
  }, [
    storeValidateForm,
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
  ]);

  const isValid = validation.isValid;
  const errors = useMemo(() => {
    const errorObj: Record<string, string> = {};

    // Convert array errors to object format
    validation.errors.forEach((error, index) => {
      if (error.includes("Project name")) {
        errorObj.projectName = error;
      } else if (error.includes("Measurement unit")) {
        errorObj.measurementUnit = error;
      } else if (error.includes("Safety distance")) {
        errorObj.safetyDistance = error;
      } else {
        errorObj[`error${index}`] = error;
      }
    });

    return errorObj;
  }, [validation.errors]);

  // Memoized action handlers
  const openSettingsDialog = useCallback(() => {
    storeOpenSettingsDialog();
  }, [storeOpenSettingsDialog]);

  const closeSettingsDialog = useCallback(() => {
    storeCloseSettingsDialog();
  }, [storeCloseSettingsDialog]);

  const handleFormChange = useCallback(
    (field: string, value: string | number) => {
      storeHandleFormChange();
    },
    [storeHandleFormChange]
  );

  const handleSaveSettings = useCallback(() => {
    storeSaveSettings();
  }, [storeSaveSettings]);

  const handleCancelSettings = useCallback(() => {
    storeCancelSettings();
  }, [storeCancelSettings]);

  const resetForm = useCallback(() => {
    storeResetForm();
  }, [storeResetForm]);

  const validateForm = useCallback(() => {
    return storeValidateForm();
  }, [storeValidateForm]);

  const isFormDirty = useCallback(() => {
    return storeIsFormDirty();
  }, [storeIsFormDirty]);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      // Settings state
      measurementUnit,
      safetyDistance,
      projectName,
      settingsOpen,

      // Form state
      formProjectName,
      formMeasurementUnit,
      formSafetyDistance,
      hasFormChanges,

      // Validation state
      isValid,
      errors,

      // Settings actions
      setMeasurementUnit,
      setSafetyDistance,
      setProjectName,

      // Form actions
      setFormProjectName,
      setFormMeasurementUnit,
      setFormSafetyDistance,
      setHasFormChanges,

      // Dialog actions
      openSettingsDialog,
      closeSettingsDialog,

      // Form handling
      handleFormChange,
      handleSaveSettings,
      handleCancelSettings,
      resetForm,

      // Validation
      validateForm: storeValidateForm,
      isFormDirty,
    }),
    [
      measurementUnit,
      safetyDistance,
      projectName,
      settingsOpen,
      formProjectName,
      formMeasurementUnit,
      formSafetyDistance,
      hasFormChanges,
      isValid,
      errors,
      setMeasurementUnit,
      setSafetyDistance,
      setProjectName,
      setFormProjectName,
      setFormMeasurementUnit,
      setFormSafetyDistance,
      setHasFormChanges,
      openSettingsDialog,
      closeSettingsDialog,
      handleFormChange,
      handleSaveSettings,
      handleCancelSettings,
      resetForm,
      storeValidateForm,
      isFormDirty,
    ]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook to use settings context
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider"
    );
  }
  return context;
};

// Selector hooks for specific parts of settings state
export const useSettingsState = () => {
  const { measurementUnit, safetyDistance, projectName, settingsOpen } =
    useSettingsContext();
  return {
    measurementUnit,
    safetyDistance,
    projectName,
    settingsOpen,
  };
};

export const useFormState = () => {
  const {
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
    hasFormChanges,
    isValid,
    errors,
  } = useSettingsContext();
  return {
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
    hasFormChanges,
    isValid,
    errors,
  };
};

export const useSettingsActions = () => {
  const {
    setMeasurementUnit,
    setSafetyDistance,
    setProjectName,
    setFormProjectName,
    setFormMeasurementUnit,
    setFormSafetyDistance,
    setHasFormChanges,
    openSettingsDialog,
    closeSettingsDialog,
    handleFormChange,
    handleSaveSettings,
    handleCancelSettings,
    resetForm,
    validateForm,
    isFormDirty,
  } = useSettingsContext();
  return {
    setMeasurementUnit,
    setSafetyDistance,
    setProjectName,
    setFormProjectName,
    setFormMeasurementUnit,
    setFormSafetyDistance,
    setHasFormChanges,
    openSettingsDialog,
    closeSettingsDialog,
    handleFormChange,
    handleSaveSettings,
    handleCancelSettings,
    resetForm,
    validateForm,
    isFormDirty,
  };
};
