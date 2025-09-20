"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CustomAnnotationDialogProps {
  customAnnotationOpen: boolean;
  setCustomAnnotationOpen: (open: boolean) => void;
  customLabel: string;
  setCustomLabel: (label: string) => void;
  customColor: string;
  setCustomColor: (color: string) => void;
  handleFormChange: () => void;
  handleSaveCustomAnnotation: () => void;
  handleCancelCustomAnnotation: () => void;
}

export const CustomAnnotationDialog: React.FC<CustomAnnotationDialogProps> = ({
  customAnnotationOpen,
  setCustomAnnotationOpen,
  customLabel,
  setCustomLabel,
  customColor,
  setCustomColor,
  handleFormChange,
  handleSaveCustomAnnotation,
  handleCancelCustomAnnotation,
}) => {
  // Color presets for custom annotations
  const colorPresets = [
    { color: "#EF4444", name: "Red" },
    { color: "#F97316", name: "Orange" },
    { color: "#EAB308", name: "Yellow" },
    { color: "#22C55E", name: "Green" },
    { color: "#06B6D4", name: "Cyan" },
    { color: "#3B82F6", name: "Blue" },
    { color: "#8B5CF6", name: "Purple" },
    { color: "#EC4899", name: "Pink" },
    { color: "#262C3F", name: "Dark Gray" },
    { color: "#808BB3", name: "Light Gray" },
  ];

  return (
    <Dialog open={customAnnotationOpen} onOpenChange={setCustomAnnotationOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom Annotation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-sm text-muted-foreground">Label</label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Enter label"
            />
          </div>
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-sm text-muted-foreground">Color</label>
            <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
              {colorPresets.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => {
                    setCustomColor(preset.color);
                    handleFormChange();
                  }}
                  className={`w-10 h-10 rounded-lg relative flex items-center justify-center ${
                    customColor === preset.color
                      ? "ring-2 ring-gray-900"
                      : "hover:ring-1 hover:ring-gray-400"
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                >
                  {customColor === preset.color && (
                    <svg
                      className="w-5 h-5 text-white drop-shadow-sm"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleCancelCustomAnnotation}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCustomAnnotation}
            className="inline-flex items-center justify-center rounded-md bg-brand text-white px-3 py-2 text-sm hover:opacity-90"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
