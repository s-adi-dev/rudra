import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateClientBooking,
  useUpdateClientBooking,
} from "@/store/client-booking/query";
import { ClientBookingCreateUpdateData } from "@/store/client-booking/types";
import { useClientPartners } from "@/store/client-partner";
import {
  budgetOptions,
  ignoreRole,
  refDefaultOptions,
} from "@/store/data/options";
import { useInventory } from "@/store/inventory";
import { useUsersSummary } from "@/store/users";
import { getLabelFromValue } from "@/utils/func/arrayUtils";
import { getOrdinal } from "@/utils/func/numberUtils";
import {
  capitalizeWords,
  formatAddress,
  toProperCase,
} from "@/utils/func/strUtils";
import { formatZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { pdf, PDFDownloadLink } from "@react-pdf/renderer";
import { RefreshCw, TicketCheck } from "lucide-react";
import { useState } from "react";
import { BookingForm as PdfFlatBookingForm } from "./booking-pdf";
import {
  BookingSchema,
  BookingType,
  FlatChargesNoteList,
  ShopChargesNoteList,
} from "./utils";

const BankList = [
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

type paymentType = "regular-payment" | "down-payment";

export const BookingForm = () => {
  const { toast } = useToast();
  const { useProjectsStructure } = useInventory();
  const { data: projectsData, refetch: refetchProjects } =
    useProjectsStructure();
  const mutateCreateClientBooking = useCreateClientBooking();
  const mutateUpdateClientBooking = useUpdateClientBooking();
  const { useReference } = useClientPartners();
  const { data: users, refetch: refetchUsers } = useUsersSummary();
  const { data: refData, refetch: refetchRef } = useReference();
  const isSmallScreen = useMediaQuery("(max-width: 1024px)");
  const dialog = useAlertDialog({
    alertType: "Warn",
    iconName: "TicketCheck",
    title: "Update Booking",
    description: "Are you sure you want to update this booking?",
    actionLabel: "Update",
    cancelLabel: "Cancel",
  });

  // states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [amountUnit, setAmountUnit] = useState<number>(100000);
  const [avUnit, setAVUnit] = useState<number>(100000);
  const [bookingUnit, setBookingUnit] = useState<number>(1000);
  const [charges, setCharges] = useState<string>("");
  const [formType, setFormType] = useState<"residential" | "commercial">(
    "residential",
  );
  const [finalizedBooking, setFinalizedBooking] = useState<BookingType | null>(
    null,
  );
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedSM, setSelectedSM] = useState("");
  const [selectedCP, setSelectedCP] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] =
    useState<paymentType>("regular-payment");
  const [bookingData, setBookingData] = useState<BookingType>({
    type: formType,
    project: {
      name: "",
      by: "",
      address: "",
    },
    unit: {
      floor: "",
      unitNo: "",
      configuration: "",
      ...(formType === "residential" ? { wing: "" } : { area: 0 }),
    },
    payment: {
      amount: 0,
      includedChargesNote: "",
      paymentTerms: "",
      banks: [],
    },
    applicants: {
      primary: "",
      coApplicant: "",
      contact: {
        residenceNo: "",
        email: "",
        phoneNo: "",
        address: "",
      },
    },
    bookingDetails: {
      date: new Date(),
      bookingAmt: 0,
      checkNo: "",
      bankName: "",
      paymentDate: new Date(),
      av: 0,
    },
  });

  // Helper functions
  const getFilteredProjectsData = () => {
    const flatStatusFilter: string[] = ["available", "canceled"];
    if (!projectsData?.data) return [];

    return projectsData.data
      .map((project) => {
        const filteredProject = { ...project };

        if (formType === "residential") {
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

          filteredProject.commercialFloors = [];
        } else {
          // Handle commercial units
          if (project.commercialUnitPlacement === "projectLevel") {
            filteredProject.wings = [];
            filteredProject.commercialFloors = project.commercialFloors
              ?.map((floor) => ({
                ...floor,
                units: floor.units.filter((unit) =>
                  flatStatusFilter.includes(unit.status),
                ),
              }))
              .filter((floor) => floor.units.length > 0);
          } else {
            filteredProject.wings = project.wings
              .map((wing) => ({
                ...wing,
                commercialFloors: wing.commercialFloors
                  ?.map((floor) => ({
                    ...floor,
                    units: floor.units.filter((unit) =>
                      flatStatusFilter.includes(unit.status),
                    ),
                  }))
                  .filter((floor) => floor.units.length > 0),
              }))
              .filter((wing) => wing.commercialFloors?.length);

            filteredProject.commercialFloors = [];
          }
        }

        return filteredProject;
      })
      .filter((project) =>
        formType === "residential"
          ? project.wings.length > 0
          : project.commercialUnitPlacement === "projectLevel"
            ? project.commercialFloors?.length
            : project.wings.length > 0,
      );
  };

  const getProjectData = () =>
    projects?.find((p) => p.name === bookingData.project.name);

  const getFloors = () => {
    const project = getProjectData();
    if (!project) return;

    const isFlat = formType === "residential";
    const isProjectLevel =
      !isFlat && project.commercialUnitPlacement === "projectLevel";
    const wing = project.wings.find((w) => w.name === bookingData.unit.wing);

    return isFlat
      ? wing?.floors
      : isProjectLevel
        ? project.commercialFloors
        : wing?.commercialFloors;
  };

  const getUnits = () => {
    const floors = getFloors();
    const floor = floors?.find(
      (f) => f.displayNumber === Number(bookingData.unit.floor),
    );
    return floor?.units.map((u) => ({
      label: `${floor.type == "commercial" ? toProperCase(u.configuration) : "Unit"} ${u.unitNumber}`,
      value: u.unitNumber.toString(),
    }));
  };

  const findUnit = (unitNo: string) => {
    const floors = getFloors();
    const floor = floors?.find(
      (f) => f.displayNumber === Number(bookingData.unit.floor),
    );
    return floor?.units.find((u) => u.unitNumber == unitNo);
  };

  // variables
  const projects = getFilteredProjectsData();

  const managerOptions = [
    { label: "N/A", value: "N/A" },
    ...(users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || []),
  ];

  const refDynamicOptions: ComboboxOption[] =
    refData?.references?.map((ref) => ({
      label: `${ref.firstName} ${ref.lastName}${ref.companyName ? ` (${ref.companyName})` : ""}`,
      value: ref._id,
    })) || [];

  const referenceOptions: ComboboxOption[] = [
    ...refDefaultOptions,
    ...refDynamicOptions,
  ];

  // Derived values
  const ChargesNoteList =
    formType === "residential" ? FlatChargesNoteList : ShopChargesNoteList;
  const projectOptions =
    projects?.map((p) => ({ label: p.name, value: p.name! })) || [];

  const wingOptions =
    getProjectData()?.wings.map((w) => ({
      label: w.name,
      value: w.name,
    })) || [];

  const floorOptions =
    getFloors()?.map((f) => ({
      label:
        f.displayNumber === 0
          ? "Ground Floor"
          : `${getOrdinal(f.displayNumber)} Floor`,
      value: f.displayNumber.toString(),
    })) || [];

  const unitOptions = getUnits() || [];
  const chargesOptions = ChargesNoteList.map((charge) => ({
    label: charge,
    value: charge,
  }));

  const bankOptions = BankList.map((bank) => ({
    label: bank,
    value: bank,
  }));

  // Event Handlers
  const handleFormTypeChange = (type: "residential" | "commercial") => {
    setFormType(type);
    setBookingData((prev) => ({
      ...prev,
      type,
      unit: {
        floor: "",
        unitNo: "",
        configuration: "",
        ...(type === "residential" ? { wing: "" } : { area: 0 }),
      },
    }));
  };

  const handleUnitChange = (unitNo: string) => {
    if (!unitNo) return;

    const unit = findUnit(unitNo);
    if (!unit) return;

    setSelectedUnitId(unit._id!);

    handleInputChange(
      ["unit", "configuration"],
      unit.configuration.toUpperCase(),
    );
    handleInputChange(["unit", "unitNo"], unit.unitNumber);
    if (formType === "commercial") {
      handleInputChange(["unit", "area"], unit.area);
    }
  };

  const handleInputChange = (
    path: string[],
    value: string[] | string | number | Date,
  ) => {
    setBookingData((prev) => {
      const updated = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const handleProjectChange = (projectName: string) => {
    const project = projects?.find((p) => p.name === projectName);
    if (!project) return;

    setBookingData((prev) => ({
      ...prev,
      project: {
        name: project.name,
        by: project.by,
        address: project.location,
      },
      unit: {
        wing: "",
        floor: "",
        unitNo: "",
        configuration: "",
      },
    }));
    if (formType == "commercial") handleInputChange(["unit", "area"], 0);
  };

  const handleWingChange = (wingName: string) => {
    handleInputChange(["unit", "wing"], wingName);
    handleInputChange(["unit", "floor"], "");
    handleInputChange(["unit", "unitNo"], "");
    handleInputChange(["unit", "configuration"], "");
    if (formType == "commercial") handleInputChange(["unit", "area"], 0);
  };

  const handleFloorChange = (floorNo: string) => {
    handleInputChange(["unit", "floor"], floorNo);
    handleInputChange(["unit", "unitNo"], "");
    handleInputChange(["unit", "configuration"], "");
    if (formType == "commercial") handleInputChange(["unit", "area"], 0);
  };

  const handleChargesNoteChange = (value: string) => {
    setCharges(value);
    if (value !== "Other") {
      handleInputChange(["payment", "includedChargesNote"], value);
    }
  };

  const validateForm = (
    data: BookingType,
  ): { isValid: boolean; message?: string } => {
    if (!data.project.name.trim()) {
      return { isValid: false, message: "Project name is required" };
    }
    if (
      !data.unit.unitNo.trim() ||
      !data.unit.floor.trim() ||
      !data.unit.configuration.trim()
    ) {
      return { isValid: false, message: "Unit details are incomplete" };
    }
    if (
      !data.applicants.primary.trim() ||
      !data.applicants.contact.address.trim() ||
      !data.applicants.contact.phoneNo.trim()
    ) {
      return { isValid: false, message: "Applicant information is incomplete" };
    }
    if (
      !data.payment.paymentTerms.trim() ||
      !data.payment.includedChargesNote.trim() ||
      data.payment.amount <= 0
    ) {
      return { isValid: false, message: "Payment information is incomplete" };
    }
    if (
      !data.bookingDetails.date ||
      !data.bookingDetails.checkNo.trim() ||
      !data.bookingDetails.bankName.trim() ||
      data.bookingDetails.bookingAmt <= 0 ||
      !data.bookingDetails.paymentDate
    ) {
      return { isValid: false, message: "Booking details are incomplete" };
    }
    if (data.type === "residential" && !data.unit.wing?.trim()) {
      return { isValid: false, message: "Wing is required for flats" };
    }
    if (
      data.type === "commercial" &&
      (!data.unit.area || data.unit.area <= 0)
    ) {
      return { isValid: false, message: "Area is required for shops" };
    }

    return { isValid: true };
  };

  const openPdfInNewTab = async (bookingData: BookingType) => {
    try {
      const blob = await pdf(
        <PdfFlatBookingForm
          data={bookingData}
          metaData={{
            manager: getLabelFromValue(managerOptions, selectedSM) || "N/A",
            cp: (() => {
              const selectedRef = refData?.references?.find(
                (ref) => ref._id === selectedCP,
              );
              return selectedRef?.companyName || "N/A";
            })(),
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

  const handleRefetch = async () => {
    setIsRefetching(true);

    try {
      await Promise.all([refetchProjects(), refetchUsers(), refetchRef()]);

      toast({
        title: "Data Refreshed",
        description: "All data has been successfully updated.",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Refetch Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      await setTimeout(() => {
        setIsRefetching(false);
      }, 1000);
      setIsRefetching(false);
    }
  };

  const handleSubmit = async () => {
    const newBooking: BookingType = {
      ...bookingData,
      payment: {
        ...bookingData.payment,
        amount: bookingData.payment.amount * amountUnit,
      },
      bookingDetails: {
        ...bookingData.bookingDetails,
        bookingAmt: bookingData.bookingDetails.bookingAmt * bookingUnit,
        av: bookingData.bookingDetails.av * avUnit,
      },
    };

    const validation = validateForm(newBooking);
    if (!validation.isValid || !selectedCP.length || !selectedSM.length) {
      toast({
        title: "Form Validation Error",
        description: validation.message || "Please fill all required fields",
        variant: "warning",
      });
      return;
    }

    const schemaValidation = BookingSchema.safeParse(newBooking);
    if (!schemaValidation.success) {
      const errorMessages = formatZodErrors(schemaValidation.error.errors);
      toast({
        title: "Form Validation Error",
        description: `Please correct the following errors:\n${errorMessages}`,
        variant: "warning",
      });
      return;
    }

    try {
      function finishBooking() {
        setFinalizedBooking(newBooking);
        openPdfInNewTab(newBooking);

        toast({
          title: "Success",
          description: "Form validated successfully. PDF opened in new tab.",
          variant: "success",
        });
      }

      setIsSubmitting(true);
      const formattedData: ClientBookingCreateUpdateData = {
        date: newBooking.bookingDetails.date,
        applicant: capitalizeWords(newBooking.applicants.primary.toLowerCase()),
        coApplicant: capitalizeWords(
          (newBooking.applicants.coApplicant || "").toLowerCase(),
        ),
        status: "booked",
        project: newBooking.project.name,
        wing: newBooking.unit.wing,
        floor: newBooking.unit.floor,
        unit: selectedUnitId,
        phoneNo: newBooking.applicants.contact.phoneNo,
        altNo: newBooking.applicants.contact.residenceNo,
        email: newBooking.applicants.contact.email,
        address: formatAddress(newBooking.applicants.contact.address),
        paymentType: selectedPaymentType,
        paymentStatus: "Token Received",
        bookingAmt: newBooking.bookingDetails.bookingAmt,
        agreementValue: newBooking.bookingDetails.av,
        dealTerms: newBooking.payment.includedChargesNote,
        paymentTerms: newBooking.payment.paymentTerms,
        salesManager: selectedSM,
        clientPartner: selectedCP,
      };

      if (!clientId) {
        const booking =
          await mutateCreateClientBooking.mutateAsync(formattedData);
        setClientId(booking.data._id);
        finishBooking();
      } else {
        dialog.show({
          onAction: async () => {
            await mutateUpdateClientBooking.mutateAsync({
              id: clientId,
              updateData: formattedData,
            });
            finishBooking();
          },
        });
      }
    } catch (error) {
      console.log(error);
      const err = error as CustomAxiosError;
      toast({
        title: "Error Occured",
        description:
          err.response?.data.error ||
          err.message ||
          "Failed to submit form unkown error occured!",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TicketCheck className="h-5 w-5" />
          Booking Form
        </CardTitle>
        <CardDescription>
          Enter applicant details and other information
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Form Type Selection */}
          <div className="flex gap-4">
            <Button
              variant={formType === "residential" ? "default" : "outline"}
              onClick={() => handleFormTypeChange("residential")}
            >
              Residential
            </Button>
            <Button
              variant={formType === "commercial" ? "default" : "outline"}
              onClick={() => handleFormTypeChange("commercial")}
            >
              Commercial
            </Button>
            <Tooltip content="Refresh">
              <Button variant="outline" size="icon" onClick={handleRefetch}>
                <RefreshCw
                  size={20}
                  className={isRefetching ? "animate-spin" : ""}
                />
              </Button>
            </Tooltip>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium">General Information</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-6">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Project Name"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    value={bookingData.project.name}
                    onChange={handleProjectChange}
                    options={projectOptions}
                    width="w-full"
                  />
                </FormFieldWrapper>
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-1 grow">
                  <FormFieldWrapper
                    className="gap-3 w-full"
                    LabelText="Applicant"
                    Important
                    ImportantSide="right"
                  >
                    <Input
                      value={bookingData.applicants.primary}
                      placeholder="e.g. John Doe"
                      onChange={(e) =>
                        handleInputChange(
                          ["applicants", "primary"],
                          e.target.value,
                        )
                      }
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper
                    className="gap-3 w-full"
                    LabelText="Co-Applicant"
                  >
                    <Input
                      value={bookingData.applicants.coApplicant}
                      placeholder="e.g. Jane Doe"
                      onChange={(e) =>
                        handleInputChange(
                          ["applicants", "coApplicant"],
                          e.target.value,
                        )
                      }
                    />
                  </FormFieldWrapper>
                </div>
              </div>

              <div className="space-y-6">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Phone Number"
                  Important
                  ImportantSide="right"
                >
                  <div className="flex flex-col sm:flex-row gap-3 grow">
                    <Input
                      className="w-full"
                      value={bookingData.applicants.contact.phoneNo}
                      placeholder="Primary No"
                      onChange={(e) =>
                        handleInputChange(
                          ["applicants", "contact", "phoneNo"],
                          e.target.value.trim(),
                        )
                      }
                    />
                    <Input
                      className="w-full"
                      value={bookingData.applicants.contact.residenceNo}
                      placeholder="Residence (Optional)"
                      onChange={(e) =>
                        handleInputChange(
                          ["applicants", "contact", "residenceNo"],
                          e.target.value.trim(),
                        )
                      }
                    />
                  </div>
                </FormFieldWrapper>
                <FormFieldWrapper className="gap-3" LabelText="Email">
                  <Input
                    value={bookingData.applicants.contact.email}
                    placeholder="john.doe@example.com"
                    onChange={(e) =>
                      handleInputChange(
                        ["applicants", "contact", "email"],
                        e.target.value,
                      )
                    }
                  />
                </FormFieldWrapper>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-1 grow">
                  {(formType === "residential" ||
                    projects?.find((p) => p.name === bookingData.project.name)
                      ?.commercialUnitPlacement === "wingLevel") && (
                    <FormFieldWrapper
                      className="gap-3 w-full"
                      LabelText="Wing"
                      Important
                      ImportantSide="right"
                    >
                      <Combobox
                        disabled={!bookingData.project.name}
                        options={wingOptions}
                        value={bookingData.unit.wing || ""}
                        placeholder="Select Wing"
                        width="w-full"
                        onChange={handleWingChange}
                      />
                    </FormFieldWrapper>
                  )}
                  <FormFieldWrapper
                    className="gap-3 w-full"
                    LabelText="Floor"
                    Important
                    ImportantSide="right"
                  >
                    <Combobox
                      disabled={
                        formType === "residential"
                          ? !bookingData.unit.wing
                          : projects?.find(
                                (p) => p.name === bookingData.project.name,
                              )?.commercialUnitPlacement === "projectLevel"
                            ? !bookingData.project.name
                            : !bookingData.unit.wing
                      }
                      options={floorOptions}
                      value={bookingData.unit.floor || ""}
                      placeholder="Select Floor"
                      width="w-full"
                      onChange={handleFloorChange}
                      align={formType === "residential" ? "end" : "start"}
                    />
                  </FormFieldWrapper>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-1 grow">
                  <FormFieldWrapper
                    className="gap-3 w-full"
                    LabelText={`${toProperCase(formType)} No`}
                    Important
                    ImportantSide="right"
                  >
                    <Combobox
                      disabled={!bookingData.unit.floor}
                      options={unitOptions}
                      value={bookingData.unit.unitNo || ""}
                      placeholder="Select Unit"
                      width="w-full"
                      onChange={handleUnitChange}
                      align="start"
                    />
                  </FormFieldWrapper>
                  <FormFieldWrapper
                    className="gap-3 w-full"
                    LabelText="Configuration"
                    Important
                    ImportantSide="right"
                  >
                    <Input
                      value={bookingData.unit.configuration}
                      placeholder={"N/A"}
                      disabled
                      onChange={(e) =>
                        handleInputChange(
                          ["unit", "configuration"],
                          e.target.value,
                        )
                      }
                    />
                  </FormFieldWrapper>
                </div>
              </div>
            </div>

            <FormFieldWrapper
              className="gap-3"
              LabelText="Address"
              Important
              ImportantSide="right"
            >
              <Textarea
                className="min-h-20"
                placeholder="e.g. 123 Main Street, Anytown, State, 12345"
                value={bookingData.applicants.contact.address}
                onChange={(e) =>
                  handleInputChange(
                    ["applicants", "contact", "address"],
                    e.target.value,
                  )
                }
              />
            </FormFieldWrapper>
          </div>

          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-medium">Payment Information</h3>
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${formType === "residential" ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-4`}
            >
              <FormFieldWrapper
                className="gap-3"
                LabelText="Amount"
                Important
                ImportantSide="right"
              >
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Input
                    className="w-full"
                    value={bookingData.payment.amount}
                    onChange={(e) =>
                      handleInputChange(
                        ["payment", "amount"],
                        Number(e.target.value) ? Number(e.target.value) : 0,
                      )
                    }
                    placeholder="0"
                  />
                  <Select
                    value={amountUnit.toString()}
                    onValueChange={(value) => setAmountUnit(Number(value))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Budget Units" />
                    </SelectTrigger>
                    <SelectContent align="center">
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {budgetOptions.map((unit, index) => (
                          <SelectItem value={unit.value.toString()} key={index}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormFieldWrapper>
              <FormFieldWrapper
                className="gap-3"
                LabelText="Deal Terms"
                Important
                ImportantSide="right"
              >
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Combobox
                    value={charges}
                    onChange={handleChargesNoteChange}
                    options={chargesOptions}
                    width="w-full"
                  />
                  {charges === "Other" && (
                    <Input
                      className="w-full mt-2 sm:mt-0"
                      value={bookingData.payment.includedChargesNote}
                      placeholder="Enter your deal terms"
                      onChange={(e) =>
                        handleInputChange(
                          ["payment", "includedChargesNote"],
                          e.target.value,
                        )
                      }
                    />
                  )}
                </div>
              </FormFieldWrapper>
              {formType === "residential" && (
                <FormFieldWrapper LabelText="Banks for loan" className="gap-3">
                  <MultiSelect
                    defaultValue={bookingData.payment.banks}
                    options={bankOptions}
                    onValueChange={(e) =>
                      handleInputChange(["payment", "banks"], e)
                    }
                    maxCount={2}
                  />
                </FormFieldWrapper>
              )}
            </div>
            <FormFieldWrapper
              className="gap-3"
              LabelText="Payment Terms"
              Important
              ImportantSide="right"
            >
              <Textarea
                className="min-h-20"
                placeholder="Enter payment terms here..."
                value={bookingData.payment.paymentTerms}
                onChange={(e) =>
                  handleInputChange(["payment", "paymentTerms"], e.target.value)
                }
              />
            </FormFieldWrapper>
          </div>
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-medium">Booking Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormFieldWrapper
                className="gap-3"
                LabelText="Booking Date"
                Important
                ImportantSide="right"
              >
                <DatePickerV2
                  className="sm:w-full"
                  defaultDate={bookingData.bookingDetails.date}
                  onDateChange={(e) => {
                    handleInputChange(["bookingDetails", "date"], e);
                  }}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                className="gap-3 col-span-1"
                LabelText="Booking Amount"
                Important
                ImportantSide="right"
              >
                <div className="flex flex-row gap-2 w-full">
                  <Input
                    className="w-full"
                    value={bookingData.bookingDetails.bookingAmt}
                    onChange={(e) =>
                      handleInputChange(
                        ["bookingDetails", "bookingAmt"],
                        Number(e.target.value) ? Number(e.target.value) : 0,
                      )
                    }
                    placeholder="0"
                  />
                  <Select
                    value={bookingUnit.toString()}
                    onValueChange={(value) => setBookingUnit(Number(value))}
                  >
                    <SelectTrigger className="w-32 shrink-0">
                      <SelectValue placeholder="Units" />
                    </SelectTrigger>
                    <SelectContent align="center">
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {budgetOptions.map((unit, index) => (
                          <SelectItem value={unit.value.toString()} key={index}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper
                className="gap-3"
                LabelText="Cheque/Draft No"
                Important
                ImportantSide="right"
              >
                <Input
                  placeholder="e.g. 12334"
                  value={bookingData.bookingDetails.checkNo}
                  onChange={(e) => {
                    handleInputChange(
                      ["bookingDetails", "checkNo"],
                      e.target.value,
                    );
                  }}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                className="gap-3"
                LabelText="Bank Name"
                Important
                ImportantSide="right"
              >
                <Input
                  placeholder="e.g. SBI"
                  value={bookingData.bookingDetails.bankName}
                  onChange={(e) => {
                    handleInputChange(
                      ["bookingDetails", "bankName"],
                      e.target.value,
                    );
                  }}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                className="gap-3"
                LabelText="Payment Date"
                Important
                ImportantSide="right"
              >
                <DatePickerV2
                  className="sm:w-full"
                  defaultDate={bookingData.bookingDetails.paymentDate}
                  onDateChange={(e) => {
                    handleInputChange(["bookingDetails", "paymentDate"], e);
                  }}
                />
              </FormFieldWrapper>
              <FormFieldWrapper
                className="gap-3"
                LabelText="Agreement Value"
                Important
                ImportantSide="right"
              >
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Input
                    className="w-full"
                    value={bookingData.bookingDetails.av}
                    onChange={(e) =>
                      handleInputChange(
                        ["bookingDetails", "av"],
                        Number(e.target.value) ? Number(e.target.value) : 0,
                      )
                    }
                    placeholder="0"
                  />
                  <Select
                    value={avUnit.toString()}
                    onValueChange={(value) => setAVUnit(Number(value))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Budget Units" />
                    </SelectTrigger>
                    <SelectContent align="center">
                      <SelectGroup>
                        <SelectLabel>Units</SelectLabel>
                        {budgetOptions.map((unit, index) => (
                          <SelectItem value={unit.value.toString()} key={index}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper
                className="gap-3"
                LabelText="Payment Type"
                Important
                ImportantSide="right"
              >
                <Select
                  value={selectedPaymentType}
                  onValueChange={(e) =>
                    setSelectedPaymentType(e as paymentType)
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
              </FormFieldWrapper>
              <FormFieldWrapper
                className="gap-3"
                LabelText="Sales Manager"
                Important
                ImportantSide="right"
              >
                <Combobox
                  value={selectedSM}
                  options={managerOptions}
                  onChange={(e) => setSelectedSM(e)}
                  width="w-full"
                  placeholder="Select Sales Manager"
                />
              </FormFieldWrapper>
              <FormFieldWrapper
                className="gap-3"
                LabelText="Client Partner"
                Important
                ImportantSide="right"
              >
                <Combobox
                  value={selectedCP}
                  options={referenceOptions}
                  onChange={(e) => setSelectedCP(e)}
                  width="w-full"
                  placeholder="Select Client Partner"
                  align={isSmallScreen ? "start" : "end"}
                />
              </FormFieldWrapper>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end p-4 sm:p-6 gap-4">
        {finalizedBooking && (
          <PDFDownloadLink
            document={
              <PdfFlatBookingForm
                data={finalizedBooking}
                metaData={{
                  manager:
                    getLabelFromValue(managerOptions, selectedSM) || "N/A",
                  cp: (() => {
                    const selectedRef = refData?.references?.find(
                      (ref) => ref._id === selectedCP,
                    );
                    return selectedRef?.companyName || "N/A";
                  })(),
                }}
              />
            }
            fileName={`booking-${finalizedBooking.applicants.primary}-${finalizedBooking.unit.unitNo}.pdf`}
            className="bg-primary text-secondary px-4 py-2 rounded-md hover:bg-primary/90 w-full sm:w-auto"
          >
            {({ loading }) =>
              loading ? "Preparing Download..." : "Download PDF"
            }
          </PDFDownloadLink>
        )}

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
