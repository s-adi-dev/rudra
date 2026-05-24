import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { ClientPartnerType, useClientPartners } from "@/store/client-partner";
import { clientPartnerApi } from "@/store/client-partner/api";
import {
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  GitCompare,
  GitPullRequestArrow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hasPermission } from "@/hooks/use-role";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";

interface CPMergeModalProps {
  isOpen: boolean;
  onOpenChange: (state: boolean) => void;
  currentCP: ClientPartnerType;
}

type MergeType = "cp" | "employee-transfer" | "merge" | null;

// Helper component for combined CP search (combobox + CP ID input)
function CPSearchField({
  options,
  value,
  onChange,
  allCPs,
  placeholder = "Search and select a company...",
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  allCPs: ClientPartnerType[];
  placeholder?: string;
}) {
  const [cpIdInput, setCpIdInput] = useState<string>("");
  const [cpIdError, setCpIdError] = useState<string>("");

  const handleCpIdChange = (inputValue: string) => {
    setCpIdInput(inputValue);
    setCpIdError("");

    if (!inputValue.trim()) return;

    const foundCP = allCPs.find(
      (cp) => cp.cpId?.toLowerCase() === inputValue.toLowerCase(),
    );

    if (foundCP) {
      onChange(foundCP._id || "");
      setCpIdInput("");
    } else {
      setCpIdError(`No CP found with ID: ${inputValue}`);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <Combobox
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder="Search by company name or ID..."
            width="w-full"
          />
        </div>
        <input
          type="text"
          placeholder="Enter CP ID"
          value={cpIdInput}
          onChange={(e) => handleCpIdChange(e.target.value)}
          className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm w-full sm:w-auto sm:whitespace-nowrap"
        />
      </div>
      {cpIdError && (
        <p className="text-xs text-destructive truncate">{cpIdError}</p>
      )}
    </div>
  );
}

function MergePreview({
  title,
  from,
  to,
  status,
}: {
  title: string;
  from: string;
  to: string;
  status: "info" | "success" | "warning";
}) {
  const bgClasses = {
    info: "bg-blue-50 border-blue-200 text-blue-900 text-blue-800 text-blue-600",
    success:
      "bg-green-50 border-green-200 text-green-900 text-green-800 text-green-600",
    warning:
      "bg-yellow-50 border-yellow-200 text-yellow-900 text-yellow-800 text-yellow-600",
  };

  const [bg, border, titleText, bodyText, arrowText] =
    bgClasses[status].split(" ");

  return (
    <Alert className={`${bg} ${border}`}>
      <div className="text-sm">
        <div className={`font-semibold ${titleText}`}>{title}</div>
        <div className={`${bodyText} mt-2`}>
          <div>
            From: <strong>{from}</strong>
          </div>
          <div className={`text-lg ${arrowText} my-1`}>↓</div>
          <div>
            To: <strong>{to}</strong>
          </div>
        </div>
      </div>
    </Alert>
  );
}

export default function CPManagementModal({
  isOpen,
  onOpenChange,
  currentCP,
}: CPMergeModalProps) {
  // Fetch CP list
  const { useClientPartnersList } = useClientPartners();
  const {
    data: cpListData,
    isLoading,
    error,
  } = useClientPartnersList({
    page: 1,
    limit: 1000,
    search: "",
  });
  const allCPs = cpListData?.clientPartners ?? [];

  // States
  const { combinedRole } = useAuth(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mergeType, setMergeType] = useState<MergeType>(null);
  const [selectedCPId, setSelectedCPId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMergeType(null);
      setSelectedCPId("");
      setSelectedEmployeeId("");
      setTargetEmployeeId("");
    }
  }, [isOpen]);

  // Permissions - removed || true for actual permission checks
  const canMergeCP = hasPermission(combinedRole, "ClientPartner", "merge-cp");
  const canMergeEmployee = hasPermission(
    combinedRole,
    "ClientPartner",
    "merge-cp-employee",
  );
  const canTransferEmployee = hasPermission(
    combinedRole,
    "ClientPartner",
    "transfer-cp-employee",
  );

  // Derived state - optimized memos
  const selectedCP = useMemo(
    () => (selectedCPId ? allCPs.find((cp) => cp._id === selectedCPId) : null),
    [selectedCPId, allCPs],
  );

  const selectedEmployee = useMemo(() => {
    return selectedEmployeeId
      ? (currentCP.employees.find((emp) => emp._id === selectedEmployeeId) ??
          null)
      : null;
  }, [selectedEmployeeId, currentCP.employees]);

  const targetEmployee = useMemo(() => {
    if (!targetEmployeeId) return null;
    if (mergeType === "employee-transfer") {
      return (
        selectedCP?.employees.find((emp) => emp._id === targetEmployeeId) ??
        null
      );
    }
    return (
      currentCP.employees.find((emp) => emp._id === targetEmployeeId) ?? null
    );
  }, [targetEmployeeId, selectedCP, mergeType, currentCP.employees]);

  const otherCPs = useMemo(
    () => allCPs.filter((cp) => cp._id !== currentCP._id),
    [allCPs, currentCP._id],
  );

  // Generate combobox options - memoized separately to avoid recalc on unrelated changes
  const cpOptions: ComboboxOption[] = useMemo(
    () =>
      otherCPs.map((cp) => ({
        value: cp._id || "",
        label: `${cp.name} (ID: ${cp.cpId || "N/A"}) - ${cp.employees.length} emp`,
      })),
    [otherCPs],
  );

  const currentEmployeeOptions: ComboboxOption[] = useMemo(
    () =>
      currentCP.employees.map((emp) => ({
        value: emp._id,
        label: `${emp.firstName} ${emp.lastName} (${emp.position})`,
      })),
    [currentCP.employees],
  );

  const targetEmployeeOptions: ComboboxOption[] = useMemo(() => {
    const employees =
      mergeType === "employee-transfer" && selectedCP
        ? selectedCP.employees
        : mergeType === "merge"
          ? currentCP.employees.filter((emp) => emp._id !== selectedEmployeeId)
          : [];
    return employees.map((emp) => ({
      value: emp._id,
      label: `${emp.firstName} ${emp.lastName} (${emp.position})`,
    }));
  }, [mergeType, selectedCP, currentCP.employees, selectedEmployeeId]);

  // Merge state validators - check if merge is valid
  const isMergeValid = useMemo(() => {
    switch (mergeType) {
      case "cp":
        return !!selectedCP;
      case "employee-transfer":
        return !!selectedCP && !!selectedEmployee;
      case "merge":
        return !!selectedEmployee && !!targetEmployee;
      default:
        return false;
    }
  }, [mergeType, selectedCP, selectedEmployee, targetEmployee]);

  // Handlers
  const handleMergeTypeChange = useCallback((value: string) => {
    setMergeType(value as MergeType);
    // Reset selections when merge type changes
    setSelectedCPId("");
    setSelectedEmployeeId("");
    setTargetEmployeeId("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleMerge = useCallback(async () => {
    if (!isMergeValid || isMerging) return;

    setIsMerging(true);
    try {
      if (mergeType === "cp") {
        const result = await clientPartnerApi.mergeClientPartners(
          currentCP._id || "",
          selectedCP?._id || "",
        );
        toast({
          title: "Success",
          description: result.message,
        });
        // Invalidate query caches for list and details
        queryClient.invalidateQueries({
          queryKey: ["clientPartners"],
        });
        queryClient.invalidateQueries({
          queryKey: ["clientPartner"],
        });
        queryClient.invalidateQueries({
          queryKey: ["referenceList", "referenceListwithDelete"],
        });
      } else if (mergeType === "employee-transfer") {
        const result = await clientPartnerApi.transferEmployee(
          selectedEmployee?._id || "",
          selectedCP?._id || "",
        );
        toast({
          title: "Success",
          description: result.message,
        });
        // Invalidate query caches for list and details
        queryClient.invalidateQueries({
          queryKey: ["clientPartners"],
        });
        queryClient.invalidateQueries({
          queryKey: ["clientPartner"],
        });
        queryClient.invalidateQueries({
          queryKey: ["referenceList", "referenceListwithDelete"],
        });
      } else if (mergeType === "merge") {
        const result = await clientPartnerApi.mergeEmployees(
          selectedEmployee?._id || "",
          targetEmployee?._id || "",
        );
        toast({
          title: "Success",
          description: result.message,
        });
        // Invalidate query caches for list and details
        queryClient.invalidateQueries({
          queryKey: ["clientPartners"],
        });
        queryClient.invalidateQueries({
          queryKey: ["clientPartner"],
        });
        queryClient.invalidateQueries({
          queryKey: ["referenceList", "referenceListwithDelete"],
        });
      }
      handleClose();
    } catch (error) {
      console.error("Merge error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to complete merge",
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  }, [
    isMergeValid,
    isMerging,
    mergeType,
    selectedCP,
    selectedEmployee,
    targetEmployee,
    currentCP,
    handleClose,
    toast,
    queryClient,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequestArrow className="w-5 h-5" />
            Manage Client Partner Data
          </DialogTitle>
          <DialogDescription>
            Consolidate duplicate client partners or companies, transfer
            employees between companies, or merge duplicate employee records
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading client partners...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              Failed to load client partners. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Section */}
        {!isLoading && !error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Warning</AlertTitle>
            <AlertDescription>
              Operations performed here will permanently modify your data.
              Duplicate entries will be marked for deletion and cannot be easily
              recovered. Please verify your selections carefully before
              proceeding.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Merge Type Selection */}
            <FormFieldWrapper LabelText="Merge Type" Important>
              <div className="flex flex-col sm:flex-row gap-3">
                {canMergeCP && (
                  <Button
                    variant={mergeType === "cp" ? "default" : "outline"}
                    className="gap-2 grow"
                    onClick={() => handleMergeTypeChange("cp")}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">Company Merge</span>
                  </Button>
                )}

                {canMergeEmployee && currentCP.employees.length > 1 && (
                  <Button
                    variant={mergeType === "merge" ? "default" : "outline"}
                    className="gap-2 grow"
                    onClick={() => handleMergeTypeChange("merge")}
                  >
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Employee Merge</span>
                  </Button>
                )}

                {canTransferEmployee && (
                  <Button
                    variant={
                      mergeType === "employee-transfer" ? "default" : "outline"
                    }
                    className="gap-2 grow"
                    onClick={() => handleMergeTypeChange("employee-transfer")}
                  >
                    <GitCompare className="w-4 h-4" />
                    <span className="font-medium">Employee Transfer</span>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {mergeType === "cp" &&
                  "Combine two client partner records into one"}
                {mergeType === "employee-transfer" &&
                  "Transfer employee records between different companies"}
                {mergeType === "merge" &&
                  "Merge duplicate employee records within the same company"}
              </p>
            </FormFieldWrapper>

            {/* CP Merge Content */}
            {mergeType === "cp" && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-semibold mb-2 text-sm">
                    Current Client Partner (Source)
                  </div>
                  <div className="p-3 bg-background border rounded-md">
                    <div className="font-medium">{currentCP.name}</div>
                    <div className="text-xs text-muted-foreground">
                      CP ID: {currentCP.cpId} | Owner: {currentCP.ownerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentCP.employees.length} employee
                      {currentCP.employees.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <FormFieldWrapper
                  LabelText="Select Partner to Merge With"
                  Important
                >
                  <CPSearchField
                    options={cpOptions}
                    value={selectedCPId}
                    onChange={setSelectedCPId}
                    allCPs={otherCPs}
                    placeholder="Select a company to merge..."
                  />
                </FormFieldWrapper>

                {selectedCP && (
                  <div>
                    <div className="font-semibold mb-2 text-sm">
                      Target Client Partner (Will be merged into source)
                    </div>
                    <div className="p-3 bg-background border border-yellow-200 rounded-md">
                      <div className="font-medium">{selectedCP.name}</div>
                      <div className="text-xs text-muted-foreground">
                        CP ID: {selectedCP.cpId} | Owner: {selectedCP.ownerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedCP.employees.length} employee
                        {selectedCP.employees.length !== 1 ? "s" : ""} will be
                        transferred
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Employee Transfer */}
            {mergeType === "employee-transfer" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <FormFieldWrapper LabelText="Select Target Company" Important>
                    <CPSearchField
                      options={cpOptions}
                      value={selectedCPId}
                      onChange={setSelectedCPId}
                      allCPs={otherCPs}
                      placeholder="Select a company to merge..."
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    LabelText={`Select Employee from "${currentCP.name}"`}
                    Important
                  >
                    <Combobox
                      options={currentEmployeeOptions}
                      value={selectedEmployeeId}
                      onChange={setSelectedEmployeeId}
                      placeholder="Search and select an employee..."
                      searchPlaceholder="Search by name or position..."
                      width="w-full"
                    />
                  </FormFieldWrapper>
                </div>

                {selectedEmployee && selectedCP && (
                  <MergePreview
                    title="Transfer Preview:"
                    from={`${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.position}) @ ${currentCP.name}`}
                    to={`${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.position}) @ ${selectedCP.name}`}
                    status="info"
                  />
                )}
              </div>
            )}

            {/* Employee Merge */}
            {mergeType === "merge" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="p-3 bg-background border rounded-md">
                    <div className="font-medium">{currentCP.name}</div>
                    <div className="text-xs text-muted-foreground">
                      CP ID: {currentCP.cpId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentCP.employees.length} employees available for merge
                    </div>
                  </div>

                  <FormFieldWrapper
                    LabelText="Select Source Employee"
                    Important
                  >
                    <Combobox
                      options={currentEmployeeOptions}
                      value={selectedEmployeeId}
                      onChange={setSelectedEmployeeId}
                      placeholder="Search and select an employee..."
                      searchPlaceholder="Search by name or position..."
                      width="w-full"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    LabelText="Select Target Employee (to merge into)"
                    Important
                  >
                    <Combobox
                      options={targetEmployeeOptions}
                      value={targetEmployeeId}
                      onChange={setTargetEmployeeId}
                      placeholder="Search and select an employee..."
                      searchPlaceholder="Search by name or position..."
                      width="w-full"
                    />
                  </FormFieldWrapper>
                </div>

                {selectedEmployee && targetEmployee && (
                  <MergePreview
                    title="Merge Preview:"
                    from={`${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.position})`}
                    to={`${targetEmployee.firstName} ${targetEmployee.lastName} (${targetEmployee.position})`}
                    status="success"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer with Action Buttons */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={!isMergeValid || isMerging}>
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              "Merge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
