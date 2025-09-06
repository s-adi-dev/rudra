import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/hooks/use-role";
import { toast, useToast } from "@/hooks/use-toast";
import { useAuth } from "@/store/auth";
import { InventoryCategoryType, useCategories } from "@/store/category";
import { useUpdateClientBooking } from "@/store/client-booking/query";
import { UnitType, WingType, useInventory } from "@/store/inventory";
import { capitalizeWords } from "@/utils/func/strUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { MoreHorizontalIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ------------------------
 *  UTILITIES
 *  ------------------------ */
const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const idealTextColor = (bgHex: string) => {
  try {
    const { r, g, b } = hexToRgb(bgHex);
    // YIQ contrast
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#111827" /* slate-900 */ : "#F8FAFC" /* slate-50 */;
  } catch {
    return "#111827";
  }
};

/** Count units matching a given status */
const countUnitsBy = (units: UnitType[], statusName: string) =>
  units.filter((u) => u.status === statusName).length;

/** ------------------------
 *  TOP-LEVEL: WingInfo
 *  ------------------------ */
export const WingInfo = ({ wings }: { wings: WingType[] }) => {
  const [activeWingIndex, setActiveWingIndex] = useState(0);

  // Fetch categories once and memoize sorted by precedence asc, createdAt desc
  const { useCategoriesList } = useCategories();
  const { data: categories = [] } = useCategoriesList();

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.precedence !== b.precedence) return a.precedence - b.precedence;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [categories]);

  // Helpers derived from categories
  const othersKey = useMemo(
    () => sortedCategories.find((c) => c.name === "others")?.name,
    [sortedCategories],
  );

  return (
    <div className="space-y-6 mt-6 pt-6 border-t">
      <h3 className="text-lg font-medium">Wing Information</h3>
      {wings.length > 0 ? (
        <>
          {wings.length > 1 ? (
            <Tabs
              defaultValue={activeWingIndex.toString()}
              value={activeWingIndex.toString()}
              onValueChange={(value) => setActiveWingIndex(parseInt(value))}
              className="w-full"
            >
              <TabsList className="flex-wrap mb-4">
                {wings.map((wing, index) => (
                  <TabsTrigger key={index} value={index.toString()}>
                    {wing.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {wings.map((wing, wingIndex) => (
                <TabsContent key={wingIndex} value={wingIndex.toString()}>
                  <WingCard
                    wing={wing}
                    categories={sortedCategories}
                    othersKey={othersKey}
                  />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <WingCard
              wing={wings[0]}
              categories={sortedCategories}
              othersKey={othersKey}
            />
          )}
        </>
      ) : (
        <div>No Wings Found</div>
      )}
    </div>
  );
};

/** ------------------------
 *  Floor Table (dynamic columns)
 *  ------------------------ */
function FloorTable({
  wing,
  categories,
  othersKey,
}: {
  wing: WingType;
  categories: InventoryCategoryType[];
  othersKey?: string;
}) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleItem = (id: string) => {
    setOpenItems({ [id]: !openItems[id] });
  };

  useEffect(() => {
    const newHeights: Record<string, number> = {};
    Object.keys(contentRefs.current).forEach((id) => {
      const element = contentRefs.current[id];
      if (element) newHeights[id] = element.scrollHeight;
    });
    setHeights(newHeights);
  }, [wing.floors]);

  const totalUnitsExcludingOthers = (units: UnitType[]) =>
    units.length - (othersKey ? countUnitsBy(units, othersKey) : 0);

  const wingTotalsBy = (statusName: string) =>
    wing.floors.reduce((acc, f) => acc + countUnitsBy(f.units, statusName), 0);

  return (
    <div className="border rounded-md overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <TableHeader>
          <TableRow className="bg-card hover:bg-card sticky top-0 z-20">
            <TableHead className="text-center whitespace-nowrap">
              Floor No
            </TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-center whitespace-nowrap">
              Total Units
            </TableHead>
            {categories.map((cat) => (
              <TableHead
                key={cat._id}
                className="text-center whitespace-nowrap"
              >
                {cat.displayName}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {wing.floors?.map((floor) => {
            const floorId = floor.displayNumber.toString();
            const isOpen = openItems[floorId] || false;

            return (
              <React.Fragment key={floorId}>
                <TableRow
                  className={`transition-colors duration-200 cursor-pointer ${isOpen ? "bg-muted/30" : ""}`}
                  onClick={() => toggleItem(floorId)}
                >
                  <TableCell className="text-center">
                    {floor.displayNumber}
                  </TableCell>
                  <TableCell className="text-center">{floor.type}</TableCell>
                  <TableCell className="text-center">
                    {totalUnitsExcludingOthers(floor.units)}
                  </TableCell>
                  {categories.map((cat) => (
                    <TableCell key={cat._id} className="text-center">
                      {countUnitsBy(floor.units, cat.name)}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow className="hover:bg-card expandable-row">
                  <TableCell
                    colSpan={3 + categories.length}
                    className="p-0 border-b border-t-0"
                  >
                    <div
                      style={{
                        height: isOpen ? `${heights[floorId] || 0}px` : "0px",
                        opacity: isOpen ? 1 : 0,
                        overflow: "hidden",
                        transition: "height 0.3s ease, opacity 0.3s ease",
                      }}
                    >
                      <div ref={(e) => (contentRefs.current[floorId] = e)}>
                        <UnitTable
                          units={floor.units}
                          categories={categories}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-card hover:bg-card sticky bottom-0 z-20">
            <TableCell colSpan={2} className="text-center font-medium">
              Total
            </TableCell>
            <TableCell className="text-center font-medium">
              {wing.floors.reduce(
                (total, floor) =>
                  total + totalUnitsExcludingOthers(floor.units),
                0,
              )}
            </TableCell>
            {categories.map((cat) => (
              <TableCell key={cat._id} className="text-center font-medium">
                {wingTotalsBy(cat.name)}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </table>
    </div>
  );
}

/** ------------------------
 *  WingCard
 *  ------------------------ */
function WingCard({
  wing,
  isEditable = false,
  categories,
  othersKey,
}: {
  wing: WingType;
  isEditable?: boolean;
  categories: InventoryCategoryType[];
  othersKey?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Wing {wing.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <FormFieldWrapper
            LabelText="Wing Name"
            Important={isEditable}
            ImportantSide="right"
          >
            <Input
              disabled={!isEditable}
              placeholder="Enter wing name"
              value={wing.name || ""}
            />
          </FormFieldWrapper>
          <FormFieldWrapper
            LabelText="Units per floor"
            Important={isEditable}
            ImportantSide="right"
          >
            <Input
              type="number"
              disabled={!isEditable}
              value={isNaN(wing.unitsPerFloor) ? "" : wing.unitsPerFloor}
              min={1}
              placeholder="e.g. 6"
            />
          </FormFieldWrapper>
          <FormFieldWrapper
            LabelText="Header Floor No"
            Important={isEditable}
            ImportantSide="right"
          >
            <Input
              type="number"
              disabled={!isEditable}
              value={
                isNaN(wing.headerFloorIndex) ||
                wing.headerFloorIndex === undefined
                  ? ""
                  : wing.headerFloorIndex + 1
              }
              min={1}
            />
          </FormFieldWrapper>
        </div>
        <FloorTable wing={wing} categories={categories} othersKey={othersKey} />
      </CardContent>
    </Card>
  );
}

/** ------------------------
 *  UnitTable (dynamic badge colors & actions)
 *  ------------------------ */
function UnitTable({
  units,
  categories,
}: {
  units: UnitType[];
  categories: InventoryCategoryType[];
}) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedUnitData, setSelectedUnitData] = useState<unitDataType>({
    _id: "",
    area: 0,
    configuration: "",
    unitNo: "",
    status: "available",
  });

  const { combinedRole } = useAuth(true);
  const updateUnitStatus = hasPermission(
    combinedRole,
    "Inventory",
    "update-unit-status",
  );
  const updateUnit = hasPermission(combinedRole, "Inventory", "update-unit");
  const hasPerms = updateUnit || updateUnitStatus;

  const colorByStatus = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name, c.colorHex));
    return map;
  }, [categories]);

  const handleSetUpdate = (data: unitDataType) => {
    setSelectedUnitData(data);
    setIsUpdateOpen(true);
  };

  const handleSetStatus = (data: unitDataType) => {
    setSelectedUnitData(data);
    setIsStatusOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead className="text-center font-medium">Unit No</TableHead>
            <TableHead className="text-center font-medium">
              Configuration
            </TableHead>
            <TableHead className="text-center font-medium">Area</TableHead>
            <TableHead className="text-center font-medium">Holder</TableHead>
            <TableHead className="text-center font-medium">Status</TableHead>
            {hasPerms && (
              <TableHead className="text-center font-medium">Action</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit, index) => {
            const bg = colorByStatus.get(unit.status);
            const style = bg
              ? { backgroundColor: bg, color: idealTextColor(bg) }
              : undefined;
            return (
              <TableRow key={index} className="hover:bg-card">
                <TableCell className="text-center font-medium">
                  {unit.unitNumber}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {unit.configuration.toUpperCase()}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {unit.area} sqft.
                </TableCell>
                <TableCell className="text-center font-medium">
                  {unit.reservedByOrReason || "N/A"}
                </TableCell>
                <TableCell className="text-center font-medium">
                  <Badge style={style}>
                    {unit.status.toUpperCase().replace(/-/g, " ")}
                  </Badge>
                </TableCell>
                {hasPerms && (
                  <TableCell className="text-center font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="miniIcon">
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Unit Options</DropdownMenuLabel>
                        {updateUnit && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleSetUpdate({
                                _id: unit._id!,
                                area: unit.area,
                                configuration: unit.configuration,
                                status: unit.status,
                                unitNo: unit.unitNumber,
                                reservedByOrReason: unit.reservedByOrReason,
                              })
                            }
                          >
                            Update Unit
                          </DropdownMenuItem>
                        )}
                        {updateUnitStatus && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleSetStatus({
                                _id: unit._id!,
                                area: unit.area,
                                configuration: unit.configuration,
                                status: unit.status,
                                unitNo: unit.unitNumber,
                                reservedByOrReason: unit.reservedByOrReason,
                                referenceId: unit.referenceId,
                              })
                            }
                          >
                            Change Status
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <UnitUpdateForm
        open={isUpdateOpen}
        onOpenChange={setIsUpdateOpen}
        unitData={selectedUnitData}
        setUnitData={setSelectedUnitData}
      />
      <UnitStatusModal
        open={isStatusOpen}
        onOpenChange={setIsStatusOpen}
        unitData={selectedUnitData}
        setUnitData={setSelectedUnitData}
        categories={categories}
      />
    </>
  );
}

/** ------------------------
 *  Unit status modal (dynamic options)
 *  ------------------------ */
function UnitStatusModal({
  open,
  onOpenChange,
  unitData,
  setUnitData,
  categories,
}: {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  unitData: unitDataType;
  setUnitData: (data: unitDataType) => void;
  categories: InventoryCategoryType[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const confirm = useAlertDialog({
    alertType: "Danger",
    iconName: "TicketX",
    title: "Cancel Booking",
    description: "Are you sure you want to cancel this booking?",
    actionLabel: "Confirm",
    cancelLabel: "Back",
  });

  const { updateUnitStatusMutation } = useInventory();
  const updateClientBookingMutation = useUpdateClientBooking();

  const handlePlainUpdate = async () => {
    // unchanged path for statuses other than "canceled"
    await updateUnitStatusMutation.mutateAsync({
      unitId: unitData._id,
      status: unitData.status,
      reservedByOrReason: unitData.reservedByOrReason,
    });
    toast({
      title: "Status Updated",
      description: `Unit ${unitData.unitNo} marked as ${unitData.status}.`,
    });
  };

  const handleCancelFlow = async () => {
    // mirror CancellationForm (no PDF)
    // 1) inventory → canceled
    await updateUnitStatusMutation.mutateAsync({
      unitId: unitData._id,
      status: "canceled",
      reservedByOrReason: unitData.reservedByOrReason,
    });
    // 2) client booking → canceled (if we know it)
    if (unitData.referenceId) {
      await updateClientBookingMutation.mutateAsync({
        id: unitData.referenceId,
        updateData: { status: "canceled" },
      });
    }
    toast({
      title: "Booking Canceled",
      description: `Unit ${unitData.unitNo} booking has been canceled.`,
    });
  };

  const submit = async () => {
    try {
      // basic validation parity with your cancel form
      if (
        unitData.status !== "available" &&
        !unitData.reservedByOrReason?.trim()
      ) {
        toast({
          title: "Missing Holder",
          description: "Please enter the holder's name.",
          variant: "warning",
        });
        return;
      }

      setIsSubmitting(true);

      if (unitData.status === "canceled") {
        // show the same confirm dialog language as cancel form
        confirm.show({
          config: {
            description: `You are about to cancel the booking for ${unitData.reservedByOrReason || "this unit"}. Do you want to proceed?`,
          },
          onAction: async () => {
            try {
              onOpenChange(false);
              await handleCancelFlow();
            } catch (error) {
              const err = error as CustomAxiosError;
              toast({
                title: "Error Occurred",
                description:
                  err.response?.data.error ||
                  err.message ||
                  "Failed to cancel the booking! An unknown error occurred.",
                variant: "destructive",
              });
            } finally {
              setIsSubmitting(false);
            }
          },
        });
      } else {
        onOpenChange(false);
        await handlePlainUpdate();
        setIsSubmitting(false);
      }
    } catch (error) {
      const err = error as CustomAxiosError;
      toast({
        title: "Error Occurred",
        description: err.response?.data.error || "Failed to update unit status",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">
            Unit Status - {unitData.unitNo}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <FormFieldWrapper
            LabelText="Unit Status"
            Important
            ImportantSide="right"
            className="gap-2"
          >
            <Select
              value={unitData.status}
              onValueChange={(e) => {
                // if switching to available, clear holder
                const next: unitDataType = { ...unitData, status: e };
                if (e === "available") next.reservedByOrReason = "";
                setUnitData(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormFieldWrapper>

          {unitData.status !== "available" && (
            <FormFieldWrapper
              LabelText="Holder Name"
              Important
              ImportantSide="right"
              className="gap-2"
            >
              <Input
                placeholder="Enter Holder's Name"
                value={unitData.reservedByOrReason || ""}
                onChange={(e) =>
                  setUnitData({
                    ...unitData,
                    reservedByOrReason: capitalizeWords(e.target.value),
                  })
                }
              />
            </FormFieldWrapper>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting
              ? "Submitting..."
              : unitData.status === "canceled"
                ? "Cancel Booking"
                : "Submit"}
          </Button>
        </DialogFooter>

        <confirm.AlertDialog />
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------
 *  Unit update form (unchanged except for imports/types)
 *  ------------------------ */
function UnitUpdateForm({
  open,
  onOpenChange,
  unitData,
  setUnitData,
}: {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  unitData: unitDataType;
  setUnitData: (data: unitDataType) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateUnitMutation } = useInventory();
  const dialog = useAlertDialog({
    title: "Update Unit",
    description: `Are you sure? you want to update this unit`,
    alertType: "Warn",
    iconName: "CircleFadingArrowUp",
  });

  const handleCancel = () => onOpenChange(false);

  const handleSubmit = async () => {
    dialog.show({
      config: {
        description: `Are you sure? you want to update this unit: ${unitData.unitNo}`,
        cancelLabel: "Cancel",
        actionLabel: "Update Unit",
      },
      onAction: async () => {
        try {
          setIsSubmitting(true);
          onOpenChange(false);
          await updateUnitMutation.mutateAsync({
            unitId: unitData._id,
            unitNumber: unitData.unitNo,
            area: unitData.area,
            configuration: unitData.configuration,
          });
          toast({
            title: "Unit Updated",
            description: "Successfully updated unit",
          });
        } catch (error) {
          const err = error as CustomAxiosError;
          console.error("Failed to update unit:", error);
          toast({
            title: "Error Occurred",
            description: err.response?.data.error || "Failed to update unit",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Update Unit - {unitData.unitNo}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            <FormFieldWrapper
              LabelText="Unit Number"
              Important
              ImportantSide="right"
              className="gap-2"
            >
              <Input
                type="text"
                placeholder="Enter unit number"
                value={unitData.unitNo || ""}
                onChange={(e) =>
                  setUnitData({ ...unitData, unitNo: e.target.value })
                }
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              LabelText="Area (sqft)"
              Important
              ImportantSide="right"
              className="gap-2"
            >
              <Input
                type="number"
                placeholder="Enter area in sqft"
                value={unitData.area || ""}
                onChange={(e) =>
                  setUnitData({
                    ...unitData,
                    area: parseFloat(e.target.value) || 0,
                  })
                }
                min={0}
                step={0.01}
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              LabelText="Configuration"
              Important
              ImportantSide="right"
              className="gap-2"
            >
              <Select
                value={unitData.configuration}
                onValueChange={(value) =>
                  setUnitData({ ...unitData, configuration: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Configuration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1bhk">1BHK</SelectItem>
                  <SelectItem value="1bhk+t">1BHK+Terrace</SelectItem>
                  <SelectItem value="2bhk">2BHK</SelectItem>
                  <SelectItem value="2bhk+t">2BHK+Terrace</SelectItem>
                  <SelectItem value="3bhk">3BHK</SelectItem>
                  <SelectItem value="3bhk+t">3BHK+Terrace</SelectItem>
                </SelectContent>
              </Select>
            </FormFieldWrapper>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <dialog.AlertDialog />
    </>
  );
}

/** ------------------------
 *  Types used locally
 *  ------------------------ */
export type unitDataType = {
  _id: string;
  unitNo: string;
  area: number;
  configuration: string;
  status: string;
  reservedByOrReason?: string;
  referenceId?: string;
};
