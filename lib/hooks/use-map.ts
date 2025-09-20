import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { setMapRef, setMapReady, setCamera, isMapReady } = useMapStore();

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.DEFAULT_STYLE,
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      pitch: MAP_CONFIG.DEFAULT_PITCH,
      bearing: MAP_CONFIG.DEFAULT_BEARING,
    });

    mapRef.current = map;
    setMapRef({ current: map });

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("moveend", () => {
      if (map.isMoving()) return;
      setCamera({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });

    map.on("dragstart", () => {
      useMapStore.getState().setDragging(true);
    });

    map.on("dragend", () => {
      useMapStore.getState().setDragging(false);
    });

    map.on("zoomstart", () => {
      useMapStore.getState().setZooming(true);
    });

    map.on("zoomend", () => {
      useMapStore.getState().setZooming(false);
    });
  }, [setMapRef, setMapReady, setCamera]);

  const cleanup = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      setMapRef({ current: null });
      setMapReady(false);
    }
  }, [setMapRef, setMapReady]);

  useEffect(() => {
    initializeMap();
    return cleanup;
  }, [initializeMap, cleanup]);

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
  const {
    searchQuery,
    suggestions,
    activeIndex,
    sessionToken,
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    clearSuggestions,
    setSessionToken,
  } = useMapStore();

  const searchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearSuggestions();
        return;
      }

      try {
        const token = sessionToken || crypto.randomUUID();
        setSessionToken(token);

        const response = await fetch(
          `${MAPBOX_ENDPOINTS.SEARCH_SUGGEST}?q=${encodeURIComponent(
            query
          )}&access_token=${mapboxgl.accessToken}&session_token=${token}`
        );

        if (!response.ok) throw new Error("Search failed");

        const data: MapboxSearchResponse = await response.json();
        const suggestions: SearchSuggestion[] = (data.suggestions || []).map(
          (s) => ({
            id: s.mapbox_id,
            text: s.name,
            place_name: s.place_name,
            center: s.coordinates || [0, 0],
            context: s.context,
          })
        );

        setSuggestions(suggestions);
      } catch (error) {
        console.error("Search error:", error);
        clearSuggestions();
      }
    },
    [sessionToken, setSuggestions, clearSuggestions, setSessionToken]
  );

  const selectSuggestion = useCallback(
    async (suggestion: SearchSuggestion) => {
      try {
        const response = await fetch(
          `${MAPBOX_ENDPOINTS.GEOCODING}/${suggestion.id}.json?access_token=${mapboxgl.accessToken}`
        );

        if (!response.ok) throw new Error("Geocoding failed");

        const data: MapboxGeocodingResponse = await response.json();
        const feature = data.features?.[0];

        if (feature) {
          const map = useMapStore.getState().mapRef.current;
          if (map) {
            map.flyTo({
              center: feature.center as [number, number],
              zoom: 15,
              duration: 1000,
            });
          }
        }

        clearSuggestions();
        setSearchQuery(suggestion.text);
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    },
    [clearSuggestions, setSearchQuery]
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
      const map = useMapStore.getState().mapRef.current;
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
      const map = useMapStore.getState().mapRef.current;
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
      const map = useMapStore.getState().mapRef.current;
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
    (event: string, handler: (e: any) => void) => {
      const map = mapRef.current;
      if (!map) return;

      map.on(event, handler);
      return () => map.off(event, handler);
    },
    [mapRef]
  );

  const removeEventListener = useCallback(
    (event: string, handler: (e: any) => void) => {
      const map = mapRef.current;
      if (!map) return;

      map.off(event, handler);
    },
    [mapRef]
  );

  return {
    addEventListener,
    removeEventListener,
  };
};
