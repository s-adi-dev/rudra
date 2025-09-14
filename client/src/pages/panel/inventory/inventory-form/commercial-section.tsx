import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FloorType, UnitType } from "@/store/inventory";
import {
  CirclePlus,
  Eye,
  EyeClosed,
  MoreVertical,
  Trash,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HolderModal } from "./holder-modal";

const configurations = ["shop", "office"];

// UnitTable Component
const UnitTable = ({
  units,
  updateUnit,
  deleteUnit,
}: {
  units: UnitType[];
  updateUnit: (unitIndex: number, data: Partial<UnitType>) => void;
  deleteUnit: (unitIndex: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState<number | boolean>(false);
  const [newStatus, setNewStatus] = useState<string>();
  const { useCategoriesList } = useCategories();
  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategoriesList();

  const sortedCategories = useMemo<InventoryCategoryType[]>(
    () =>
      [...(categories || [])].sort((a, b) =>
        a.precedence !== b.precedence
          ? a.precedence - b.precedence
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [categories],
  );

  function handleStatusChange(unitIndex: number, status: string) {
    const currentStatus = units[unitIndex].status;

    // If changing to available, update directly
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
    // For any other change (not from available), update directly
    else {
      updateUnit(unitIndex, {
        status: status,
      });
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
                    updateUnit(unitIndex, {
                      unitNumber: e.target.value,
                    })
                  }
                />
              </TableCell>

              <TableCell align="center">
                <Select
                  value={unit.configuration}
                  onValueChange={(e) =>
                    updateUnit(unitIndex, {
                      configuration: e,
                    })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Select Configuration" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectGroup>
                      <SelectLabel>Configurations</SelectLabel>
                      {configurations.map((config, index) => (
                        <SelectItem value={config} key={index}>
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
                    updateUnit(unitIndex, {
                      area: parseInt(e.target.value),
                    })
                  }
                />
              </TableCell>

              <TableCell align="center">
                <Select
                  value={unit.status}
                  onValueChange={(e) =>
                    handleStatusChange(unitIndex, e as string)
                  }
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectGroup>
                      <SelectLabel>Unit Status</SelectLabel>
                      {sortedCategories.map((status, index) => (
                        <SelectItem value={status.name!} key={index}>
                          {status.name!.toUpperCase()}
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

// FloorCard Component
const FloorCard = ({
  floor,
  floorIndex,
  updateFloor,
  deleteFloor,
}: {
  floor: FloorType;
  floorIndex: number;
  updateFloor: (floorIndex: number, data: Partial<FloorType>) => void;
  deleteFloor: (floorIndex: number) => void;
}) => {
  const addUnit = () => {
    const units = floor?.units || [];
    const newUnit: UnitType = {
      unitNumber: `${floorIndex + 1}${String(units.length + 1).padStart(2, "0")}`,
      area: 0,
      configuration: "shop",
      unitSpan: 1,
      status: "available",
    };

    const updatedUnits = [...units, newUnit];

    updateFloor(floorIndex, { ...floor, units: updatedUnits });
  };

  const updateUnit = (unitIndex: number, data: Partial<UnitType>) => {
    const units = [...(floor.units || [])];
    const currentUnit = units[unitIndex];

    units[unitIndex] = {
      ...currentUnit,
      ...data,
    };

    updateFloor(floorIndex, { ...floor, units: units });
  };

  const deleteUnit = (unitIndex: number) => {
    const units = [...floor.units];
    const updatedUnits = units.filter((_, i) => i !== unitIndex);

    updateFloor(floorIndex, { ...floor, units: updatedUnits });
  };

  const handleShowArea = () => {
    updateFloor(floorIndex, { showArea: !floor.showArea });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {`Commercial Floor
            ${floor.displayNumber}`}
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger className="md:hidden" asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={addUnit}>
                <CirclePlus className="h-4 w-4 mr-2" /> Add Unit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShowArea}>
                {!floor.showArea ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" /> Show Area
                  </>
                ) : (
                  <>
                    <EyeClosed className="mr-2 h-4 w-4" /> Hide Area
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="items-center text-red-500"
                onClick={() => deleteFloor(floorIndex)}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden md:flex space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={addUnit}>
              <CirclePlus className="mr-2 h-4 w-4" /> Add Unit
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShowArea}
            >
              {!floor.showArea ? (
                <>
                  <Eye className="mr-2 h-4 w-4" /> Show Area
                </>
              ) : (
                <>
                  <EyeClosed className="mr-2 h-4 w-4" /> Hide Area
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteFloor(floorIndex)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <FormFieldWrapper
            LabelText="Floor Display No"
            style={{ marginBottom: "1.25rem" }}
          >
            <Input
              type="number"
              value={floor.displayNumber}
              onChange={(e) =>
                updateFloor(floorIndex, {
                  displayNumber: Number(e.target.value),
                })
              }
            />
          </FormFieldWrapper>
        </div>
        {floor.units && floor.units.length > 0 ? (
          <UnitTable
            units={floor.units}
            updateUnit={updateUnit}
            deleteUnit={deleteUnit}
          />
        ) : (
          <div
            className="border border-dashed rounded-sm flex flex-col justify-center items-center gap-3 p-8"
            style={{ marginTop: "1rem" }}
          >
            <p className="text-secondary text-center">No units added yet</p>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-1"
              onClick={addUnit}
            >
              <CirclePlus size={16} />
              Add Unit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main CommercialSection Component
interface CommercialSectionProps {
  commercialFloors: FloorType[] | undefined;
  onCommercialFloorsChange: (value: FloorType[]) => void;
}

export const CommercialSection = ({
  commercialFloors,
  onCommercialFloorsChange,
}: CommercialSectionProps) => {
  const addFloor = () => {
    const floors = commercialFloors || [];
    const newFloor: FloorType = {
      displayNumber: floors.length + 1,
      type: "commercial",
      showArea: false,
      units: [],
    };

    onCommercialFloorsChange([...floors, newFloor as FloorType]);
  };

  const updateFloor = (floorIndex: number, data: Partial<FloorType>) => {
    const floors = commercialFloors || [];
    if (floors && floors[floorIndex]) {
      floors[floorIndex] = {
        ...floors[floorIndex],
        ...data,
      };
    }

    onCommercialFloorsChange(floors);
  };

  const deleteFloor = (floorIndex: number) => {
    const floors = commercialFloors || [];
    if (floors) {
      const updatedFloors = floors.filter((_, i) => i !== floorIndex);
      onCommercialFloorsChange([...updatedFloors]);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t space-y-4">
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "1.5rem" }}
      >
        <h3 className="text-lg font-medium">Commercial Floors and Units</h3>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-center gap-1"
          onClick={addFloor}
        >
          <CirclePlus size={16} />
          Add Floor
        </Button>
      </div>

      {commercialFloors && commercialFloors.length > 0 ? (
        <div className="space-y-4">
          {commercialFloors.map((floor, floorIndex) => (
            <FloorCard
              key={floorIndex}
              floor={floor}
              floorIndex={floorIndex}
              updateFloor={updateFloor}
              deleteFloor={deleteFloor}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-sm flex flex-col justify-center items-center gap-3 p-8">
          <p className="text-secondary text-center">
            No commercial floors added to this project yet
          </p>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1"
            onClick={addFloor}
          >
            <CirclePlus size={16} />
            Add First Floor
          </Button>
        </div>
      )}
    </div>
  );
};
