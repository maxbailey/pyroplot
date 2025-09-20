"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { MeasurementUnit, SafetyDistance } from "@/lib/types";

interface SettingsDialogProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  formProjectName: string;
  setFormProjectName: (name: string) => void;
  formMeasurementUnit: MeasurementUnit;
  setFormMeasurementUnit: (unit: MeasurementUnit) => void;
  formSafetyDistance: SafetyDistance;
  setFormSafetyDistance: (distance: SafetyDistance) => void;
  hasFormChanges: boolean;
  handleFormChange: () => void;
  handleSaveSettings: () => void;
  handleCancelSettings: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
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
}) => {
  return (
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
                setFormSafetyDistance(Number(v) as SafetyDistance);
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
  );
};
