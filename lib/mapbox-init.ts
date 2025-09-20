import mapboxgl from "mapbox-gl";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Validate token
if (!mapboxgl.accessToken) {
  console.error(
    "Mapbox access token is not set. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env file."
  );
}

export { mapboxgl };
