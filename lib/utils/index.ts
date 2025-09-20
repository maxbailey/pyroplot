// Map utilities
export {
  createCircleFeature,
  createRectangleFeature,
  normalizeCorners,
  formatDistanceWithSpace,
  formatLengthNoSpace,
  calculateDistance,
  metersToLongitude,
  metersToLatitude,
  longitudeToMeters,
  latitudeToMeters,
  calculateRectangleCenter,
  calculateRectangleDimensions,
} from "./map-utils";

// Annotation utilities
export {
  refreshAllMeasurementTexts,
  refreshAllAudienceAreaTexts,
  refreshAllRestrictedAreaTexts,
  refreshAllFireworkTexts,
  refreshAllAnnotationTexts,
  getNextAnnotationNumber,
  renumberAnnotations,
  createAnnotationId,
  validateAnnotation,
  validateAudienceArea,
  validateMeasurement,
  validateRestrictedArea,
} from "./annotation-utils";

// Serialization utilities
export {
  base64UrlEncode,
  base64UrlDecode,
  gzipCompress,
  gzipDecompress,
  serializeFireworks,
  serializeCustomAnnotations,
  serializeAudienceAreas,
  serializeMeasurements,
  serializeRestrictedAreas,
  encodeStateToHash,
  decodeStateFromHash,
  validateSerializedState,
  migrateState,
  createDefaultState,
} from "./serialization";
