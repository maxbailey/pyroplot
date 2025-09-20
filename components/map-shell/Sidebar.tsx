"use client";

import Image from "next/image";
import type { AnnotationRecord } from "@/lib/types";
import { ANNOTATION_PALETTE } from "@/lib/constants";
import { ShareDialog } from "./dialogs/share-dialog";
import { ClearAnnotationsDialog } from "./dialogs/clear-annotations-dialog";
import { CustomAnnotationDialog } from "./dialogs/custom-annotation-dialog";
import { SettingsDialog } from "./dialogs/settings-dialog";
import { DisclaimerDialog } from "./dialogs/disclaimer-dialog";
import {
  useMapContext,
  useAnnotationContext,
  useSettingsContext,
  useUIContext,
} from "@/lib/contexts";
import { usePdfGenerator } from "../pdf-generator/usePdfGenerator";

interface SidebarProps {
  // Only essential props that can't be provided via context
  mapRef: React.RefObject<mapboxgl.Map | null>;
  annotationsRef: React.RefObject<Record<string, AnnotationRecord>>;
  addExtrusionForAnnotation: (rec: AnnotationRecord) => void;
  removeExtrusionForAnnotation: (rec: AnnotationRecord) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mapRef,
  annotationsRef,
  addExtrusionForAnnotation,
  removeExtrusionForAnnotation,
}) => {
  // Get context values
  const {
    searchQuery,
    suggestions,
    activeIndex,
    setSearchQuery,
    setSuggestions,
    setActiveIndex,
    handleSubmitOrSelect,
  } = useMapContext();

  const {
    settingsOpen,
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
    openSettingsDialog,
  } = useSettingsContext();

  const {
    customAnnotationOpen,
    setCustomAnnotationOpen,
    customLabel,
    setCustomLabel,
    customColor,
    setCustomColor,
    setEditingCustomAnnotation,
    showHeight,
    setShowHeight,
    shareOpen,
    setShareOpen,
    shareUrl,
    copied,
    setCopied,
    openShareDialog,
    disclaimerOpen,
    setDisclaimerOpen,
  } = useUIContext();

  const { clearAll, audienceAreas, measurements, restrictedAreas } =
    useAnnotationContext();

  const { projectName, measurementUnit, safetyDistance } = useSettingsContext();

  // Get PDF generator hook
  const { isGenerating, generateSitePlanPdf } = usePdfGenerator({
    mapRef,
    annotationsRef,
    audienceAreasRef: { current: audienceAreas },
    measurementsRef: { current: measurements },
    restrictedAreasRef: { current: restrictedAreas },
    projectName,
    measurementUnit,
    safetyDistance,
  });

  // Custom annotation handlers
  const handleSaveCustomAnnotation = () => {
    // This would need to be implemented based on the custom annotation logic
    console.log("Save custom annotation");
  };

  const handleCancelCustomAnnotation = () => {
    setCustomAnnotationOpen(false);
    setEditingCustomAnnotation(null);
    setCustomLabel("");
    setCustomColor("#8B5CF6");
  };
  return (
    <aside className="w-[300px] p-4 space-y-4 overflow-y-auto">
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
                setActiveIndex((activeIndex + 1) % suggestions.length);
              } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex(
                  (activeIndex - 1 + suggestions.length) % suggestions.length
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
          {ANNOTATION_PALETTE.map((a) => (
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
            setSettingsOpen={openSettingsDialog}
            formProjectName={formProjectName}
            setFormProjectName={setFormProjectName}
            formMeasurementUnit={formMeasurementUnit}
            setFormMeasurementUnit={setFormMeasurementUnit}
            formSafetyDistance={formSafetyDistance}
            setFormSafetyDistance={setFormSafetyDistance}
            hasFormChanges={hasFormChanges}
            handleFormChange={() => handleFormChange("", "")}
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
            handleFormChange={() => handleFormChange("", "")}
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
              const next = !showHeight;
              const map = mapRef.current;
              if (!map) return;
              // apply or remove on all existing annotations
              for (const key of Object.keys(annotationsRef.current)) {
                const rec = annotationsRef.current[key]!;
                if (next) addExtrusionForAnnotation(rec);
                else removeExtrusionForAnnotation(rec);
              }
              setShowHeight(next);
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
            openShareDialog={async () => await openShareDialog()}
          />

          {/* Clear Annotations Dialog */}
          <ClearAnnotationsDialog clearAllAnnotations={clearAll} />
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

      {/* Disclaimer Dialog */}
      <DisclaimerDialog
        disclaimerOpen={disclaimerOpen}
        setDisclaimerOpen={setDisclaimerOpen}
      />
    </aside>
  );
};
