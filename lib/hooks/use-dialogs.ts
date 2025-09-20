import { useCallback } from "react";
import { useUIStore, uiSelectors } from "@/lib/store";

// Main dialog management hook
export const useDialogs = () => {
  const {
    settingsOpen,
    customAnnotationOpen,
    shareOpen,
    disclaimerOpen,
    helpOpen,
    clearAnnotationsOpen,
    setSettingsOpen,
    setCustomAnnotationOpen,
    setShareOpen,
    setDisclaimerOpen,
    setHelpOpen,
    setClearAnnotationsOpen,
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
  };
};

// Share dialog hook
export const useShareDialog = () => {
  const { shareUrl, copied, setShareUrl, setCopied, openShareDialog } =
    useUIStore();

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  }, [shareUrl, setCopied]);

  const generateShareUrl = useCallback(
    async (stateData: string) => {
      const url = `${window.location.origin}${window.location.pathname}#${stateData}`;
      setShareUrl(url);
      return url;
    },
    [setShareUrl]
  );

  return {
    shareUrl,
    copied,
    openShareDialog,
    handleCopyUrl,
    generateShareUrl,
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

// Dialog state management hook
export const useDialogState = () => {
  const { hasAnyDialogOpen, openDialogCount } = useUIStore();

  return {
    hasAnyDialogOpen,
    openDialogCount,
  };
};
