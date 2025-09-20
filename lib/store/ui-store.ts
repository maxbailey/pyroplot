import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// UI state interface
interface UIState {
  // Dialog states
  settingsOpen: boolean;
  customAnnotationOpen: boolean;
  shareOpen: boolean;
  disclaimerOpen: boolean;
  helpOpen: boolean;
  clearAnnotationsOpen: boolean;

  // Share dialog state
  shareUrl: string;
  copied: boolean;

  // PDF generation state
  isGenerating: boolean;

  // Loading states
  isSearching: boolean;
  isMapLoading: boolean;

  // Error states
  error: string | null;
  warning: string | null;
}

// UI actions interface
interface UIActions {
  // Dialog management
  setSettingsOpen: (open: boolean) => void;
  setCustomAnnotationOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
  setDisclaimerOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setClearAnnotationsOpen: (open: boolean) => void;

  // Share dialog actions
  setShareUrl: (url: string) => void;
  setCopied: (copied: boolean) => void;
  openShareDialog: () => Promise<void>;

  // PDF generation
  setGenerating: (generating: boolean) => void;

  // Loading states
  setSearching: (searching: boolean) => void;
  setMapLoading: (loading: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  setWarning: (warning: string | null) => void;
  clearError: () => void;
  clearWarning: () => void;

  // Bulk operations
  closeAllDialogs: () => void;
  resetUI: () => void;

  // Utility actions
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
}

// Combined store type
type UIStore = UIState & UIActions;

// Initial state
const initialState: UIState = {
  // Dialog states
  settingsOpen: false,
  customAnnotationOpen: false,
  shareOpen: false,
  disclaimerOpen: false,
  helpOpen: false,
  clearAnnotationsOpen: false,

  // Share dialog state
  shareUrl: "",
  copied: false,

  // PDF generation state
  isGenerating: false,

  // Loading states
  isSearching: false,
  isMapLoading: false,

  // Error states
  error: null,
  warning: null,
};

// Create the UI store
export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Dialog management
    setSettingsOpen: (open) => set({ settingsOpen: open }),
    setCustomAnnotationOpen: (open) => set({ customAnnotationOpen: open }),
    setShareOpen: (open) => set({ shareOpen: open }),
    setDisclaimerOpen: (open) => set({ disclaimerOpen: open }),
    setHelpOpen: (open) => set({ helpOpen: open }),
    setClearAnnotationsOpen: (open) => set({ clearAnnotationsOpen: open }),

    // Share dialog actions
    setShareUrl: (url) => set({ shareUrl: url }),
    setCopied: (copied) => set({ copied: copied }),

    openShareDialog: async () => {
      // TODO: Implement share dialog logic
      console.log("Opening share dialog...");
      set({ shareOpen: true });
    },

    // PDF generation
    setGenerating: (generating) => set({ isGenerating: generating }),

    // Loading states
    setSearching: (searching) => set({ isSearching: searching }),
    setMapLoading: (loading) => set({ isMapLoading: loading }),

    // Error handling
    setError: (error) => set({ error }),
    setWarning: (warning) => set({ warning }),
    clearError: () => set({ error: null }),
    clearWarning: () => set({ warning: null }),

    // Bulk operations
    closeAllDialogs: () =>
      set({
        settingsOpen: false,
        customAnnotationOpen: false,
        shareOpen: false,
        disclaimerOpen: false,
        helpOpen: false,
        clearAnnotationsOpen: false,
      }),

    resetUI: () => set(initialState),

    // Utility actions
    showError: (message) => {
      set({ error: message });
      // Auto-clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
    },

    showWarning: (message) => {
      set({ warning: message });
      // Auto-clear warning after 3 seconds
      setTimeout(() => set({ warning: null }), 3000);
    },

    showSuccess: (message) => {
      // TODO: Implement success notification
      console.log("Success:", message);
    },
  }))
);

// Selector functions for performance optimization
export const uiSelectors = {
  // Dialog state selectors
  settingsOpen: (state: UIStore) => state.settingsOpen,
  customAnnotationOpen: (state: UIStore) => state.customAnnotationOpen,
  shareOpen: (state: UIStore) => state.shareOpen,
  disclaimerOpen: (state: UIStore) => state.disclaimerOpen,
  helpOpen: (state: UIStore) => state.helpOpen,
  clearAnnotationsOpen: (state: UIStore) => state.clearAnnotationsOpen,

  // Share dialog selectors
  shareUrl: (state: UIStore) => state.shareUrl,
  copied: (state: UIStore) => state.copied,

  // Loading state selectors
  isGenerating: (state: UIStore) => state.isGenerating,
  isSearching: (state: UIStore) => state.isSearching,
  isMapLoading: (state: UIStore) => state.isMapLoading,

  // Error state selectors
  error: (state: UIStore) => state.error,
  warning: (state: UIStore) => state.warning,

  // Computed selectors
  hasAnyDialogOpen: (state: UIStore) =>
    state.settingsOpen ||
    state.customAnnotationOpen ||
    state.shareOpen ||
    state.disclaimerOpen ||
    state.helpOpen ||
    state.clearAnnotationsOpen,

  isAnyLoading: (state: UIStore) =>
    state.isGenerating || state.isSearching || state.isMapLoading,

  hasAnyMessage: (state: UIStore) =>
    state.error !== null || state.warning !== null,

  // Dialog count
  openDialogCount: (state: UIStore) => {
    let count = 0;
    if (state.settingsOpen) count++;
    if (state.customAnnotationOpen) count++;
    if (state.shareOpen) count++;
    if (state.disclaimerOpen) count++;
    if (state.helpOpen) count++;
    if (state.clearAnnotationsOpen) count++;
    return count;
  },

  // Loading state summary
  loadingState: (state: UIStore) => ({
    generating: state.isGenerating,
    searching: state.isSearching,
    mapLoading: state.isMapLoading,
    anyLoading: state.isGenerating || state.isSearching || state.isMapLoading,
  }),

  // Error state summary
  messageState: (state: UIStore) => ({
    error: state.error,
    warning: state.warning,
    hasError: state.error !== null,
    hasWarning: state.warning !== null,
    hasAnyMessage: state.error !== null || state.warning !== null,
  }),
};
