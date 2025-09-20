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

interface ShareDialogProps {
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
  shareUrl: string;
  copied: boolean;
  setCopied: (copied: boolean) => void;
  openShareDialog: () => Promise<void>;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  shareOpen,
  setShareOpen,
  shareUrl,
  copied,
  setCopied,
  openShareDialog,
}) => {
  return (
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
            Copy this link to share. Opening it restores the current camera and
            annotations.
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
  );
};
