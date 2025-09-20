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

declare global {
  interface Window {
    jspdf?: { jsPDF: JsPdfConstructor };
  }
}
