import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UnitType } from "@/store/inventory";
import withStopPropagation from "@/utils/events/withStopPropagation";
import { capitalizeWords } from "@/utils/func/strUtils";
import { Grid2x2Plus } from "lucide-react";
import { useState } from "react";

interface ReasonModalProps {
  newStatus: string | undefined;
  unitIndex: number;
  updateUnit: (unitIndex: number, data: Partial<UnitType>) => void;
  isOpen: boolean;
  onOpenChange: (state: boolean) => void;
}

export const HolderModal = ({
  newStatus,
  unitIndex,
  updateUnit,
  isOpen,
  onOpenChange,
}: ReasonModalProps) => {
  const [holder, setHolder] = useState("");

  const handleCancel = () => {
    updateUnit(unitIndex, {
      status: "available",
      reservedByOrReason: undefined,
    });
    setHolder("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (newStatus && holder) {
      updateUnit(unitIndex, {
        status: newStatus,
        reservedByOrReason: holder,
      });
      setHolder("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="sm:max-w-[525px] p-6 gap-6 rounded-lg"
        onClick={withStopPropagation()}
      >
        <DialogHeader>
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            <Grid2x2Plus className="h-5 w-5 mt-1" />
            <DialogTitle className="text-xl font-semibold">
              Unit Holder
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-500">
            Add holder's name related to the unit. These will be saved for
            future reference.
          </DialogDescription>
        </DialogHeader>

        <FormFieldWrapper
          LabelText="Holder Name"
          className="gap-2"
          Important
          ImportantSide="right"
        >
          <Input
            placeholder="e.g. John Doe"
            value={holder}
            onChange={(e) => setHolder(capitalizeWords(e.target.value))}
          />
        </FormFieldWrapper>

        <DialogFooter className="gap-3 sm:gap-2 pt-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
            disabled={!holder.trim()}
          >
            Save Holder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
