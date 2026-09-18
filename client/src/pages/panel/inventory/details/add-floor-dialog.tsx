import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/store/category";
import { CreateFloorPayload } from "@/store/inventory";
import { useInventory, WingType } from "@/store/inventory";
import { CustomAxiosError } from "@/utils/types/axios";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

const defaultUnit = (index: number, type: "residential" | "commercial") => ({
  unitNumber: `${index + 1}`,
  area: 1,
  configuration: type === "residential" ? "1bhk" : "shop",
  unitSpan: 1,
  status: "available",
});

type AddFloorDialogProps = {
  projectId: string;
  wing?: WingType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddFloorDialog({
  projectId,
  wing,
  open,
  onOpenChange,
}: AddFloorDialogProps) {
  const { createFloorMutation } = useInventory();
  const { useCategoriesList } = useCategories();
  const { data: categories = [] } = useCategoriesList();
  const statuses = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );
  const [type, setType] = useState<"residential" | "commercial">(
    wing ? "residential" : "commercial",
  );
  const [displayNumber, setDisplayNumber] = useState(1);
  const [showArea, setShowArea] = useState(true);
  const [units, setUnits] = useState([defaultUnit(0, type)]);

  useEffect(() => {
    if (open) {
      const initialType = wing ? "residential" : "commercial";
      setType(initialType);
      setDisplayNumber(1);
      setShowArea(true);
      setUnits([defaultUnit(0, initialType)]);
    }
  }, [open, wing]);

  const totalUnitSpan = units.reduce((total, unit) => total + unit.unitSpan, 0);
  const remainingUnitSpan = wing
    ? wing.unitsPerFloor - totalUnitSpan
    : undefined;

  function updateUnit(index: number, field: string, value: string | number) {
    setUnits((current) =>
      current.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, [field]: value } : unit,
      ),
    );
  }

  function addUnit() {
    if (remainingUnitSpan !== undefined && remainingUnitSpan < 1) return;
    setUnits((current) => [...current, defaultUnit(current.length, type)]);
  }

  async function handleSubmit() {
    if (
      !displayNumber ||
      units.some((unit) => !unit.unitNumber.trim() || unit.area <= 0)
    ) {
      toast({
        title: "Invalid floor",
        description: "Enter a floor number and valid details for every unit.",
        variant: "warning",
      });
      return;
    }
    if (
      new Set(units.map((unit) => unit.unitNumber.trim())).size !== units.length
    ) {
      toast({
        title: "Duplicate unit number",
        description: "Every unit on a floor must have a unique number.",
        variant: "warning",
      });
      return;
    }
    if (wing && totalUnitSpan !== wing.unitsPerFloor) {
      toast({
        title: "Unit span is incomplete",
        description: `This floor must use exactly ${wing.unitsPerFloor} unit spaces.`,
        variant: "warning",
      });
      return;
    }

    const payload: CreateFloorPayload = {
      projectId,
      ...(wing?._id ? { wingId: wing._id } : {}),
      type,
      displayNumber,
      showArea,
      units,
    };

    try {
      await createFloorMutation.mutateAsync(payload);
      toast({
        title: "Floor added",
        description: `Floor ${displayNumber} was added successfully.`,
        variant: "success",
      });
      onOpenChange(false);
    } catch (error) {
      const err = error as CustomAxiosError;
      toast({
        title: "Could not add floor",
        description:
          err.response?.data?.error || err.message || "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add {wing ? "Wing" : "Project"} {type} Floor
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormFieldWrapper LabelText="Floor display number">
            <Input
              type="number"
              min={0}
              value={displayNumber}
              onChange={(event) => setDisplayNumber(Number(event.target.value))}
            />
          </FormFieldWrapper>
          {wing && (
            <FormFieldWrapper LabelText="Floor type">
              <Select
                value={type}
                onValueChange={(value) => {
                  const nextType = value as "residential" | "commercial";
                  setType(nextType);
                  setUnits((current) =>
                    current.map((unit) => ({
                      ...unit,
                      configuration:
                        nextType === "residential" ? "1bhk" : "shop",
                    })),
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select floor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </FormFieldWrapper>
          )}
          <FormFieldWrapper LabelText="Show area">
            <label className="flex h-10 items-center gap-2 text-sm">
              <Checkbox
                checked={showArea}
                onCheckedChange={(checked) => setShowArea(checked === true)}
              />
              Display area in inventory
            </label>
          </FormFieldWrapper>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Unit details</h4>
              <p className="text-sm text-muted-foreground">
                {wing
                  ? `${totalUnitSpan} of ${wing.unitsPerFloor} unit spaces used`
                  : `${units.length} units`}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addUnit}>
              <Plus className="mr-2 h-4 w-4" /> Add unit
            </Button>
          </div>
          <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_1.2fr_1fr_2.5rem] gap-2 px-3 text-sm font-medium text-muted-foreground sm:grid">
            <span>Unit No.</span>
            <span>Unit Space</span>
            <span>Area</span>
            <span>Configuration</span>
            <span>Status</span>
            <span className="sr-only">Action</span>
          </div>
          <div className="space-y-3">
            {units.map((unit, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-[1.2fr_0.8fr_1fr_1.2fr_1fr_2.5rem]"
              >
                <Input
                  aria-label="Unit number"
                  placeholder="e.g. 101"
                  value={unit.unitNumber}
                  onChange={(event) =>
                    updateUnit(index, "unitNumber", event.target.value)
                  }
                />
                <Input
                  aria-label="Unit space"
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={unit.unitSpan}
                  onChange={(event) =>
                    updateUnit(
                      index,
                      "unitSpan",
                      Math.max(1, Number(event.target.value)),
                    )
                  }
                />
                <Input
                  aria-label="Area"
                  type="number"
                  min={1}
                  placeholder="e.g. 850"
                  value={unit.area}
                  onChange={(event) =>
                    updateUnit(index, "area", Number(event.target.value))
                  }
                />
                <Input
                  aria-label="Configuration"
                  placeholder="e.g. 2bhk"
                  value={unit.configuration}
                  onChange={(event) =>
                    updateUnit(index, "configuration", event.target.value)
                  }
                />
                <Select
                  value={unit.status}
                  onValueChange={(value) => updateUnit(index, "status", value)}
                >
                  <SelectTrigger aria-label="Status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(statuses.length ? statuses : ["available"]).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="miniIcon"
                  disabled={units.length === 1}
                  onClick={() =>
                    setUnits((current) =>
                      current.filter((_, unitIndex) => unitIndex !== index),
                    )
                  }
                  aria-label={`Remove unit ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createFloorMutation.isPending}
          >
            {createFloorMutation.isPending ? "Adding..." : "Add floor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
