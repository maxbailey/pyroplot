export interface JsPdfInstance {
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  setFont(font: string, style?: string): void;
  setFontSize(size: number): void;
  text(text: string, x: number, y: number): void;
  addImage(
    imageData: string,
    format: "PNG" | "JPEG" | "JPG",
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
  addPage(
    format?: string | number[],
    orientation?: "portrait" | "landscape"
  ): void;
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    style?: "S" | "F" | "FD" | "DF"
  ): void;
  setFillColor(r: number, g: number, b: number): void;
  save(filename: string): void;
}

export interface JsPdfConstructor {
  new (options?: {
    orientation?: "portrait" | "landscape";
    unit?: string;
    format?: string | number[];
  }): JsPdfInstance;
}

export interface AudienceRecord {
  type: string;
  number: number;
  id: string;
  sourceId: string;
  fillLayerId: string;
  corners: number[][];
  cornerMarkers: mapboxgl.Marker[];
}

export interface MeasurementRecord {
  type: string;
  number: number;
  id: string;
  sourceId: string;
  lineLayerId: string;
  points: number[][];
  pointMarkers: mapboxgl.Marker[];
}

export interface RestrictedRecord {
  type: string;
  number: number;
  id: string;
  sourceId: string;
  fillLayerId: string;
  corners: number[][];
  cornerMarkers: mapboxgl.Marker[];
}

declare global {
  interface Window {
    jspdf?: { jsPDF: JsPdfConstructor };
  }
}
