"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { useMapStore, mapSelectors } from "@/lib/store";
import {
  useMapInitialization,
  useSearch,
  useMapInteraction,
  useMapCamera,
  useMapEvents,
} from "@/lib/hooks";
import type { MapCamera, SearchSuggestion } from "@/lib/types";

// Map context interface
interface MapContextValue {
  // Map state
  mapRef: mapboxgl.Map | null;
  isMapReady: boolean;
  camera: MapCamera;
  isDragging: boolean;
  isZooming: boolean;

  // Search state
  searchQuery: string;
  suggestions: Array<{ id: string; text: string; center?: [number, number] }>;
  activeIndex: number;
  hasSuggestions: boolean;
  activeSuggestion: {
    id: string;
    text: string;
    center?: [number, number];
  } | null;

  // Map actions
  setMapRef: (mapRef: mapboxgl.Map | null) => void;
  setMapReady: (ready: boolean) => void;
  setCamera: (camera: Partial<MapCamera>) => void;
  resetCamera: () => void;
  setDragging: (dragging: boolean) => void;
  setZooming: (zooming: boolean) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  setSuggestions: (
    suggestions: Array<{ id: string; text: string; center?: [number, number] }>
  ) => void;
  setActiveIndex: (index: number) => void;
  clearSuggestions: () => void;
  handleSearch: (query: string) => Promise<void>;
  handleSubmitOrSelect: (idOrQuery?: string) => Promise<void>;

  // Map control actions
  flyTo: (options: {
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    duration?: number;
  }) => void;
  jumpTo: (options: {
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
  }) => void;
  flyToLocation: (lngLat: [number, number], zoom?: number) => void;

  // Event handling
  addEventListener: (
    event: string,
    handler: (e: unknown) => void
  ) => (() => void) | undefined;
  removeEventListener: (event: string, handler: (e: unknown) => void) => void;

  // Map initialization (handled by Map component)
}

// Create the context
const MapContext = createContext<MapContextValue | undefined>(undefined);

// Map context provider
export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get store state and actions
  const {
    mapRef,
    isMapReady,
    camera,
    isDragging,
    isZooming,
    searchQuery,
    suggestions,
    activeIndex,
    setMapRef,
    setMapReady,
    setCamera,
    resetCamera,
    setDragging,
    setZooming,
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    clearSuggestions,
    handleSearch,
    handleSubmitOrSelect,
    flyToLocation,
  } = useMapStore();

  // Get hooks (mapContainerRef now handled by Map component)

  const { searchSuggestions, selectSuggestion, handleKeyDown } = useSearch();

  const { flyTo, jumpTo } = useMapCamera();

  const { addEventListener, removeEventListener } = useMapEvents();

  // Memoized computed values
  const hasSuggestions = useMemo(
    () => suggestions.length > 0,
    [suggestions.length]
  );
  const activeSuggestion = useMemo(
    () =>
      activeIndex >= 0 && activeIndex < suggestions.length
        ? suggestions[activeIndex]
        : null,
    [activeIndex, suggestions]
  );

  // Memoized action handlers
  const handleSearchMemo = useCallback(
    async (query: string) => {
      await handleSearch(query);
    },
    [handleSearch]
  );

  const handleSubmitOrSelectMemo = useCallback(
    async (idOrQuery?: string) => {
      await handleSubmitOrSelect(idOrQuery);
    },
    [handleSubmitOrSelect]
  );

  const flyToMemo = useCallback(
    (options: {
      center?: [number, number];
      zoom?: number;
      bearing?: number;
      pitch?: number;
      duration?: number;
    }) => {
      flyTo(options);
    },
    [flyTo]
  );

  const jumpToMemo = useCallback(
    (options: {
      center?: [number, number];
      zoom?: number;
      bearing?: number;
      pitch?: number;
    }) => {
      jumpTo(options);
    },
    [jumpTo]
  );

  const flyToLocationMemo = useCallback(
    (lngLat: [number, number], zoom?: number) => {
      flyToLocation(lngLat, zoom);
    },
    [flyToLocation]
  );

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      // Map state
      mapRef,
      isMapReady,
      camera,
      isDragging,
      isZooming,

      // Search state
      searchQuery,
      suggestions,
      activeIndex,
      hasSuggestions,
      activeSuggestion,

      // Map actions
      setMapRef,
      setMapReady,
      setCamera,
      resetCamera,
      setDragging,
      setZooming,

      // Search actions
      setSearchQuery,
      setSuggestions,
      setActiveIndex,
      clearSuggestions,
      handleSearch: handleSearchMemo,
      handleSubmitOrSelect: handleSubmitOrSelectMemo,

      // Map control actions
      flyTo: flyToMemo,
      jumpTo: jumpToMemo,
      flyToLocation: flyToLocationMemo,

      // Event handling
      addEventListener,
      removeEventListener,

      // Map initialization (handled by Map component)
    }),
    [
      mapRef,
      isMapReady,
      camera,
      isDragging,
      isZooming,
      searchQuery,
      suggestions,
      activeIndex,
      hasSuggestions,
      activeSuggestion,
      setMapRef,
      setMapReady,
      setCamera,
      resetCamera,
      setDragging,
      setZooming,
      setSearchQuery,
      setSuggestions,
      setActiveIndex,
      clearSuggestions,
      handleSearchMemo,
      handleSubmitOrSelectMemo,
      flyToMemo,
      jumpToMemo,
      flyToLocationMemo,
      addEventListener,
      removeEventListener,
    ]
  );

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  );
};

// Hook to use map context
export const useMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
};

// Selector hooks for specific parts of map state
export const useMapState = () => {
  const { mapRef, isMapReady, camera, isDragging, isZooming } = useMapContext();
  return { mapRef, isMapReady, camera, isDragging, isZooming };
};

export const useSearchState = () => {
  const {
    searchQuery,
    suggestions,
    activeIndex,
    hasSuggestions,
    activeSuggestion,
  } = useMapContext();
  return {
    searchQuery,
    suggestions,
    activeIndex,
    hasSuggestions,
    activeSuggestion,
  };
};

export const useMapActions = () => {
  const {
    setMapRef,
    setMapReady,
    setCamera,
    resetCamera,
    setDragging,
    setZooming,
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    clearSuggestions,
    handleSearch,
    handleSubmitOrSelect,
    flyTo,
    jumpTo,
    flyToLocation,
    addEventListener,
    removeEventListener,
  } = useMapContext();
  return {
    setMapRef,
    setMapReady,
    setCamera,
    resetCamera,
    setDragging,
    setZooming,
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    clearSuggestions,
    handleSearch,
    handleSubmitOrSelect,
    flyTo,
    jumpTo,
    flyToLocation,
    addEventListener,
    removeEventListener,
  };
};
