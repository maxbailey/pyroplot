export interface MapCamera {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapStyle {
  id: string;
  name: string;
  url: string;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  center?: [number, number];
}

export interface MapboxSearchResponse {
  suggestions?: Array<{
    mapbox_id: string;
    name: string;
    place_formatted?: string;
  }>;
}

export interface MapboxGeocodingResponse {
  features?: Array<{
    id: string;
    place_name: string;
    center?: [number, number];
    geometry?: { coordinates?: [number, number] };
  }>;
}
