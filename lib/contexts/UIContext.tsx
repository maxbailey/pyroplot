"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useUIStore, uiSelectors } from "@/lib/store";
import {
  useDialogs,
  useShareDialog,
  useCustomAnnotationForm,
} from "@/lib/hooks";

// UI context interface
interface UIContextValue {
  // Dialog states
  shareOpen: boolean;
  shareUrl: string;
  copied: boolean;
  disclaimerOpen: boolean;
  helpOpen: boolean;
  settingsOpen: boolean;
  customAnnotationOpen: boolean;

  // Custom annotation form state
  editingCustomAnnotation: string | null;
  customLabel: string;
  customColor: string;

  // General UI state
  showHeight: boolean;
  hasAnyDialogOpen: boolean;
  openDialogCount: number;

  // Dialog actions
  setShareOpen: (open: boolean) => void;
  setShareUrl: (url: string) => void;
  setCopied: (copied: boolean) => void;
  setDisclaimerOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCustomAnnotationOpen: (open: boolean) => void;

  // Custom annotation form actions
  setEditingCustomAnnotation: (id: string | null) => void;
  setCustomLabel: (label: string) => void;
  setCustomColor: (color: string) => void;
  resetCustomAnnotationForm: () => void;

  // General UI actions
  setShowHeight: (show: boolean) => void;
  closeAllDialogs: () => void;

  // Share dialog actions
  openShareDialog: () => void;
  handleCopyUrl: () => Promise<void>;
  handleCustomAnnotationClick: (id: string) => void;
}

// Create the context
const UIContext = createContext<UIContextValue | undefined>(undefined);

// UI context provider
export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get store state and actions
  const {
    shareOpen,
    shareUrl,
    copied,
    disclaimerOpen,
    helpOpen,
    settingsOpen,
    customAnnotationOpen,
    editingCustomAnnotation,
    customLabel,
    customColor,
    showHeight,
    hasAnyDialogOpen,
    openDialogCount,
    setShareOpen,
    setShareUrl,
    setCopied,
    setDisclaimerOpen,
    setHelpOpen,
    setSettingsOpen,
    setCustomAnnotationOpen,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    setShowHeight,
    closeAllDialogs: storeCloseAllDialogs,
    openShareDialog: storeOpenShareDialog,
    handleCopyUrl: storeHandleCopyUrl,
    handleCustomAnnotationClick: storeHandleCustomAnnotationClick,
    resetCustomAnnotationForm: storeResetCustomAnnotationForm,
  } = useUIStore();

  // Get hooks
  const { generateShareUrl } = useShareDialog();

  // Memoized action handlers
  const openShareDialog = useCallback(() => {
    storeOpenShareDialog();
  }, [storeOpenShareDialog]);

  const handleCopyUrl = useCallback(async () => {
    await storeHandleCopyUrl();
  }, [storeHandleCopyUrl]);

  const handleCustomAnnotationClick = useCallback(
    (id: string) => {
      storeHandleCustomAnnotationClick(id);
    },
    [storeHandleCustomAnnotationClick]
  );

  const resetCustomAnnotationForm = useCallback(() => {
    storeResetCustomAnnotationForm();
  }, [storeResetCustomAnnotationForm]);

  const closeAllDialogs = useCallback(() => {
    storeCloseAllDialogs();
  }, [storeCloseAllDialogs]);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      // Dialog states
      shareOpen,
      shareUrl,
      copied,
      disclaimerOpen,
      helpOpen,
      settingsOpen,
      customAnnotationOpen,

      // Custom annotation form state
      editingCustomAnnotation,
      customLabel,
      customColor,

      // General UI state
      showHeight,
      hasAnyDialogOpen,
      openDialogCount,

      // Dialog actions
      setShareOpen,
      setShareUrl,
      setCopied,
      setDisclaimerOpen,
      setHelpOpen,
      setSettingsOpen,
      setCustomAnnotationOpen,

      // Custom annotation form actions
      setEditingCustomAnnotation,
      setCustomLabel,
      setCustomColor,
      resetCustomAnnotationForm,

      // General UI actions
      setShowHeight,
      closeAllDialogs,

      // Share dialog actions
      openShareDialog,
      handleCopyUrl,
      handleCustomAnnotationClick,
    }),
    [
      shareOpen,
      shareUrl,
      copied,
      disclaimerOpen,
      helpOpen,
      settingsOpen,
      customAnnotationOpen,
      editingCustomAnnotation,
      customLabel,
      customColor,
      showHeight,
      hasAnyDialogOpen,
      openDialogCount,
      setShareOpen,
      setShareUrl,
      setCopied,
      setDisclaimerOpen,
      setHelpOpen,
      setSettingsOpen,
      setCustomAnnotationOpen,
      setEditingCustomAnnotation,
      setCustomLabel,
      setCustomColor,
      resetCustomAnnotationForm,
      setShowHeight,
      closeAllDialogs,
      openShareDialog,
      handleCopyUrl,
      handleCustomAnnotationClick,
    ]
  );

  return (
    <UIContext.Provider value={contextValue}>{children}</UIContext.Provider>
  );
};

// Hook to use UI context
export const useUIContext = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUIContext must be used within a UIProvider");
  }
  return context;
};

// Selector hooks for specific parts of UI state
export const useUIDialogState = () => {
  const {
    shareOpen,
    shareUrl,
    copied,
    disclaimerOpen,
    helpOpen,
    settingsOpen,
    customAnnotationOpen,
    hasAnyDialogOpen,
    openDialogCount,
  } = useUIContext();
  return {
    shareOpen,
    shareUrl,
    copied,
    disclaimerOpen,
    helpOpen,
    settingsOpen,
    customAnnotationOpen,
    hasAnyDialogOpen,
    openDialogCount,
  };
};

export const useCustomAnnotationFormState = () => {
  const {
    editingCustomAnnotation,
    customLabel,
    customColor,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    resetCustomAnnotationForm,
  } = useUIContext();
  return {
    editingCustomAnnotation,
    customLabel,
    customColor,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    resetCustomAnnotationForm,
  };
};

export const useUIActions = () => {
  const {
    setShareOpen,
    setShareUrl,
    setCopied,
    setDisclaimerOpen,
    setHelpOpen,
    setSettingsOpen,
    setCustomAnnotationOpen,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    setShowHeight,
    closeAllDialogs,
    openShareDialog,
    handleCopyUrl,
    handleCustomAnnotationClick,
    resetCustomAnnotationForm,
  } = useUIContext();
  return {
    setShareOpen,
    setShareUrl,
    setCopied,
    setDisclaimerOpen,
    setHelpOpen,
    setSettingsOpen,
    setCustomAnnotationOpen,
    setEditingCustomAnnotation,
    setCustomLabel,
    setCustomColor,
    setShowHeight,
    closeAllDialogs,
    openShareDialog,
    handleCopyUrl,
    handleCustomAnnotationClick,
    resetCustomAnnotationForm,
  };
};
