"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({
  helpOpen,
  setHelpOpen,
}) => {
  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>How to Use Pyro Plot</DialogTitle>
          <DialogDescription>
            Learn the controls and actions available in the application
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-hidden border border-border rounded-lg">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">Pan Map</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Left-click and drag to move around the map
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">Rotate Map</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Right-click and drag to rotate the map view
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">Zoom</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Scroll wheel to zoom in and out
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">
                    Add Annotation
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Drag annotation from sidebar and drop on map
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">
                    Move Annotation
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Click and drag annotation label to reposition
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">Resize Area</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Drag corner markers to resize audience/restricted areas
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">
                    Adjust Measurement
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Drag measurement points to change distance
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium">
                    Delete Annotation
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Right-click on annotation label to remove
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Got it
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
