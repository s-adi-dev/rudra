import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryCategoryType, useCategories } from "@/store/category";
import { UnitType, WingType } from "@/store/inventory";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { HolderModal } from "./holder-modal";

const residentialConfig = [
  "1bhk",
  "2bhk",
  "3bhk",
  "1bhk+t",
  "2bhk+t",
  "3bhk+t",
  "terrace",
];
const commercialConfig = ["shop", "office"];

interface UnitTableProps {
  units: UnitType[];
  floorIndex: number;
  wingIndex: number;
  wing: WingType;
  updateUnit: (unitIndex: number, data: Partial<UnitType>) => void;
  deleteUnit: (unitIndex: number) => void;
  wings: WingType[];
  isCommercialUnit: boolean;
}

export const UnitTable = ({
  units,
  floorIndex,
  wingIndex,
  updateUnit,
  deleteUnit,
  wings,
  isCommercialUnit,
}: UnitTableProps) => {
  const [isOpen, setIsOpen] = useState<number | boolean>(false);
  const [newStatus, setNewStatus] = useState<string>();
  const [editingUnitSpans, setEditingUnitSpans] = useState<{
    [key: string]: string;
  }>({});

  const configurations = isCommercialUnit
    ? commercialConfig
    : residentialConfig;

  // ---- Dynamic statuses from Categories API
  const { useCategoriesList } = useCategories();
  const { data: categories = [], isLoading } = useCategoriesList();

  // Keep sort consistent with backend: precedence asc, createdAt desc
  const sortedCategories: InventoryCategoryType[] = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.precedence !== b.precedence) return a.precedence - b.precedence;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [categories]);

  const statusNameToLabel = useMemo(() => {
    const map = new Map<string, string>();
    sortedCategories.forEach((c) => map.set(c.name, c.displayName));
    return map;
  }, [sortedCategories]);

  // Generate a unique key for each unit span input
  const getUnitSpanKey = (unitIndex: number) =>
    `${wingIndex}-${floorIndex}-${unitIndex}`;

  function handleStatusChange(unitIndex: number, status: string) {
    const currentStatus = units[unitIndex].status;

    // If changing to available, clear holder & update directly
    if (status === "available") {
      setNewStatus(undefined);
      setIsOpen(false);
      updateUnit(unitIndex, {
        status: "available",
        reservedByOrReason: undefined,
      });
    }
    // If changing FROM available TO something else, open the modal
    else if (currentStatus === "available") {
      setNewStatus(status);
      setIsOpen(unitIndex);
    }
    // For other transitions, update directly
    else {
      updateUnit(unitIndex, { status });
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-center whitespace-nowrap">
              Number
            </TableHead>
            <TableHead className="text-center whitespace-nowrap">
              Unit Span
            </TableHead>
            <TableHead className="text-center">Configuration</TableHead>
            <TableHead className="text-center">Area</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Holder</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit, unitIndex) => (
            <TableRow key={unitIndex} className="hover:bg-card">
              <TableCell align="center">
                <Input
                  className="h-8 w-16 text-center"
                  value={unit.unitNumber}
                  onChange={(e) =>
                    updateUnit(unitIndex, { unitNumber: e.target.value })
                  }
                />
              </TableCell>
              <TableCell align="center">
                <Input
                  className="w-16 text-center"
                  type="number"
                  value={
                    editingUnitSpans[getUnitSpanKey(unitIndex)] !== undefined
                      ? editingUnitSpans[getUnitSpanKey(unitIndex)]
                      : unit.unitSpan
                  }
                  onChange={(e) => {
                    const key = getUnitSpanKey(unitIndex);
                    setEditingUnitSpans({
                      ...editingUnitSpans,
                      [key]: e.target.value,
                    });
                  }}
                  onBlur={() => {
                    const key = getUnitSpanKey(unitIndex);
                    const inputValue = editingUnitSpans[key];
                    const newEditing = { ...editingUnitSpans };
                    delete newEditing[key];
                    setEditingUnitSpans(newEditing);

                    let newValue = parseInt(inputValue);
                    if (isNaN(newValue) || newValue === unit.unitSpan) return;
                    if (newValue < 1) newValue = 1;

                    let currentFloorUnits: UnitType[] = [];
                    if (isCommercialUnit && wings[wingIndex].commercialFloors) {
                      currentFloorUnits =
                        wings[wingIndex].commercialFloors[floorIndex]?.units ||
                        [];
                    } else {
                      currentFloorUnits =
                        wings[wingIndex].floors[floorIndex]?.units || [];
                    }

                    const otherSpans = currentFloorUnits.reduce((t, u, idx) => {
                      if (idx === unitIndex) return t;
                      return t + (u.unitSpan || 1);
                    }, 0);

                    const maxAvailable =
                      wings[wingIndex].unitsPerFloor - otherSpans;
                    if (newValue > maxAvailable) newValue = maxAvailable;

                    updateUnit(unitIndex, { unitSpan: newValue });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  min={1}
                />
              </TableCell>
              <TableCell align="center">
                <Select
                  value={unit.configuration}
                  onValueChange={(e) =>
                    updateUnit(unitIndex, { configuration: e })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Select Configuration" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectGroup>
                      <SelectLabel>Configurations</SelectLabel>
                      {configurations.map((config) => (
                        <SelectItem value={config} key={config}>
                          {config.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell align="center">
                <Input
                  className="w-20 text-center"
                  value={isNaN(unit.area) ? "" : unit.area}
                  type="number"
                  onChange={(e) =>
                    updateUnit(unitIndex, { area: parseInt(e.target.value) })
                  }
                />
              </TableCell>

              <TableCell align="center">
                <Select
                  // If current value isn't in categories yet (loading/race), show empty till loaded
                  value={
                    statusNameToLabel.has(unit.status) ? unit.status : undefined
                  }
                  onValueChange={(e) => handleStatusChange(unitIndex, e)}
                  disabled={isLoading || sortedCategories.length === 0}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue
                      placeholder={isLoading ? "Loading…" : "Select Status"}
                    />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectGroup>
                      <SelectLabel>Unit Status</SelectLabel>
                      {sortedCategories.map((cat) => (
                        <SelectItem value={cat.name} key={cat._id}>
                          {cat.displayName.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell align="center">
                {unit.reservedByOrReason || "N/A"}
              </TableCell>
              <TableCell align="center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteUnit(unitIndex)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <HolderModal
        newStatus={newStatus}
        unitIndex={typeof isOpen === "number" ? isOpen : -1}
        updateUnit={updateUnit}
        isOpen={isOpen !== false}
        onOpenChange={setIsOpen}
      />
    </div>
  );
};
