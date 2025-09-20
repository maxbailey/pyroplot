import { useCallback } from "react";
import { useUIStore, uiSelectors } from "@/lib/store";
import { useMapStore } from "@/lib/store";
import { useAnnotationStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/store";
import { encodeStateToHash } from "../utils/serialization";

// Main dialog management hook
export const useDialogs = () => {
  const {
    settingsOpen,
    customAnnotationOpen,
    shareOpen,
    disclaimerOpen,
    helpOpen,
    clearAnnotationsOpen,
    editingCustomAnnotation,
    customLabel,
    customColor,
    showHeight,
    setSettingsOpen,
    setCustomAnnotationOpen,
    setShareOpen,
    setDisclaimerOpen,
    setHelpOpen,
    setClearAnnotationsOpen,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    setShowHeight,
    closeAllDialogs,
  } = useUIStore();

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, [setSettingsOpen]);

  const openCustomAnnotation = useCallback(() => {
    setCustomAnnotationOpen(true);
  }, [setCustomAnnotationOpen]);

  const closeCustomAnnotation = useCallback(() => {
    setCustomAnnotationOpen(false);
  }, [setCustomAnnotationOpen]);

  const openShare = useCallback(() => {
    setShareOpen(true);
  }, [setShareOpen]);

  const closeShare = useCallback(() => {
    setShareOpen(false);
  }, [setShareOpen]);

  const openDisclaimer = useCallback(() => {
    setDisclaimerOpen(true);
  }, [setDisclaimerOpen]);

  const closeDisclaimer = useCallback(() => {
    setDisclaimerOpen(false);
  }, [setDisclaimerOpen]);

  const openHelp = useCallback(() => {
    setHelpOpen(true);
  }, [setHelpOpen]);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
  }, [setHelpOpen]);

  const openClearAnnotations = useCallback(() => {
    setClearAnnotationsOpen(true);
  }, [setClearAnnotationsOpen]);

  const closeClearAnnotations = useCallback(() => {
    setClearAnnotationsOpen(false);
  }, [setClearAnnotationsOpen]);

  const closeAll = useCallback(() => {
    closeAllDialogs();
  }, [closeAllDialogs]);

  return {
    // Dialog states
    settingsOpen,
    customAnnotationOpen,
    shareOpen,
    disclaimerOpen,
    helpOpen,
    clearAnnotationsOpen,

    // Custom annotation form state
    editingCustomAnnotation,
    customLabel,
    customColor,
    showHeight,

    // Dialog actions
    openSettings,
    closeSettings,
    openCustomAnnotation,
    closeCustomAnnotation,
    openShare,
    closeShare,
    openDisclaimer,
    closeDisclaimer,
    openHelp,
    closeHelp,
    openClearAnnotations,
    closeClearAnnotations,
    closeAll,

    // Custom annotation form actions
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    setShowHeight,
  };
};

// Share dialog hook
export const useShareDialog = () => {
  const {
    shareUrl,
    copied,
    setShareUrl,
    setCopied,
    setShareOpen,
    handleCopyUrl: storeHandleCopyUrl,
  } = useUIStore();

  // Get data from other stores
  const mapRef = useMapStore((state) => state.mapRef);
  const camera = useMapStore((state) => state.camera);
  const annotations = useAnnotationStore((state) => state.annotations);
  const audienceAreas = useAnnotationStore((state) => state.audienceAreas);
  const measurements = useAnnotationStore((state) => state.measurements);
  const restrictedAreas = useAnnotationStore((state) => state.restrictedAreas);
  const showHeight = useAnnotationStore((state) => state.showHeight);
  const measurementUnit = useSettingsStore((state) => state.measurementUnit);
  const projectName = useSettingsStore((state) => state.projectName);
  const safetyDistance = useSettingsStore((state) => state.safetyDistance);

  const handleCopyUrl = useCallback(async () => {
    await storeHandleCopyUrl();
  }, [storeHandleCopyUrl]);

  const generateShareUrl = useCallback(async () => {
    if (!mapRef) {
      console.error("Map not ready for sharing");
      return;
    }

    try {
      const hash = await encodeStateToHash(
        camera,
        annotations,
        audienceAreas,
        measurements,
        restrictedAreas,
        showHeight,
        measurementUnit,
        projectName,
        safetyDistance
      );
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      setShareUrl(url);
      setCopied(false);
      setShareOpen(true);
      return url;
    } catch (error) {
      console.error("Failed to generate share URL:", error);
      throw error;
    }
  }, [
    mapRef,
    camera,
    annotations,
    audienceAreas,
    measurements,
    restrictedAreas,
    showHeight,
    measurementUnit,
    projectName,
    safetyDistance,
    setShareUrl,
    setCopied,
    setShareOpen,
  ]);

  return {
    shareUrl,
    copied,
    generateShareUrl,
    handleCopyUrl,
  };
};

// Loading states hook
export const useLoadingStates = () => {
  const {
    isGenerating,
    isSearching,
    isMapLoading,
    setGenerating,
    setSearching,
    setMapLoading,
  } = useUIStore();

  const setGeneratingState = useCallback(
    (generating: boolean) => {
      setGenerating(generating);
    },
    [setGenerating]
  );

  const setSearchingState = useCallback(
    (searching: boolean) => {
      setSearching(searching);
    },
    [setSearching]
  );

  const setMapLoadingState = useCallback(
    (loading: boolean) => {
      setMapLoading(loading);
    },
    [setMapLoading]
  );

  return {
    isGenerating,
    isSearching,
    isMapLoading,
    isAnyLoading: isGenerating || isSearching || isMapLoading,
    setGeneratingState,
    setSearchingState,
    setMapLoadingState,
  };
};

// Error handling hook
export const useErrorHandling = () => {
  const {
    error,
    warning,
    setError,
    setWarning,
    clearError,
    clearWarning,
    showError,
    showWarning,
    showSuccess,
  } = useUIStore();

  const handleError = useCallback(
    (message: string) => {
      showError(message);
    },
    [showError]
  );

  const handleWarning = useCallback(
    (message: string) => {
      showWarning(message);
    },
    [showWarning]
  );

  const handleSuccess = useCallback(
    (message: string) => {
      showSuccess(message);
    },
    [showSuccess]
  );

  const clearAllMessages = useCallback(() => {
    clearError();
    clearWarning();
  }, [clearError, clearWarning]);

  return {
    error,
    warning,
    hasError: error !== null,
    hasWarning: warning !== null,
    hasAnyMessage: error !== null || warning !== null,
    handleError,
    handleWarning,
    handleSuccess,
    clearAllMessages,
  };
};

// Custom annotation form hook
export const useCustomAnnotationForm = () => {
  const {
    editingCustomAnnotation,
    customLabel,
    customColor,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    resetCustomAnnotationForm,
    handleCustomAnnotationClick: storeHandleCustomAnnotationClick,
  } = useUIStore();

  const handleCustomAnnotationClick = useCallback(
    (annotationId: string) => {
      storeHandleCustomAnnotationClick(annotationId);
    },
    [storeHandleCustomAnnotationClick]
  );

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

  const resetForm = useCallback(() => {
    resetCustomAnnotationForm();
  }, [resetCustomAnnotationForm]);

  return {
    editingCustomAnnotation,
    customLabel,
    customColor,
    handleCustomAnnotationClick,
    updateCustomLabel,
    updateCustomColor,
    resetForm,
  };
};

// Dialog state management hook
export const useDialogState = () => {
  const { hasAnyDialogOpen, openDialogCount } = useUIStore();

  return {
    hasAnyDialogOpen,
    openDialogCount,
  };
};
