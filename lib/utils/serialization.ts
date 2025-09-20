import type {
  SerializedState,
  SerializedFirework,
  SerializedCustom,
  SerializedAudience,
  SerializedMeasurement,
  SerializedRestricted,
  AnnotationRecord,
  AudienceRecord,
  MeasurementRecord,
  RestrictedRecord,
  MapCamera,
} from "@/lib/types";

/**
 * Encodes a Uint8Array to base64url format
 * @param bytes - Array of bytes to encode
 * @returns Base64url encoded string
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decodes a base64url string to Uint8Array
 * @param input - Base64url encoded string
 * @returns Decoded byte array
 */
export function base64UrlDecode(input: string): Uint8Array {
  const b64 =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((input.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses data using gzip compression
 * @param data - Data to compress
 * @returns Compressed data
 */
export async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  if ("CompressionStream" in window) {
    const cs = new CompressionStream("gzip");
    const ab = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    const stream = new Response(new Blob([ab])).body as ReadableStream;
    const writer = stream.pipeThrough(cs).getReader();
    const chunks: Uint8Array[] = [];
    // Collect all chunks
    while (true) {
      const { value, done } = await writer.read();
      if (done) break;
      chunks.push(value!);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  } else {
    // Fallback for browsers without CompressionStream
    throw new Error("CompressionStream not supported");
  }
}

/**
 * Decompresses gzip compressed data
 * @param data - Compressed data
 * @returns Decompressed data
 */
export async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  if ("DecompressionStream" in window) {
    const ds = new DecompressionStream("gzip");
    const ab = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    const stream = new Response(new Blob([ab])).body as ReadableStream;
    const writer = stream.pipeThrough(ds).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await writer.read();
      if (done) break;
      chunks.push(value!);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  } else {
    // Fallback for browsers without DecompressionStream
    throw new Error("DecompressionStream not supported");
  }
}

/**
 * Serializes annotation records to the format used in state
 * @param annotations - Record of annotation data
 * @returns Array of serialized firework annotations
 */
export function serializeFireworks(
  annotations: Record<string, AnnotationRecord>
): SerializedFirework[] {
  return Object.values(annotations)
    .filter((ann) => ann.type === "firework")
    .map((ann) => ({
      id: ann.id,
      number: ann.number,
      position: [ann.marker.getLngLat().lng, ann.marker.getLngLat().lat] as [
        number,
        number
      ],
      inches: ann.inches,
      label: ann.label,
      color: ann.color,
    }));
}

/**
 * Serializes custom annotation records to the format used in state
 * @param annotations - Record of annotation data
 * @returns Array of serialized custom annotations
 */
export function serializeCustomAnnotations(
  annotations: Record<string, AnnotationRecord>
): SerializedCustom[] {
  return Object.values(annotations)
    .filter((ann) => ann.type === "custom")
    .map((ann) => ({
      id: ann.id,
      number: ann.number,
      position: [ann.marker.getLngLat().lng, ann.marker.getLngLat().lat] as [
        number,
        number
      ],
      label: ann.label,
      color: ann.color,
      emoji: ann.emoji,
      description: ann.description,
    }));
}

/**
 * Serializes audience area records to the format used in state
 * @param audienceAreas - Record of audience area data
 * @returns Array of serialized audience areas
 */
export function serializeAudienceAreas(
  audienceAreas: Record<string, AudienceRecord>
): SerializedAudience[] {
  return Object.values(audienceAreas).map((area) => ({
    id: area.id,
    number: area.number,
    corners: area.corners,
  }));
}

/**
 * Serializes measurement records to the format used in state
 * @param measurements - Record of measurement data
 * @returns Array of serialized measurements
 */
export function serializeMeasurements(
  measurements: Record<string, MeasurementRecord>
): SerializedMeasurement[] {
  return Object.values(measurements).map((measurement) => ({
    id: measurement.id,
    number: measurement.number,
    points: measurement.points,
  }));
}

/**
 * Serializes restricted area records to the format used in state
 * @param restrictedAreas - Record of restricted area data
 * @returns Array of serialized restricted areas
 */
export function serializeRestrictedAreas(
  restrictedAreas: Record<string, RestrictedRecord>
): SerializedRestricted[] {
  return Object.values(restrictedAreas).map((area) => ({
    id: area.id,
    number: area.number,
    corners: area.corners,
  }));
}

/**
 * Encodes the current application state to a URL hash
 * @param camera - Current map camera state
 * @param annotations - Record of annotation data
 * @param audienceAreas - Record of audience area data
 * @param measurements - Record of measurement data
 * @param restrictedAreas - Record of restricted area data
 * @param showHeight - Whether height is shown
 * @param measurementUnit - Current measurement unit
 * @param projectName - Current project name
 * @param safetyDistance - Current safety distance
 * @returns Encoded state string
 */
export async function encodeStateToHash(
  camera: MapCamera,
  annotations: Record<string, AnnotationRecord>,
  audienceAreas: Record<string, AudienceRecord>,
  measurements: Record<string, MeasurementRecord>,
  restrictedAreas: Record<string, RestrictedRecord>,
  showHeight: boolean,
  measurementUnit?: string,
  projectName?: string,
  safetyDistance?: number
): Promise<string> {
  const fireworks = serializeFireworks(annotations);
  const custom = serializeCustomAnnotations(annotations);
  const audiences = serializeAudienceAreas(audienceAreas);
  const measurementData = serializeMeasurements(measurements);
  const restricted = serializeRestrictedAreas(restrictedAreas);

  const state: SerializedState = {
    camera,
    fireworks,
    custom,
    audiences,
    measurements: measurementData,
    restricted,
    showHeight,
    measurementUnit: measurementUnit as "feet" | "meters" | undefined,
    projectName,
    safetyDistance: safetyDistance as 70 | 100 | undefined,
    v: 1,
  };

  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  const gz = await gzipCompress(bytes);
  const data = base64UrlEncode(gz);
  return `s=${data}`;
}

/**
 * Decodes application state from a URL hash
 * @param hash - URL hash containing encoded state
 * @returns Decoded state or null if invalid
 */
export async function decodeStateFromHash(
  hash: string
): Promise<SerializedState | null> {
  try {
    const params = new URLSearchParams(hash.replace(/^#?/, ""));
    const enc = params.get("s");
    if (!enc) return null;
    const gz = base64UrlDecode(enc);
    const raw = await gzipDecompress(gz);
    const json = new TextDecoder().decode(raw);
    const parsed = JSON.parse(json) as SerializedState;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validates a serialized state object
 * @param state - State to validate
 * @returns True if valid, false otherwise
 */
export function validateSerializedState(state: any): state is SerializedState {
  return !!(
    state &&
    typeof state === "object" &&
    state.camera &&
    Array.isArray(state.fireworks) &&
    Array.isArray(state.custom) &&
    Array.isArray(state.audiences) &&
    Array.isArray(state.measurements) &&
    Array.isArray(state.restricted) &&
    typeof state.showHeight === "boolean" &&
    typeof state.v === "number"
  );
}

/**
 * Migrates an old state format to the current format
 * @param state - State to migrate
 * @returns Migrated state
 */
export function migrateState(state: any): SerializedState {
  // Handle version 0 (no version field)
  if (!state.v) {
    return {
      ...state,
      v: 1,
      custom: state.custom || [],
    };
  }

  // Handle future versions here
  return state as SerializedState;
}

/**
 * Creates a default empty state
 * @returns Default state object
 */
export function createDefaultState(): SerializedState {
  return {
    camera: {
      center: [-98.5795, 39.8283],
      zoom: 3,
      pitch: 20,
      bearing: 0,
    },
    fireworks: [],
    custom: [],
    audiences: [],
    measurements: [],
    restricted: [],
    showHeight: false,
    v: 1,
  };
}
