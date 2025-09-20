"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type AnnotationItem = {
  key: string;
  label: string;
  inches: number;
  color: string;
};

type MeasurementUnit = "feet" | "meters";

interface SidebarProps {
  // Search-related props
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: Array<{ id: string; text: string; center?: [number, number] }>;
  setSuggestions: (
    suggestions: Array<{ id: string; text: string; center?: [number, number] }>
  ) => void;
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  handleSubmitOrSelect: (idOrQuery?: string) => Promise<void>;

  // Settings-related props
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  projectName: string;
  formProjectName: string;
  setFormProjectName: (name: string) => void;
  measurementUnit: MeasurementUnit;
  formMeasurementUnit: MeasurementUnit;
  setFormMeasurementUnit: (unit: MeasurementUnit) => void;
  safetyDistance: 70 | 100;
  formSafetyDistance: 70 | 100;
  setFormSafetyDistance: (distance: 70 | 100) => void;
  hasFormChanges: boolean;
  setHasFormChanges: (hasChanges: boolean) => void;
  handleFormChange: () => void;
  handleSaveSettings: () => void;
  handleCancelSettings: () => void;

  // Custom annotation props
  customAnnotationOpen: boolean;
  setCustomAnnotationOpen: (open: boolean) => void;
  customLabel: string;
  setCustomLabel: (label: string) => void;
  customColor: string;
  setCustomColor: (color: string) => void;
  editingCustomAnnotation: string | null;
  setEditingCustomAnnotation: (id: string | null) => void;
  handleSaveCustomAnnotation: () => void;
  handleCancelCustomAnnotation: () => void;

  // Map-related props
  mapRef: React.RefObject<any>;
  showHeight: boolean;
  setShowHeight: (show: boolean | ((prev: boolean) => boolean)) => void;
  isGenerating: boolean;
  generateSitePlanPdf: () => Promise<void>;

  // Share props
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
  shareUrl: string;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  openShareDialog: () => Promise<void>;

  // Clear annotations
  clearAllAnnotations: () => void;

  // Disclaimer
  disclaimerOpen: boolean;
  setDisclaimerOpen: (open: boolean) => void;

  // Annotation refs and functions
  annotationsRef: React.RefObject<Record<string, any>>;
  addExtrusionForAnnotation: (rec: any) => void;
  removeExtrusionForAnnotation: (rec: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  searchQuery,
  setSearchQuery,
  suggestions,
  setSuggestions,
  activeIndex,
  setActiveIndex,
  handleSubmitOrSelect,
  settingsOpen,
  setSettingsOpen,
  projectName,
  formProjectName,
  setFormProjectName,
  measurementUnit,
  formMeasurementUnit,
  setFormMeasurementUnit,
  safetyDistance,
  formSafetyDistance,
  setFormSafetyDistance,
  hasFormChanges,
  setHasFormChanges,
  handleFormChange,
  handleSaveSettings,
  handleCancelSettings,
  customAnnotationOpen,
  setCustomAnnotationOpen,
  customLabel,
  setCustomLabel,
  customColor,
  setCustomColor,
  editingCustomAnnotation,
  setEditingCustomAnnotation,
  handleSaveCustomAnnotation,
  handleCancelCustomAnnotation,
  mapRef,
  showHeight,
  setShowHeight,
  isGenerating,
  generateSitePlanPdf,
  shareOpen,
  setShareOpen,
  shareUrl,
  copied,
  setCopied,
  openShareDialog,
  clearAllAnnotations,
  disclaimerOpen,
  setDisclaimerOpen,
  annotationsRef,
  addExtrusionForAnnotation,
  removeExtrusionForAnnotation,
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

  const annotationPalette = useMemo<AnnotationItem[]>(
    () => [
      { key: "bore-1", label: '1" Bore', inches: 1, color: "#FF5126" },
      { key: "bore-1-2", label: '1.2" Bore', inches: 1.2, color: "#FF5126" },
      { key: "bore-1-5", label: '1.5" Bore', inches: 1.5, color: "#FF5126" },
      {
        key: "shell-1-75",
        label: '1.75" Shells',
        inches: 1.75,
        color: "#FF5126",
      },
      { key: "shell-2", label: '2" Shells', inches: 2, color: "#FF5126" },
      { key: "shell-2-5", label: '2.5" Shells', inches: 2.5, color: "#FF5126" },
      { key: "shell-3", label: '3" Shells', inches: 3, color: "#FF5126" },
      { key: "shell-4", label: '4" Shells', inches: 4, color: "#FF5126" },
      { key: "shell-5", label: '5" Shells', inches: 5, color: "#FF5126" },
      { key: "shell-6", label: '6" Shells', inches: 6, color: "#FF5126" },
      { key: "shell-7", label: '7" Shells', inches: 7, color: "#FF5126" },
      { key: "shell-8", label: '8" Shells', inches: 8, color: "#FF5126" },
      { key: "shell-10", label: '10" Shells', inches: 10, color: "#FF5126" },
      { key: "shell-12", label: '12" Shells', inches: 12, color: "#FF5126" },
      { key: "shell-16", label: '16" Shells', inches: 16, color: "#FF5126" },
      { key: "audience", label: "Audience", inches: 0, color: "#3B82F6" },
      { key: "measurement", label: "Measurement", inches: 0, color: "#22C55E" },
      { key: "restricted", label: "Restricted", inches: 0, color: "#EF4444" },
      { key: "custom", label: "Custom", inches: 0, color: "#8B5CF6" },
    ],
    []
  );

  return (
    <aside className="w-[300px] shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-center select-none">
        <Image
          src="/pyroplot-logo.svg"
          alt="Pyro Plot"
          width={140}
          height={100}
        />
      </div>

      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              void handleSubmitOrSelect(suggestions[activeIndex]?.id);
            } else {
              void handleSubmitOrSelect();
            }
          }}
          className="space-y-2"
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex((idx: number) => (idx + 1) % suggestions.length);
              } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex(
                  (idx: number) =>
                    (idx - 1 + suggestions.length) % suggestions.length
                );
              } else if (e.key === "Escape") {
                setSuggestions([]);
                setActiveIndex(-1);
              }
            }}
            placeholder="Search for a place on Earth..."
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="search-suggestions"
            aria-activedescendant={
              activeIndex >= 0 && suggestions[activeIndex]
                ? `sugg-${suggestions[activeIndex]!.id}`
                : undefined
            }
            className="w-full rounded-md border border-input bg-white/5 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {suggestions.length > 0 && (
          <ul
            id="search-suggestions"
            role="listbox"
            className="mt-2 max-h-60 overflow-auto rounded-md border border-border bg-popover text-sm"
          >
            {suggestions.map((s, i) => (
              <li
                id={`sugg-${s.id}`}
                role="option"
                aria-selected={i === activeIndex}
                key={s.id}
                className={`cursor-pointer px-3 py-2 ${
                  i === activeIndex ? "bg-muted" : "hover:bg-muted"
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => void handleSubmitOrSelect(s.id)}
              >
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Annotations
        </div>
        <div className="grid grid-cols-2 gap-2">
          {annotationPalette.map((a) => (
            <button
              key={a.key}
              title={a.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({
                    key: a.key,
                    glyph:
                      a.key === "audience"
                        ? "🤩"
                        : a.key === "measurement"
                        ? "📐"
                        : a.key === "restricted"
                        ? "🚫"
                        : a.key === "custom"
                        ? "✨"
                        : "💥",
                  })
                );
              }}
              className="h-9 w-full grid grid-cols-[20px_1fr] items-center text-start gap-0.5 rounded-md border border-border bg-white/5 !cursor-move hover:bg-muted px-2 text-xs"
              type="button"
            >
              <span>
                {a.key === "audience"
                  ? "🤩"
                  : a.key === "measurement"
                  ? "📐"
                  : a.key === "restricted"
                  ? "🚫"
                  : a.key === "custom"
                  ? "✨"
                  : "💥"}
              </span>
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Actions
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <Dialog open={settingsOpen} onOpenChange={(o) => setSettingsOpen(o)}>
            <div className="flex justify-between items-center gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  Settings
                </button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-sm text-muted-foreground">
                    Project Name
                  </label>
                  <Input
                    value={formProjectName}
                    onChange={(e) => {
                      setFormProjectName(e.target.value);
                      handleFormChange();
                    }}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-sm text-muted-foreground">
                    Measurement Unit
                  </label>
                  <Select
                    value={formMeasurementUnit}
                    onValueChange={(v) => {
                      setFormMeasurementUnit(v as MeasurementUnit);
                      handleFormChange();
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feet">Feet</SelectItem>
                      <SelectItem value="meters">Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-sm text-muted-foreground">
                    Safety Distance
                  </label>
                  <Select
                    value={formSafetyDistance.toString()}
                    onValueChange={(v) => {
                      setFormSafetyDistance(Number(v) as 70 | 100);
                      handleFormChange();
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select safety distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="70">70ft per inch</SelectItem>
                      <SelectItem value="100">100ft per inch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={handleCancelSettings}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={!hasFormChanges}
                  className="inline-flex items-center justify-center rounded-md bg-brand text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Custom Annotation Dialog */}
          <Dialog
            open={customAnnotationOpen}
            onOpenChange={setCustomAnnotationOpen}
          >
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

          <button
            type="button"
            onClick={() => {
              if (!mapRef.current) return;
              mapRef.current.easeTo({
                center: mapRef.current.getCenter(),
                zoom: mapRef.current.getZoom(),
                pitch: 30,
                bearing: 0,
                duration: 600,
              });
            }}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Reset Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setShowHeight((prev: boolean) => {
                const next = !prev;
                const map = mapRef.current;
                if (!map) return next;
                // apply or remove on all existing annotations
                for (const key of Object.keys(annotationsRef.current)) {
                  const rec = annotationsRef.current[key]!;
                  if (next) addExtrusionForAnnotation(rec);
                  else removeExtrusionForAnnotation(rec);
                }
                return next;
              });
            }}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            {showHeight ? "Hide Height" : "Show Height"}
          </button>
          <button
            type="button"
            onClick={() => void generateSitePlanPdf()}
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            {isGenerating ? "Generating…" : "Generate Site Plan"}
          </button>
          <Dialog
            open={shareOpen}
            onOpenChange={(open) => {
              setShareOpen(open);
              if (!open) setCopied(false);
            }}
          >
            <div className="flex justify-between items-center gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => void openShareDialog()}
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  Share Site Plan
                </button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share this site plan</DialogTitle>
                <DialogDescription>
                  Copy this link to share. Opening it restores the current
                  camera and annotations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <input
                  value={shareUrl}
                  readOnly
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                      } catch {}
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    {copied ? "✓ Copied Link" : "Copy link"}
                  </button>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                    >
                      Close
                    </button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <div className="flex justify-between items-center gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background text-brand px-3 py-2 text-sm hover:bg-muted"
                >
                  Clear Annotations
                </button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear annotations?</DialogTitle>
                <DialogDescription>
                  This will remove all annotations you have added to the map.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <DialogClose asChild>
                  <button
                    type="button"
                    onClick={() => clearAllAnnotations()}
                    className="inline-flex items-center justify-center rounded-md bg-brand text-white px-3 py-2 text-sm hover:opacity-90"
                  >
                    Confirm clear
                  </button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="mt-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Pyro Plot. All rights reserved.
          <br />
          For planning only, not a substitute for safety training or legal
          approval.{" "}
          <button
            type="button"
            onClick={() => setDisclaimerOpen(true)}
            className="text-white hover:text-white/70 hover:underline"
          >
            Learn more
          </button>
        </p>
      </div>
    </aside>
  );
};
