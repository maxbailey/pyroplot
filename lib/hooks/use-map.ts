import { useEffect, useRef, useCallback } from "react";
import { mapboxgl } from "@/lib/mapbox-init";
import { useMapStore, mapSelectors } from "@/lib/store";
import { MAP_CONFIG, MAPBOX_ENDPOINTS } from "@/lib/constants";
import type {
  SearchSuggestion,
  MapboxSearchResponse,
  MapboxGeocodingResponse,
} from "@/lib/types";

// Map initialization hook
export const useMapInitialization = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    mapRef,
    isMapReady,
    setMapRef,
    setMapReady,
    setCamera,
    setDragging,
    setZooming,
    initializeMap: storeInitializeMap,
  } = useMapStore();

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef) return;

    const map = storeInitializeMap(mapContainerRef.current);

    // Set up event listeners with proper cleanup
    const handleMoveEnd = () => {
      if (map.isMoving()) return;
      setCamera({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };

    const handleDragStart = () => setDragging(true);
    const handleDragEnd = () => setDragging(false);
    const handleZoomStart = () => setZooming(true);
    const handleZoomEnd = () => setZooming(false);

    map.on("moveend", handleMoveEnd);
    map.on("dragstart", handleDragStart);
    map.on("dragend", handleDragEnd);
    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    // Return cleanup function
    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("dragstart", handleDragStart);
      map.off("dragend", handleDragEnd);
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [mapRef, storeInitializeMap, setCamera, setDragging, setZooming]);

  const cleanup = useCallback(() => {
    if (mapRef) {
      mapRef.remove();
      setMapRef(null);
      setMapReady(false);
    }
  }, [mapRef, setMapRef, setMapReady]);

  useEffect(() => {
    const cleanupMap = initializeMap();
    return () => {
      if (cleanupMap) cleanupMap();
      cleanup();
    };
  }, [initializeMap, cleanup]);

  // Auto-zoom to current location
  useEffect(() => {
    if (!isMapReady || !mapRef) return;

    // If a shared state hash is present, skip geolocation to avoid overriding the saved camera
    try {
      const hasShared = new URLSearchParams(
        (window.location.hash || "").replace(/^#?/, "")
      ).has("s");
      if (hasShared) return;
    } catch {}

    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef!.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          pitch: 30,
          bearing: 0,
          essential: true,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isMapReady, mapRef]);

  return {
    mapContainerRef,
    mapRef,
    isMapReady,
    initializeMap,
    cleanup,
  };
};

// Search functionality hook
export const useSearch = () => {
  // Use selectors for better performance
  const searchQuery = useMapStore(mapSelectors.searchQuery);
  const suggestions = useMapStore(mapSelectors.suggestions);
  const activeIndex = useMapStore(mapSelectors.activeIndex);

  const {
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    clearSuggestions,
    handleSearch,
    handleSubmitOrSelect,
  } = useMapStore();

  const searchSuggestions = useCallback(
    async (query: string) => {
      try {
        await handleSearch(query);
      } catch (error) {
        console.error("Search error:", error);
        setSuggestions([]);
        setActiveIndex(-1);
      }
    },
    [handleSearch, setSuggestions, setActiveIndex]
  );

  const selectSuggestion = useCallback(
    async (suggestion: {
      id: string;
      text: string;
      center?: [number, number];
    }) => {
      try {
        await handleSubmitOrSelect(suggestion.id);
      } catch (error) {
        console.error("Suggestion selection error:", error);
      }
    },
    [handleSubmitOrSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex(
            activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(
            activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          const activeSuggestion = suggestions[activeIndex];
          if (activeSuggestion) {
            selectSuggestion(activeSuggestion);
          }
          break;
        case "Escape":
          clearSuggestions();
          break;
      }
    },
    [
      suggestions,
      activeIndex,
      setActiveIndex,
      selectSuggestion,
      clearSuggestions,
    ]
  );

  return {
    searchQuery,
    suggestions,
    activeIndex,
    setSearchQuery,
    searchSuggestions,
    selectSuggestion,
    handleKeyDown,
    clearSuggestions,
  };
};

// Map interaction hook
export const useMapInteraction = () => {
  const { isDragging, isZooming, setDragging, setZooming } = useMapStore();

  const handleDragStart = useCallback(() => {
    setDragging(true);
  }, [setDragging]);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, [setDragging]);

  const handleZoomStart = useCallback(() => {
    setZooming(true);
  }, [setZooming]);

  const handleZoomEnd = useCallback(() => {
    setZooming(false);
  }, [setZooming]);

  return {
    isDragging,
    isZooming,
    isInteracting: isDragging || isZooming,
    handleDragStart,
    handleDragEnd,
    handleZoomStart,
    handleZoomEnd,
  };
};

// Map camera control hook
export const useMapCamera = () => {
  const { camera, setCamera, resetCamera } = useMapStore();

  const flyTo = useCallback(
    (options: {
      center?: [number, number];
      zoom?: number;
      bearing?: number;
      pitch?: number;
      duration?: number;
    }) => {
      const map = useMapStore.getState().mapRef;
      if (!map) return;

      map.flyTo({
        center: options.center || camera.center,
        zoom: options.zoom || camera.zoom,
        bearing: options.bearing || camera.bearing,
        pitch: options.pitch || camera.pitch,
        duration: options.duration || 1000,
      });
    },
    [camera]
  );

  const jumpTo = useCallback(
    (options: {
      center?: [number, number];
      zoom?: number;
      bearing?: number;
      pitch?: number;
    }) => {
      const map = useMapStore.getState().mapRef;
      if (!map) return;

      map.jumpTo({
        center: options.center || camera.center,
        zoom: options.zoom || camera.zoom,
        bearing: options.bearing || camera.bearing,
        pitch: options.pitch || camera.pitch,
      });
    },
    [camera]
  );

  const fitBounds = useCallback(
    (
      bounds: mapboxgl.LngLatBoundsLike,
      options?: {
        padding?: number | mapboxgl.PaddingOptions;
        duration?: number;
      }
    ) => {
      const map = useMapStore.getState().mapRef;
      if (!map) return;

      map.fitBounds(bounds, {
        padding: options?.padding || 50,
        duration: options?.duration || 1000,
      });
    },
    []
  );

  return {
    camera,
    setCamera,
    resetCamera,
    flyTo,
    jumpTo,
    fitBounds,
  };
};

// Map event handlers hook
export const useMapEvents = () => {
  const { mapRef } = useMapStore();

  const addEventListener = useCallback(
    (event: string, handler: (e: unknown) => void) => {
      if (!mapRef) return;

      mapRef.on(event, handler);
      return () => mapRef.off(event, handler);
    },
    [mapRef]
  );

  const removeEventListener = useCallback(
    (event: string, handler: (e: unknown) => void) => {
      if (!mapRef) return;

      mapRef.off(event, handler);
    },
    [mapRef]
  );

  return {
    addEventListener,
    removeEventListener,
  };
};
