"use client";

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

interface ClearAnnotationsDialogProps {
  clearAllAnnotations: () => void;
}

export const ClearAnnotationsDialog: React.FC<ClearAnnotationsDialogProps> = ({
  clearAllAnnotations,
}) => {
  return (
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
  );
};
