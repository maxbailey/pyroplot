import { useCallback, useEffect } from "react";
import { useSettingsStore, settingsSelectors } from "@/lib/store";
import type { MeasurementUnit, SafetyDistance } from "@/lib/types";

// Main settings hook
export const useSettings = () => {
  const {
    projectName,
    measurementUnit,
    safetyDistance,
    setProjectName,
    setMeasurementUnit,
    setSafetyDistance,
  } = useSettingsStore();

  return {
    projectName,
    measurementUnit,
    safetyDistance,
    setProjectName,
    setMeasurementUnit,
    setSafetyDistance,
  };
};

// Form handling hook
export const useFormHandling = () => {
  const {
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
    hasFormChanges,
    setFormProjectName,
    setFormMeasurementUnit,
    setFormSafetyDistance,
    handleFormChange,
    saveSettings,
    cancelSettings,
    resetForm,
    validateForm,
    isFormDirty,
  } = useSettingsStore();

  const updateFormProjectName = useCallback(
    (name: string) => {
      setFormProjectName(name);
      handleFormChange();
    },
    [setFormProjectName, handleFormChange]
  );

  const updateFormMeasurementUnit = useCallback(
    (unit: MeasurementUnit) => {
      setFormMeasurementUnit(unit);
      handleFormChange();
    },
    [setFormMeasurementUnit, handleFormChange]
  );

  const updateFormSafetyDistance = useCallback(
    (distance: SafetyDistance) => {
      setFormSafetyDistance(distance);
      handleFormChange();
    },
    [setFormSafetyDistance, handleFormChange]
  );

  const handleSave = useCallback(() => {
    const validation = validateForm();
    if (validation.isValid) {
      saveSettings();
    } else {
      console.error("Form validation failed:", validation.errors);
    }
  }, [saveSettings, validateForm]);

  const handleCancel = useCallback(() => {
    cancelSettings();
  }, [cancelSettings]);

  const handleReset = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const validation = validateForm();
  const isDirty = isFormDirty();

  return {
    formProjectName,
    formMeasurementUnit,
    formSafetyDistance,
    hasFormChanges,
    updateFormProjectName,
    updateFormMeasurementUnit,
    updateFormSafetyDistance,
    handleSave,
    handleCancel,
    handleReset,
    isValid: validation.isValid,
    errors: validation.errors,
    isDirty,
  };
};

// Custom annotation form hook
export const useCustomAnnotationForm = () => {
  const { customLabel, customColor, setCustomLabel, setCustomColor } =
    useSettingsStore();

  const updateCustomLabel = useCallback(
    (label: string) => {
      setCustomLabel(label);
    },
    [setCustomLabel]
  );

  const updateCustomColor = useCallback(
    (color: string) => {
      setCustomColor(color);
    },
    [setCustomColor]
  );

  const resetCustomForm = useCallback(() => {
    setCustomLabel("");
    setCustomColor("#8B5CF6"); // Default custom color
  }, [setCustomLabel, setCustomColor]);

  return {
    customLabel,
    customColor,
    updateCustomLabel,
    updateCustomColor,
    resetCustomForm,
  };
};

// Settings validation hook
export const useSettingsValidation = () => {
  const { validateForm, isFormDirty } = useSettingsStore();

  const validation = validateForm();
  const isDirty = isFormDirty();

  return {
    isFormValid: validation.isValid,
    isFormDirty: isDirty,
    errors: validation.errors,
    hasErrors: validation.errors.length > 0,
  };
};

// Settings persistence hook
export const useSettingsPersistence = () => {
  const { loadSettings, resetAllSettings } = useSettingsStore();

  const loadSettingsFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem("pyroplot-settings");
      if (saved) {
        const settings = JSON.parse(saved);
        loadSettings(settings);
      }
    } catch (error) {
      console.error("Failed to load settings from storage:", error);
    }
  }, [loadSettings]);

  const saveSettingsToStorage = useCallback(() => {
    try {
      const { projectName, measurementUnit, safetyDistance } =
        useSettingsStore.getState();
      const settings = {
        projectName,
        measurementUnit,
        safetyDistance,
        timestamp: Date.now(),
      };
      localStorage.setItem("pyroplot-settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to storage:", error);
    }
  }, []);

  const clearSettingsFromStorage = useCallback(() => {
    try {
      localStorage.removeItem("pyroplot-settings");
      resetAllSettings();
    } catch (error) {
      console.error("Failed to clear settings from storage:", error);
    }
  }, [resetAllSettings]);

  // Auto-save settings when they change
  useEffect(() => {
    const unsubscribe = useSettingsStore.subscribe(
      (state) => ({
        projectName: state.projectName,
        measurementUnit: state.measurementUnit,
        safetyDistance: state.safetyDistance,
      }),
      (settings) => {
        if (
          settings.projectName ||
          settings.measurementUnit ||
          settings.safetyDistance
        ) {
          saveSettingsToStorage();
        }
      }
    );

    return unsubscribe;
  }, [saveSettingsToStorage]);

  return {
    loadSettingsFromStorage,
    saveSettingsToStorage,
    clearSettingsFromStorage,
  };
};

// Settings export/import hook
export const useSettingsExport = () => {
  const { projectName, measurementUnit, safetyDistance } = useSettingsStore();

  const exportSettings = useCallback(() => {
    const settings = {
      projectName,
      measurementUnit,
      safetyDistance,
      version: "1.0",
      timestamp: Date.now(),
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pyroplot-settings-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [projectName, measurementUnit, safetyDistance]);

  const importSettings = useCallback((file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          useSettingsStore.getState().loadSettings(settings);
          resolve(settings);
        } catch (error) {
          reject(new Error("Invalid settings file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }, []);

  return {
    exportSettings,
    importSettings,
  };
};

// Settings dialog hook
export const useSettingsDialog = () => {
  const {
    settingsOpen,
    openSettingsDialog,
    closeSettingsDialog,
    saveSettings,
    cancelSettings,
  } = useSettingsStore();

  const openDialog = useCallback(() => {
    openSettingsDialog();
  }, [openSettingsDialog]);

  const closeDialog = useCallback(() => {
    closeSettingsDialog();
  }, [closeSettingsDialog]);

  const handleSave = useCallback(() => {
    saveSettings();
  }, [saveSettings]);

  const handleCancel = useCallback(() => {
    cancelSettings();
  }, [cancelSettings]);

  return {
    settingsOpen,
    openDialog,
    closeDialog,
    handleSave,
    handleCancel,
  };
};
