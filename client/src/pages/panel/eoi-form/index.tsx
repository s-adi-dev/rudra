import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { CenterWrapper } from "@/components/custom ui/center-page";
import { Combobox } from "@/components/custom ui/combobox";
import { Loader } from "@/components/custom ui/loader";
import { MultiSelect } from "@/components/custom ui/multi-select";
import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateClientBooking,
  useUpdateClientBooking,
} from "@/store/client-booking/query";
import { ClientBookingCreateUpdateData } from "@/store/client-booking/types";
import { ignoreRole } from "@/store/data/options";
import { useEois, useEoiStore } from "@/store/eoi";
import { useInventory } from "@/store/inventory";
import { useUsersSummary } from "@/store/users";
import { getLabelFromValue } from "@/utils/func/arrayUtils";
import { getOrdinal } from "@/utils/func/numberUtils";
import { capitalizeWords, formatAddress } from "@/utils/func/strUtils";
import { formatZodMessagesOnly } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { pdf } from "@react-pdf/renderer";
import { Lock, RefreshCw, TicketCheck } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BookingForm } from "./booking-pdf";
import {
  BookingType,
  FlatChargesNoteList,
  transformFormDataToBooking,
} from "./utils";
import { validateFormData } from "./zod-schema";
// Types
type PaymentType = "regular-payment" | "down-payment";

export interface FormData {
  date: Date;
  eoiNumber: string;
  project: string;
  projectAddress: string;
  projectBy: string;
  applicant: string;
  coApplicant: string;
  phoneNo: string;
  altNo: string;
  address: string;
  wing: string;
  floor: string;
  unitId: string;
  unitNo: string;
  area: number;
  configuration: string;
  eoiDate?: Date;
  eoiAmt: number;
  bookingAmt: number;
  tokenAmt: number;
  agreementValue: number;
  dealTerms: string;
  paymentTerms: string;
  paymentMethod: string;
  paymentType: PaymentType;
  banks: string[];
  salesManager: string;
  clientPartner: string;
}

interface ComboboxOption {
  label: string;
  value: string;
}

interface UnitOption extends ComboboxOption {
  label: string;
  value: string;
  id: string;
  configuration: string;
  area: number;
}

interface BudgetOption {
  label: string;
  value: number;
}

const BUDGET_OPTIONS: BudgetOption[] = [
  { label: "₹", value: 1 },
  { label: "Thousands", value: 1000 },
  { label: "Lakhs", value: 100000 },
  { label: "Crores", value: 10000000 },
];

const BANK_LIST = [
  "SBI",
  "CANARA",
  "PNB",
  "HDFC",
  "BOB",
  "AXIS",
  "ICICI",
  "IIFL",
  "INDIABULLS",
  "AAVAS",
  "SUNDARAM",
  "OTHERS",
] as const;

// Utility Components
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  locked?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  required = false,
  locked = false,
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    <Label className="flex items-center gap-2">
      {label}
      {required && <span className="text-red-500">*</span>}
      {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
    </Label>
    {children}
  </div>
);

const projectName = "Rudra Dream City";

const DEFAULT_FORM_DATA: FormData = {
  date: new Date(),
  eoiNumber: "",
  project: projectName,
  projectBy: "Sai Ashirwad",
  projectAddress:
    "Survey 9/5, Pisarve, Taloja Phase-I, Near Metro Station - 410208",
  applicant: "",
  coApplicant: "",
  phoneNo: "",
  altNo: "",
  address: "",
  wing: "",
  floor: "",
  unitId: "",
  unitNo: "",
  configuration: "",
  eoiAmt: 0,
  bookingAmt: 0,
  tokenAmt: 0,
  area: 0,
  agreementValue: 0,
  dealTerms: "",
  paymentTerms: "",
  paymentMethod: "",
  paymentType: "regular-payment",
  banks: [],
  salesManager: "",
  clientPartner: "",
};

// Main Component
const EOIBookingForm: React.FC = () => {
  const { toast } = useToast();
  const { useProjectsStructure } = useInventory();
  const { data: projectsData, refetch: refetchProjects } =
    useProjectsStructure();
  const { selectedEoiId } = useEoiStore();
  const { useEoiDetails, useUpdateEoi } = useEois();
  const mutateCreateClientBooking = useCreateClientBooking();
  const mutateUpdateClientBooking = useUpdateClientBooking();
  const updateEoiMutation = useUpdateEoi();
  const { data: users, refetch: refetchUsers } = useUsersSummary();
  const { id, pageno } = useParams<{
    id: string;
    pageno: string;
  }>();
  const applicantId = id || selectedEoiId;
  const { data: eoiApplicantData, isLoading: isEoiApplicantLoading } =
    useEoiDetails(applicantId!);
  const pageNo = Number(pageno) || 1;
  const { setBreadcrumbs } = useBreadcrumb();

  const dialog = useAlertDialog({
    alertType: "Warn",
    iconName: "TicketCheck",
    title: "Update Booking",
    description: "Are you sure you want to update this booking?",
    actionLabel: "Update",
    cancelLabel: "Cancel",
  });

  const [charges, setCharges] = useState<string>("");
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Unit state
  const [bookingUnit, setBookingUnit] = useState<number>(100000);
  const [avUnit, setAVUnit] = useState<number>(100000);
  const [tokenUnit, setTokenUnit] = useState<number>(1000);
  const [eoiAmtUnit, setEoiAmtUnit] = useState<number>(1);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

  // Auto-fill form with EOI data when it loads
  useEffect(() => {
    if (eoiApplicantData?.data) {
      const eoiData = eoiApplicantData.data;

      setFormData((prev) => ({
        ...prev,
        eoiNumber: eoiData.eoiNo?.toString() || "",
        applicant: eoiData.applicant || "",
        phoneNo: eoiData.contact?.toString() || "",
        altNo: eoiData.alt?.toString() || "",
        address: eoiData.address || "",
        eoiAmt: eoiData.eoiAmt || 0,
        salesManager: eoiData.manager || "",
        clientPartner: eoiData.cp || "",
        eoiDate: eoiData.date ? new Date(eoiData.date) : undefined,
      }));
    }
  }, [eoiApplicantData]);

  //useEffect
  useEffect(() => {
    setBreadcrumbs([
      { label: "EOI List", to: `/panel/eoi/${pageNo}` },
      { label: `EOI Form` },
    ]);
  }, [setBreadcrumbs, pageNo]);

  // Helper functions to get filtered project data (same as booking form)
  const getFilteredProjectsData = useCallback(() => {
    const flatStatusFilter: string[] = ["available", "canceled"];
    if (!projectsData?.data) return [];

    return projectsData.data
      .map((project) => {
        const filteredProject = { ...project };

        // Filter residential wings and floors
        filteredProject.wings = project.wings
          .map((wing) => ({
            ...wing,
            floors: wing.floors
              .map((floor) => ({
                ...floor,
                units: floor.units.filter((unit) =>
                  flatStatusFilter.includes(unit.status),
                ),
              }))
              .filter((floor) => floor.units.length > 0),
          }))
          .filter((wing) => wing.floors.length > 0);

        return filteredProject;
      })
      .filter((project) => project.wings.length > 0);
  }, [projectsData?.data]);

  const projectData = useMemo(() => {
    const projects = getFilteredProjectsData();
    return projects.find((p) => p.name === projectName);
  }, [getFilteredProjectsData]);

  // Unit selection logic
  const availableWings = useMemo<ComboboxOption[]>(() => {
    if (!projectData) return [];
    return projectData.wings
      .filter((wing) =>
        wing.floors.some((floor) =>
          floor.units.some((unit) => unit.status === "available"),
        ),
      )
      .map((wing) => ({ label: wing.name, value: wing.name }));
  }, [projectData]);

  const availableFloors = useMemo<ComboboxOption[]>(() => {
    if (!formData.wing || !projectData) return [];

    const wing = projectData.wings.find((w) => w.name === formData.wing);
    if (!wing) return [];

    return wing.floors
      .filter((floor) =>
        floor.units.some((unit) => unit.status === "available"),
      )
      .map((floor) => ({
        label:
          floor.displayNumber === 0
            ? "Ground Floor"
            : `${getOrdinal(floor.displayNumber)} Floor`,
        value: floor.displayNumber.toString(),
      }));
  }, [formData.wing, projectData]);

  const availableUnits = useMemo<UnitOption[]>(() => {
    if (!formData.wing || !formData.floor || !projectData) return [];

    const wing = projectData.wings.find((w) => w.name === formData.wing);
    if (!wing) return [];

    const floor = wing.floors.find(
      (f) => f.displayNumber === Number(formData.floor),
    );
    if (!floor) return [];

    return floor.units
      .filter((unit) => unit.status === "available")
      .map((unit) => ({
        label: `Unit ${unit.unitNumber}`,
        value: unit.unitNumber,
        id: unit._id!,
        configuration: unit.configuration,
        area: unit.area,
      }));
  }, [formData.wing, formData.floor, projectData]);

  const handleRefetch = async () => {
    setIsRefetching(true);

    try {
      await Promise.all([refetchProjects(), refetchUsers()]);

      toast({
        title: "Data Refreshed",
        description: "Data has been successfully updated.",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Refetch Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsRefetching(false);
      }, 1000);
    }
  };

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWingChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      wing: value,
      floor: "",
      unitId: "",
      unitNo: "",
      configuration: "",
    }));
  };

  const handleFloorChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      floor: value,
      unitId: "",
      unitNo: "",
      configuration: "",
    }));
  };

  const handleUnitChange = (value: string) => {
    const selectedUnit = availableUnits.find((u) => u.value === value);
    if (selectedUnit) {
      setFormData((prev) => ({
        ...prev,
        unitId: selectedUnit.id,
        unitNo: selectedUnit.value,
        configuration: selectedUnit.configuration,
        area: selectedUnit.area,
      }));
    }
  };

  const handleChargesChange = (value: string) => {
    setCharges(value);
    if (value !== "Other") {
      handleInputChange("dealTerms", value);
    } else {
      handleInputChange("dealTerms", "");
    }
  };

  const openPdfInNewTab = async (bookingData: BookingType) => {
    try {
      const blob = await pdf(
        <BookingForm
          data={bookingData}
          metaData={{
            manager:
              getLabelFromValue(managerOptions, formData.salesManager) || "N/A",
            cp: formData.clientPartner,
          }}
        />,
      ).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.log(error);
      toast({
        title: "PDF Generation Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    const submissionData = {
      ...formData,
      eoiAmt: formData.eoiAmt * eoiAmtUnit,
      bookingAmt: formData.bookingAmt * bookingUnit,
      tokenAmt: formData.tokenAmt * tokenUnit,
      agreementValue: formData.agreementValue * avUnit,
    };

    const err = validateFormData(submissionData).error;

    if (err) {
      return toast({
        title: "Form Submission Error",
        description: formatZodMessagesOnly(err.errors),
        variant: "warning",
      });
    }

    try {
      function finishBooking() {
        const bookingData = transformFormDataToBooking(submissionData);
        openPdfInNewTab(bookingData);

        toast({
          title: "Success",
          description: "Form validated successfully. PDF opened in new tab.",
          variant: "success",
        });
      }

      setIsSubmitting(true);

      // Prepare client booking data
      const formattedData: ClientBookingCreateUpdateData = {
        date: submissionData.date,
        applicant: capitalizeWords(submissionData.applicant.toLowerCase()),
        coApplicant: capitalizeWords(
          (submissionData.coApplicant || "").toLowerCase(),
        ),
        status: "booked",
        project: submissionData.project,
        wing: submissionData.wing,
        floor: submissionData.floor,
        unit: submissionData.unitId,
        phoneNo: submissionData.phoneNo,
        altNo: submissionData.altNo,
        email: "",
        address: formatAddress(submissionData.address),
        paymentType: submissionData.paymentType,
        paymentStatus: "Token Received",
        bookingAmt: submissionData.bookingAmt,
        agreementValue: submissionData.agreementValue,
        dealTerms: submissionData.dealTerms,
        paymentTerms: submissionData.paymentTerms,
        salesManager: submissionData.salesManager,
        clientPartner: submissionData.clientPartner,
      };

      if (!clientId) {
        console.log("reached new booking");
        // Create new booking
        const booking =
          await mutateCreateClientBooking.mutateAsync(formattedData);
        setClientId(booking.data._id);

        // Update EOI status
        if (applicantId) {
          await updateEoiMutation.mutateAsync({
            id: applicantId,
            data: {
              status: "booked",
              applicant: submissionData.applicant,
              contact: submissionData.phoneNo
                ? Number(submissionData.phoneNo)
                : null,
              alt: submissionData.altNo ? Number(submissionData.altNo) : null,
              address: submissionData.address,
              config: submissionData.configuration,
              eoiAmt: submissionData.eoiAmt,
              manager: submissionData.salesManager,
              cp: submissionData.clientPartner,
              ...(eoiApplicantData?.data?.pan && {
                pan: eoiApplicantData.data.pan,
              }),
              ...(eoiApplicantData?.data?.aadhar && {
                aadhar: eoiApplicantData.data.aadhar,
              }),
            },
          });
        }

        finishBooking();
      } else {
        console.log("reached updated booking");
        // Update existing booking
        dialog.show({
          onAction: async () => {
            await mutateUpdateClientBooking.mutateAsync({
              id: clientId,
              updateData: formattedData,
            });

            // Update EOI
            if (applicantId) {
              await updateEoiMutation.mutateAsync({
                id: applicantId,
                data: {
                  status: "booked",
                  applicant: submissionData.applicant,
                  contact: submissionData.phoneNo
                    ? Number(submissionData.phoneNo)
                    : null,
                  alt: submissionData.altNo
                    ? Number(submissionData.altNo)
                    : null,
                  address: submissionData.address,
                  config: submissionData.configuration,
                  eoiAmt: submissionData.eoiAmt,
                  manager: submissionData.salesManager,
                  cp: submissionData.clientPartner,
                },
              });
            }

            finishBooking();
          },
        });
      }
    } catch (error) {
      console.log(error);
      const err = error as CustomAxiosError;
      toast({
        title: "Error Occurred",
        description:
          err.response?.data.error ||
          err.message ||
          "Failed to submit form unknown error occurred!",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const managerOptions = [
    { label: "N/A", value: "N/A" },
    ...(users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || []),
  ];

  const chargesOptions = FlatChargesNoteList.map((charge) => ({
    label: charge,
    value: charge,
  }));

  const bankOptions: ComboboxOption[] = BANK_LIST.map((b) => ({
    label: b,
    value: b,
  }));

  if (isEoiApplicantLoading) {
    return (
      <CenterWrapper>
        <Loader />
      </CenterWrapper>
    );
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TicketCheck className="h-5 w-5" />
          EOI Booking Form
        </CardTitle>
        <CardDescription>
          {eoiApplicantData?.data
            ? "Auto-filled information from EOI. Complete the remaining details."
            : "Complete the booking form details."}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Tooltip content="Refresh">
              <Button variant="outline" size="icon" onClick={handleRefetch}>
                <RefreshCw
                  size={20}
                  className={isRefetching ? "animate-spin" : ""}
                />
              </Button>
            </Tooltip>
          </div>

          {/* Locked Information */}
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Non-editable Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Booking Date" locked>
                <Input
                  value={formData.date.toLocaleDateString("en-IN")}
                  disabled
                />
              </FormField>

              <FormField label="EOI Date" locked>
                <Input
                  value={
                    formData.eoiDate
                      ? formData.eoiDate.toLocaleDateString("en-IN")
                      : "UNDEFINED"
                  }
                  disabled
                />
              </FormField>

              <FormField label="EOI Number" locked>
                <Input
                  value={formData.eoiNumber}
                  placeholder="Enter EOI number"
                  disabled
                />
              </FormField>

              <FormField label="Project" locked>
                <Input value={formData.project} disabled />
              </FormField>
            </div>
          </div>

          {/* Applicant Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Applicant Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Applicant" required>
                <Input
                  value={formData.applicant}
                  onChange={(e) =>
                    handleInputChange("applicant", e.target.value)
                  }
                  placeholder="Enter primary applicant name"
                />
              </FormField>

              <FormField label="Co-Applicant">
                <Input
                  value={formData.coApplicant}
                  onChange={(e) =>
                    handleInputChange("coApplicant", e.target.value)
                  }
                  placeholder="Enter co-applicant name"
                />
              </FormField>

              <FormField label="Phone Number" required>
                <div className="flex gap-2">
                  <Input
                    value={formData.phoneNo}
                    onChange={(e) =>
                      handleInputChange("phoneNo", e.target.value)
                    }
                    placeholder="Primary"
                    type="tel"
                    className="flex-1"
                  />
                  <Input
                    value={formData.altNo}
                    onChange={(e) => handleInputChange("altNo", e.target.value)}
                    placeholder="Alt (Optional)"
                    type="tel"
                    className="flex-1"
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Address" required>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter complete address"
                className="min-h-20"
              />
            </FormField>
          </div>

          {/* Unit Selection */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-medium">Unit Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Wing" required>
                <Combobox
                  value={formData.wing}
                  onChange={handleWingChange}
                  options={availableWings}
                  placeholder="Select Wing"
                  width="w-full"
                />
              </FormField>

              <FormField label="Floor" required>
                <Combobox
                  value={formData.floor}
                  onChange={handleFloorChange}
                  options={availableFloors}
                  placeholder="Select Floor"
                  width="w-full"
                  disabled={!formData.wing}
                />
              </FormField>

              <FormField label="Unit Number" required>
                <Combobox
                  value={formData.unitNo}
                  onChange={handleUnitChange}
                  options={availableUnits}
                  placeholder="Select Unit"
                  width="w-full"
                  disabled={!formData.floor}
                />
              </FormField>

              <FormField label="Configuration" required>
                <Input
                  value={formData.configuration.toUpperCase()}
                  disabled
                  placeholder="Auto-filled"
                />
              </FormField>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-medium">Payment Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="EOI Amount" required>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.eoiAmt}
                    onChange={(e) =>
                      handleInputChange("eoiAmt", Number(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select
                    value={eoiAmtUnit.toString()}
                    onValueChange={(value) => setEoiAmtUnit(Number(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {BUDGET_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value.toString()}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormField>

              <FormField label="Deal Amount" required>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.bookingAmt}
                    onChange={(e) =>
                      handleInputChange(
                        "bookingAmt",
                        Number(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select
                    value={bookingUnit.toString()}
                    onValueChange={(value) => setBookingUnit(Number(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {BUDGET_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value.toString()}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormField>

              <FormField label="Agreement Value" required>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.agreementValue}
                    onChange={(e) =>
                      handleInputChange(
                        "agreementValue",
                        Number(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select
                    value={avUnit.toString()}
                    onValueChange={(value) => setAVUnit(Number(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {BUDGET_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value.toString()}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormField>

              <FormField label="Token Amount" required>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.tokenAmt}
                    onChange={(e) =>
                      handleInputChange("tokenAmt", Number(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="flex-1"
                  />
                  <Select
                    value={tokenUnit.toString()}
                    onValueChange={(value) => setTokenUnit(Number(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {BUDGET_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value.toString()}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Deal Terms" required>
                <div className="flex items-center gap-2">
                  <Combobox
                    value={charges}
                    onChange={handleChargesChange}
                    options={chargesOptions}
                    placeholder="Select deal terms"
                    width="w-full"
                  />
                  {charges === "Other" && (
                    <Input
                      value={formData.dealTerms}
                      onChange={(e) =>
                        handleInputChange("dealTerms", e.target.value)
                      }
                      placeholder="Enter custom deal terms"
                    />
                  )}
                </div>
              </FormField>

              <FormField label="Payment Type" required>
                <Select
                  value={formData.paymentType}
                  onValueChange={(v) =>
                    handleInputChange("paymentType", v as PaymentType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="regular-payment">
                        Regular Payment
                      </SelectItem>
                      <SelectItem value="down-payment">Down Payment</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Payment Method" required>
                <Input
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    handleInputChange("paymentMethod", e.target.value)
                  }
                  placeholder="e.g., Cheque, UPI, NEFT"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Banks for Loan" required>
                <MultiSelect
                  defaultValue={formData.banks}
                  options={bankOptions}
                  onValueChange={(v) => handleInputChange("banks", v)}
                  maxCount={2}
                />
              </FormField>

              <FormField label="Sales Manager" required>
                <Combobox
                  value={formData.salesManager}
                  options={managerOptions}
                  onChange={(e) => handleInputChange("salesManager", e)}
                  width="w-full"
                  placeholder="Select Sales Manager"
                />
              </FormField>

              <FormField label="Client Partner" required>
                <Input
                  value={formData.clientPartner}
                  onChange={(e) =>
                    handleInputChange("clientPartner", e.target.value)
                  }
                  placeholder="Enter client partner"
                />
              </FormField>
            </div>

            <FormField label="Payment Terms" required>
              <Textarea
                value={formData.paymentTerms}
                onChange={(e) =>
                  handleInputChange("paymentTerms", e.target.value)
                }
                placeholder="Enter payment terms and schedule"
                className="min-h-20"
              />
            </FormField>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end p-4 sm:p-6 gap-4">
        <Button
          className="w-full sm:w-auto"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {clientId ? "Update & Preview" : "Submit & Preview"}
        </Button>
      </CardFooter>
      <dialog.AlertDialog />
    </Card>
  );
};

export default EOIBookingForm;
