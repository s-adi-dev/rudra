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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BookingFilters, useBookingStore } from "@/store/client-booking/store";
import { ignoreRole } from "@/store/data/options";
import { useInventory } from "@/store/inventory";
import { useUsersSummary } from "@/store/users";
import { ListFilter } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

// Types
type FilterKey = keyof typeof initialFilters;
type FilterValueType = string | number | Date | undefined;

const initialFilters = {
  status: "",
  project: "",
  plan: "",
  manager: "",
  fromDate: undefined as Date | undefined,
  toDate: undefined as Date | undefined,
  fromRegDate: undefined as Date | undefined,
  toRegDate: undefined as Date | undefined,
};

const statusOptions: ComboboxOption[] = [
  { label: "Booked", value: "booked" },
  { label: "Cancelled", value: "canceled" },
  { label: "CNC", value: "cnc" },
  { label: "Loan Process", value: "loan-process" },
  { label: "Registered", value: "registered" },
  { label: "Registeration Process", value: "registeration-process" },
];

interface BookingFilterProps {
  clearFilter?: () => void;
  setIsFiltered?: (state: boolean) => void;
  children?: ReactNode;
}

export const BookingFilter = ({
  clearFilter = () => {},
  setIsFiltered = () => {},
  children,
}: BookingFilterProps) => {
  // Hooks
  const { filters, setFilters, resetFilters } = useBookingStore();
  const isSmallScreen = useMediaQuery("(max-width: 640px)");
  const { data: users } = useUsersSummary();
  const { useProjectsStructure } = useInventory();
  const { data: projectsData } = useProjectsStructure();

  // States
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ ...initialFilters });
  const [appliedFilterCount, setAppliedFilterCount] = useState(0);

  // Options
  const projectOptions =
    projectsData?.data?.map((p) => ({ label: p.name, value: p.name! })) || [];

  const managerOptions =
    users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || [];

  // Initialize filters from store
  useEffect(() => {
    const currentFilters = { ...initialFilters };

    // Only copy values that exist in filters to currentFilters
    if (filters.status) currentFilters.status = filters.status;
    if (filters.project) currentFilters.project = filters.project;
    if (filters.plan) currentFilters.plan = filters.plan;
    if (filters.manager) currentFilters.manager = filters.manager;
    if (filters.fromDate) currentFilters.fromDate = filters.fromDate;
    if (filters.toDate) currentFilters.toDate = filters.toDate;
    if (filters.fromRegDate) currentFilters.fromRegDate = filters.fromRegDate;
    if (filters.toRegDate) currentFilters.toRegDate = filters.toRegDate;

    setActiveFilters(currentFilters);
    countAppliedFilters(currentFilters);
  }, [filters]);

  // Event Handlers
  // Count applied filters
  const countAppliedFilters = (filterObj: typeof initialFilters) => {
    const count = Object.entries(filterObj).reduce((total, [, value]) => {
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
    const newFilters = { ...filters, page: 1 } as BookingFilters;
    let hasActiveFilters = false;

    // Process each filter
    Object.keys(initialFilters).forEach((key) => {
      const filterKey = key as FilterKey;
      const value = activeFilters[filterKey];

      if (value) {
        if (filterKey === "fromDate" || filterKey === "toDate" || filterKey === "fromRegDate" || filterKey === "toRegDate") {
          newFilters[filterKey] = value as Date;
        } else if (filterKey === "plan") {
          newFilters[filterKey] = value as "regular-payment" | "down-payment";
        } else {
          newFilters[filterKey] = value as string;
        }
        hasActiveFilters = true;
      } else {
        delete newFilters[filterKey];
      }
    });

    setFilters(newFilters);
    setIsFiltered(hasActiveFilters);
    setIsOpen(false);
  }

  const resetBookingFilters = () => {
    setActiveFilters({ ...initialFilters });
    setAppliedFilterCount(0);
    resetFilters();
    clearFilter();
    setIsOpen(false);
  };

  // Filter content component to use in both Sheet and Drawer
  const FilterContent = () => (
    <div className="flex flex-col gap-8 py-4">
      <FormFieldWrapper LabelText="Pick Booking Date">
        <div className="flex flex-col sm:flex-row gap-3">
          <DatePickerV2
            placeholder="Start date"
            className="sm:w-full"
            defaultDate={activeFilters.fromDate}
            onDateChange={(date) => updateFilter("fromDate", date)}
          />
          <DatePickerV2
            placeholder="End date"
            className="sm:w-full"
            defaultDate={activeFilters.toDate}
            onDateChange={(date) => updateFilter("toDate", date)}
          />
        </div>
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Pick Registration Date">
        <div className="flex flex-col sm:flex-row gap-3">
          <DatePickerV2
            placeholder="Start date"
            className="sm:w-full"
            defaultDate={activeFilters.fromRegDate}
            onDateChange={(date) => updateFilter("fromRegDate", date)}
          />
          <DatePickerV2
            placeholder="End date"
            className="sm:w-full"
            defaultDate={activeFilters.toRegDate}
            onDateChange={(date) => updateFilter("toRegDate", date)}
          />
        </div>
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Select Payment Plan">
        <Select
          value={activeFilters.plan}
          onValueChange={(value) => updateFilter("plan", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="regular-payment">Regular Payment</SelectItem>
              <SelectItem value="down-payment">Down Payment</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Select Project">
        <Combobox
          value={activeFilters.project}
          options={projectOptions}
          onChange={(value) => updateFilter("project", value)}
          width="w-full"
          align="center"
          placeholder="Select a project"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Manager">
        <Combobox
          value={activeFilters.manager}
          options={managerOptions}
          onChange={(value) => updateFilter("manager", value)}
          width="w-full"
          align="center"
          placeholder="Select manager"
        />
      </FormFieldWrapper>

      <FormFieldWrapper LabelText="Select Status">
        <Combobox
          value={activeFilters.status}
          options={statusOptions}
          onChange={(value) => updateFilter("status", value)}
          width="w-full"
          align="center"
          placeholder="Select a status"
        />
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
      <Button
        variant="outline"
        onClick={() => {
          setIsOpen(false);
        }}
      >
        Close
      </Button>
      <Button variant="secondary" onClick={resetBookingFilters}>
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
          <DrawerTitle>Booking Filter Options</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="px-4 h-[calc(100vh-100px)]">
          <FilterContent />
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
          <SheetTitle>Booking Filter Options</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-150px)] w-full pr-4">
          <FilterContent />
          <SheetFooter className="mt-4 mb-2 gap-3 sm:gap-0 pr-1">
            <FilterFooter />
          </SheetFooter>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
