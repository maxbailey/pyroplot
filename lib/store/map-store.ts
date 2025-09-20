import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type mapboxgl from "mapbox-gl";
import type { MapCamera, SearchSuggestion } from "../types";

// Map state interface
interface MapState {
  // Map instance and readiness
  mapRef: React.RefObject<mapboxgl.Map | null>;
  isMapReady: boolean;

  // Search functionality
  searchQuery: string;
  suggestions: SearchSuggestion[];
  activeIndex: number;
  sessionToken: string | null;

  // Map camera state
  camera: MapCamera;

  // Map interaction state
  isDragging: boolean;
  isZooming: boolean;
}

// Map actions interface
interface MapActions {
  // Map instance management
  setMapRef: (mapRef: React.RefObject<mapboxgl.Map | null>) => void;
  setMapReady: (ready: boolean) => void;

  // Search functionality
  setSearchQuery: (query: string) => void;
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  setActiveIndex: (index: number) => void;
  clearSuggestions: () => void;
  setSessionToken: (token: string | null) => void;

  // Camera management
  setCamera: (camera: Partial<MapCamera>) => void;
  resetCamera: () => void;

  // Map interaction
  setDragging: (dragging: boolean) => void;
  setZooming: (zooming: boolean) => void;

  // Search actions
  handleSearch: (query: string) => Promise<void>;
  handleSelectSuggestion: (suggestion: SearchSuggestion) => Promise<void>;
}

// Combined store type
export type MapStore = MapState & MapActions;

// Initial state
const initialState: MapState = {
  mapRef: { current: null },
  isMapReady: false,
  searchQuery: "",
  suggestions: [],
  activeIndex: -1,
  sessionToken: null,
  camera: {
    center: [-98.5795, 39.8283],
    zoom: 3,
    pitch: 20,
    bearing: 0,
  },
  isDragging: false,
  isZooming: false,
};

// Create the map store
export const useMapStore = create<MapStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Map instance management
    setMapRef: (mapRef) => set({ mapRef }),
    setMapReady: (ready) => set({ isMapReady: ready }),

    // Search functionality
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSuggestions: (suggestions) => set({ suggestions }),
    setActiveIndex: (index) => set({ activeIndex: index }),
    clearSuggestions: () => set({ suggestions: [], activeIndex: -1 }),
    setSessionToken: (token) => set({ sessionToken: token }),

    // Camera management
    setCamera: (camera) =>
      set((state) => ({
        camera: { ...state.camera, ...camera },
      })),
    resetCamera: () => set({ camera: initialState.camera }),

    // Map interaction
    setDragging: (dragging) => set({ isDragging: dragging }),
    setZooming: (zooming) => set({ isZooming: zooming }),

    // Search actions (placeholder implementations)
    handleSearch: async (query: string) => {
      // TODO: Implement search logic
      console.log("Searching for:", query);
    },

    handleSelectSuggestion: async (suggestion: SearchSuggestion) => {
      // TODO: Implement suggestion selection logic
      console.log("Selected suggestion:", suggestion);
    },
  }))
);

// Selector functions for performance optimization
export const mapSelectors = {
  // Map state selectors
  isMapReady: (state: MapStore) => state.isMapReady,
  mapRef: (state: MapStore) => state.mapRef,
  camera: (state: MapStore) => state.camera,

  // Search selectors
  searchQuery: (state: MapStore) => state.searchQuery,
  suggestions: (state: MapStore) => state.suggestions,
  activeIndex: (state: MapStore) => state.activeIndex,
  hasSuggestions: (state: MapStore) => state.suggestions.length > 0,

  // Interaction selectors
  isInteracting: (state: MapStore) => state.isDragging || state.isZooming,

  // Computed selectors
  activeSuggestion: (state: MapStore) =>
    state.activeIndex >= 0 && state.activeIndex < state.suggestions.length
      ? state.suggestions[state.activeIndex]
      : null,
};
