import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ignoreRole } from "@/store/data/options";
import { useEoiStore } from "@/store/eoi";
import { useUsersSummary } from "@/store/users";
import { ListFilter } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

// Types
type FilterKey = keyof typeof initialFilters;
type FilterValueType = string | number | Date | undefined;

const initialFilters = {
  applicant: "",
  manager: "",
  config: "" as "" | "1BHK" | "2BHK" | "3BHK",
  contact: undefined as number | undefined,
  pan: "",
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
  minAmount: undefined as number | undefined,
  maxAmount: undefined as number | undefined,
};

const configOptions: ComboboxOption[] = [
  { label: "1BHK", value: "1BHK" },
  { label: "2BHK", value: "2BHK" },
  { label: "3BHK", value: "3BHK" },
];

interface EoiFilterProps {
  clearFilter?: () => void;
  setIsFiltered?: (state: boolean) => void;
  children?: ReactNode;
}

export const EoiFilter = ({
  clearFilter,
  setIsFiltered,
  children,
}: EoiFilterProps) => {
  // Hooks
  const { filters, setFilters, resetFilters } = useEoiStore();
  const { data: users } = useUsersSummary();
  const isSmallScreen = useMediaQuery("(max-width: 640px)");

  // States
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ ...initialFilters });
  const [appliedFilterCount, setAppliedFilterCount] = useState(0);

  // Options
  const managerOptions = [{ label: "N/A", value: "N/A" }].concat(
    users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || [],
  );

  // Initialize filters from store
  useEffect(() => {
    const currentFilters = { ...initialFilters };

    if (filters.applicant) currentFilters.applicant = filters.applicant;
    if (filters.manager) currentFilters.manager = filters.manager;
    if (filters.config) currentFilters.config = filters.config;
    if (filters.contact) currentFilters.contact = filters.contact;
    if (filters.pan) currentFilters.pan = filters.pan;
    if (filters.startDate) currentFilters.startDate = filters.startDate;
    if (filters.endDate) currentFilters.endDate = filters.endDate;
    if (filters.minAmount) currentFilters.minAmount = filters.minAmount;
    if (filters.maxAmount) currentFilters.maxAmount = filters.maxAmount;

    setActiveFilters(currentFilters);
    countAppliedFilters(currentFilters);
  }, [filters]);

  // Count applied filters
  const countAppliedFilters = (filterObj: typeof initialFilters) => {
    const count = Object.entries(filterObj).reduce((total, [key, value]) => {
      if (key === "maxAmount" && !filterObj.minAmount) return total;
      if (key === "minAmount" && filterObj.maxAmount) return total + 1;
      return value ? total + 1 : total;
    }, 0);

    setAppliedFilterCount(count);
  };

  // Update a single filter value
  const updateFilter = (key: FilterKey, value: FilterValueType) => {
    setActiveFilters((prev) => {
      const updated = { ...prev, [key]: value };
      countAppliedFilters(updated);
      return updated;
    });
  };

  // Apply filters
  function handleApplyFilter() {
    const newFilters = { ...filters, page: 1 };
    let hasActiveFilters = false;

    Object.keys(initialFilters).forEach((key) => {
      const filterKey = key as FilterKey;
      const value = activeFilters[filterKey];

      if (value) {
        if (
          filterKey === "minAmount" ||
          filterKey === "maxAmount" ||
          filterKey === "contact"
        )
          newFilters[filterKey] = value as number;
        else if (filterKey === "startDate" || filterKey === "endDate")
          newFilters[filterKey] = value as Date;
        else if (filterKey === "config")
          newFilters[filterKey] = value as "1BHK" | "2BHK" | "3BHK";
        else newFilters[filterKey] = value as string;

        hasActiveFilters = true;
      } else {
        delete newFilters[filterKey];
      }
    });

    setFilters(newFilters);
    if (setIsFiltered) setIsFiltered(hasActiveFilters);
    setIsOpen(false);
  }

  const resetEoiFilters = () => {
    setActiveFilters({ ...initialFilters });
    setAppliedFilterCount(0);
    resetFilters();
    if (clearFilter) clearFilter();
    setIsOpen(false);
  };

  // Filter content - rendered inline to maintain component identity
  const filterContent = (
    <div className="flex flex-col gap-8 py-4">
      <FormFieldWrapper LabelText="Pick Date Range">
        <div className="flex flex-col sm:flex-row gap-3">
          <DatePickerV2
            placeholder="Start date"
            className="sm:w-full"
            defaultDate={activeFilters.startDate}
            onDateChange={(date) => updateFilter("startDate", date)}
          />
          <DatePickerV2
            placeholder="End date"
            className="sm:w-full"
            defaultDate={activeFilters.endDate}
            onDateChange={(date) => updateFilter("endDate", date)}
          />
        </div>
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Applicant Name">
        <Input
          type="text"
          value={activeFilters.applicant}
          onChange={(e) => updateFilter("applicant", e.target.value)}
          placeholder="Enter applicant name"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Select Manager">
        <Combobox
          value={activeFilters.manager}
          options={managerOptions}
          onChange={(value) => updateFilter("manager", value)}
          width="w-full"
          align="center"
          placeholder="Select a manager"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Select Configuration">
        <Combobox
          value={activeFilters.config}
          options={configOptions}
          onChange={(value) =>
            updateFilter("config", value as "1BHK" | "2BHK" | "3BHK")
          }
          width="w-full"
          align="center"
          placeholder="Select configuration"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Contact Number">
        <Input
          type="number"
          value={activeFilters.contact || ""}
          onChange={(e) =>
            updateFilter(
              "contact",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          placeholder="Enter contact number"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="PAN Number">
        <Input
          type="text"
          value={activeFilters.pan}
          onChange={(e) => updateFilter("pan", e.target.value.toUpperCase())}
          placeholder="Enter PAN number"
          maxLength={10}
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Amount Range">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="number"
            value={activeFilters.minAmount || ""}
            onChange={(e) =>
              updateFilter(
                "minAmount",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="Min amount"
          />
          <Input
            type="number"
            value={activeFilters.maxAmount || ""}
            onChange={(e) =>
              updateFilter(
                "maxAmount",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="Max amount"
          />
        </div>
      </FormFieldWrapper>
    </div>
  );

  // Filter trigger button
  const FilterTrigger = () => {
    return children ? (
      children
    ) : (
      <Tooltip content="More filter options">
        <Button
          className="flex-shrink-0 relative"
          variant="outline"
          size="icon"
        >
          <ListFilter size={20} />
          {appliedFilterCount > 0 && (
            <Badge className="bg-red-500 text-white absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
              {appliedFilterCount}
            </Badge>
          )}
        </Button>
      </Tooltip>
    );
  };

  // Filter footer with action buttons
  const FilterFooter = () => (
    <div className="flex gap-3 justify-end">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Close
      </Button>
      <Button variant="secondary" onClick={resetEoiFilters}>
        Reset
      </Button>
      <Button onClick={handleApplyFilter}>Apply Filter</Button>
    </div>
  );

  return isSmallScreen ? (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <span onClick={() => setIsOpen(true)} className="w-full">
          <FilterTrigger />
        </span>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="mb-2">
          <DrawerTitle>EOI Filter Options</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="px-4 h-[calc(100vh-250px)]">
          {filterContent}
          <DrawerFooter className="pt-2 pb-4">
            <FilterFooter />
          </DrawerFooter>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  ) : (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <span className="w-full">
          <FilterTrigger />
        </span>
      </SheetTrigger>
      <SheetContent className="overflow-hidden">
        <SheetHeader className="mb-6">
          <SheetTitle>EOI Filter Options</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-150px)] w-full pr-4">
          {filterContent}
          <SheetFooter className="mt-4 mb-2 gap-3 sm:gap-0 pr-1">
            <FilterFooter />
          </SheetFooter>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
