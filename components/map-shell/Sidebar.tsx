"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { AnnotationRecord } from "../../app/components/map-shell";
import type mapboxgl from "mapbox-gl";
import { ShareDialog } from "./dialogs/share-dialog";
import { ClearAnnotationsDialog } from "./dialogs/clear-annotations-dialog";
import { CustomAnnotationDialog } from "./dialogs/custom-annotation-dialog";
import { SettingsDialog } from "./dialogs/settings-dialog";

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
  mapRef: React.RefObject<mapboxgl.Map | null>;
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
  annotationsRef: React.RefObject<Record<string, AnnotationRecord>>;
  addExtrusionForAnnotation: (rec: AnnotationRecord) => void;
  removeExtrusionForAnnotation: (rec: AnnotationRecord) => void;
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
  formProjectName,
  setFormProjectName,
  formMeasurementUnit,
  setFormMeasurementUnit,
  formSafetyDistance,
  setFormSafetyDistance,
  hasFormChanges,
  handleFormChange,
  handleSaveSettings,
  handleCancelSettings,
  customAnnotationOpen,
  setCustomAnnotationOpen,
  customLabel,
  setCustomLabel,
  customColor,
  setCustomColor,
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
  setDisclaimerOpen,
  annotationsRef,
  addExtrusionForAnnotation,
  removeExtrusionForAnnotation,
}) => {
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
      {/* Logo */}
      <div className="flex items-center justify-center select-none">
        <Image
          src="/pyroplot-logo.svg"
          alt="Pyro Plot"
          width={140}
          height={100}
        />
      </div>

      {/* Search */}
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

      {/* Annotations */}
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
          {/* Settings Dialog */}
          <SettingsDialog
            settingsOpen={settingsOpen}
            setSettingsOpen={setSettingsOpen}
            formProjectName={formProjectName}
            setFormProjectName={setFormProjectName}
            formMeasurementUnit={formMeasurementUnit}
            setFormMeasurementUnit={setFormMeasurementUnit}
            formSafetyDistance={formSafetyDistance}
            setFormSafetyDistance={setFormSafetyDistance}
            hasFormChanges={hasFormChanges}
            handleFormChange={handleFormChange}
            handleSaveSettings={handleSaveSettings}
            handleCancelSettings={handleCancelSettings}
          />

          {/* Custom Annotation Dialog */}
          <CustomAnnotationDialog
            customAnnotationOpen={customAnnotationOpen}
            setCustomAnnotationOpen={setCustomAnnotationOpen}
            customLabel={customLabel}
            setCustomLabel={setCustomLabel}
            customColor={customColor}
            setCustomColor={setCustomColor}
            handleFormChange={handleFormChange}
            handleSaveCustomAnnotation={handleSaveCustomAnnotation}
            handleCancelCustomAnnotation={handleCancelCustomAnnotation}
          />

          {/* Reset Camera Button */}
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

          {/* Show Height Button */}
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

          {/* Share Dialog */}
          <ShareDialog
            shareOpen={shareOpen}
            setShareOpen={setShareOpen}
            shareUrl={shareUrl}
            copied={copied}
            setCopied={setCopied}
            openShareDialog={openShareDialog}
          />

          {/* Clear Annotations Dialog */}
          <ClearAnnotationsDialog clearAllAnnotations={clearAllAnnotations} />
        </div>

        {/* Legal Disclaimer */}
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
