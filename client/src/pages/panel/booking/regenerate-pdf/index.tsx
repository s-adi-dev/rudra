import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { MultiSelect } from "@/components/custom ui/multi-select";
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
import { useToast } from "@/hooks/use-toast";
import {
  useClientBookingById,
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
import { CustomAxiosError } from "@/utils/types/axios";
import { pdf } from "@react-pdf/renderer";
import { ArrowLeft, FileOutput, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookingForm as PdfBookingForm } from "../../form/booking/booking-pdf";
import {
  BookingType,
  calculateDealBreakdown,
  FlatChargesNoteList,
  ShopChargesNoteList,
} from "../../form/booking/utils";

type RegenerateFormData = {
  projectName: string;
  applicant: string;
  coApplicant: string;
  aadhaarNo: string;
  panNo: string;
  phoneNo: string;
  residenceNo: string;
  email: string;
  address: string;
  wing: string;
  floor: string;
  unitNo: string;
  configuration: string;
  area: string;
  amount: string;
  dealTerms: string;
  paymentTerms: string;
  banks: string[];
  charges: string;
  bookingDate: Date;
  bookingAmt: string;
  checkNo: string;
  bankName: string;
  paymentDate: Date;
  agreementValue: string;
  paymentType: "regular-payment" | "down-payment";
  salesManager: string;
  clientPartner: string;
};

const emptyForm = (): RegenerateFormData => ({
  projectName: "",
  applicant: "",
  coApplicant: "",
  aadhaarNo: "",
  panNo: "",
  phoneNo: "",
  residenceNo: "",
  email: "",
  address: "",
  wing: "",
  floor: "",
  unitNo: "",
  configuration: "",
  area: "",
  amount: "",
  dealTerms: "",
  paymentTerms: "",
  banks: [],
  charges: "",
  bookingDate: new Date(),
  bookingAmt: "",
  checkNo: "",
  bankName: "",
  paymentDate: new Date(),
  agreementValue: "",
  paymentType: "regular-payment",
  salesManager: "",
  clientPartner: "",
});

const RegenerateBookingPdf = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: bookingResponse,
    isLoading,
    error,
  } = useClientBookingById(id || null);
  const updateBooking = useUpdateClientBooking();
  const { useProjectByName } = useInventory();
  const { useReference } = useClientPartners();
  const { data: users } = useUsersSummary();
  const { data: references } = useReference();
  const booking = bookingResponse?.data;
  const { data: projectResponse } = useProjectByName(booking?.project || "");
  const [form, setForm] = useState<RegenerateFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculationMode, setCalculationMode] = useState<
    "manual" | "automatic"
  >("manual");
  const [amountUnit, setAmountUnit] = useState(100000);

  useEffect(() => {
    if (!booking) return;
    setForm({
      ...emptyForm(),
      projectName: booking.project,
      applicant: booking.applicant,
      coApplicant: booking.coApplicant || "",
      aadhaarNo: booking.aadhaarNo || "",
      panNo: booking.panNo || "",
      phoneNo: booking.phoneNo,
      residenceNo: booking.altNo || "",
      email: booking.email || "",
      address: booking.address || "",
      wing: booking.wing || "",
      floor: booking.floor,
      unitNo: booking.unit.unitNumber,
      configuration: booking.unit.configuration,
      area: booking.unit.area || "",
      amount: "0",
      dealTerms: booking.dealTerms,
      charges: (
        [...FlatChargesNoteList, ...ShopChargesNoteList] as string[]
      ).includes(booking.dealTerms)
        ? booking.dealTerms
        : "Other",
      paymentTerms: booking.paymentTerms,
      bookingDate: new Date(booking.date),
      bookingAmt: String(booking.bookingAmt),
      paymentDate: new Date(booking.date),
      agreementValue: String(booking.agreementValue),
      paymentType: booking.paymentType,
      salesManager: booking.salesManager,
      clientPartner: booking.clientPartner,
    });
  }, [booking, projectResponse]);

  const setField = (field: keyof RegenerateFormData, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const numeric = (value: string) => Number(value) || 0;
  const dealBreakdown =
    calculationMode === "automatic"
      ? calculateDealBreakdown(numeric(form.amount) * amountUnit)
      : null;
  const manager = users?.find((user) => user.username === form.salesManager);
  const managerName = manager
    ? `${manager.firstName} ${manager.lastName}`
    : form.salesManager;
  const referenceName =
    references?.references?.find(
      (reference) => reference._id === booking?.clientPartner,
    )?.companyName ||
    booking?.clientPartner ||
    "N/A";

  const formType = form.wing ? "residential" : "commercial";
  const chargesOptions = (
    formType === "residential" ? FlatChargesNoteList : ShopChargesNoteList
  ).map((charge) => ({ label: charge, value: charge }));
  const bankOptions = [
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
  ].map((bank) => ({ label: bank, value: bank }));
  const managerOptions: ComboboxOption[] = [
    { label: "N/A", value: "N/A" },
    ...(users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || []),
  ];
  const referenceOptions: ComboboxOption[] = [
    ...refDefaultOptions,
    ...(references?.references?.map((reference) => ({
      label: `${reference.firstName} ${reference.lastName}${reference.companyName ? ` (${reference.companyName})` : ""}`,
      value: reference._id,
    })) || []),
  ];

  const handleSubmit = async () => {
    if (!booking || !id) return;
    const isCommercial = !form.wing;
    const unit =
      projectResponse?.data.wings
        .flatMap((wing) => {
          const floors = isCommercial
            ? wing.commercialFloors || []
            : wing.floors || [];
          return floors.flatMap((floor) =>
            floor.units.map((candidate) => ({ candidate, wing, floor })),
          );
        })
        .find(
          ({ candidate, wing, floor }) =>
            candidate.unitNumber === form.unitNo &&
            floor.displayNumber.toString() === form.floor &&
            (!form.wing || wing?.name === form.wing),
        ) ||
      (projectResponse?.data.commercialFloors || [])
        .flatMap((floor) =>
          floor.units.map((candidate) => ({ candidate, floor })),
        )
        .find(
          ({ candidate, floor }) =>
            candidate.unitNumber === form.unitNo &&
            floor.displayNumber.toString() === form.floor,
        );

    if (
      !form.projectName ||
      !form.applicant ||
      !form.phoneNo ||
      !form.address ||
      !form.dealTerms ||
      !form.paymentTerms ||
      !form.checkNo ||
      !form.bankName ||
      numeric(form.amount) <= 0 ||
      numeric(form.bookingAmt) <= 0
    ) {
      toast({
        title: "Form Validation Error",
        description: "Complete all required booking and payment fields.",
        variant: "warning",
      });
      return;
    }
    if (form.unitNo !== booking.unit.unitNumber && !unit) {
      toast({
        title: "Unit Not Found",
        description: "Select a valid unit from the project before saving.",
        variant: "destructive",
      });
      return;
    }

    const updateData: Partial<ClientBookingCreateUpdateData> = {
      date: form.bookingDate,
      applicant: form.applicant,
      coApplicant: form.coApplicant,
      aadhaarNo: form.aadhaarNo,
      panNo: form.panNo,
      project: form.projectName,
      wing: form.wing,
      floor: form.floor,
      unit: unit?.candidate._id || booking.unit._id,
      phoneNo: form.phoneNo,
      altNo: form.residenceNo,
      email: form.email,
      address: form.address,
      paymentType: form.paymentType,
      bookingAmt: numeric(form.bookingAmt),
      agreementValue:
        calculationMode === "automatic"
          ? dealBreakdown?.agreementValue || 0
          : numeric(form.agreementValue),
      dealTerms: form.dealTerms,
      paymentTerms: form.paymentTerms,
      salesManager: form.salesManager,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
    };
    if (form.clientPartner !== booking.clientPartner) {
      updateData.clientPartner = form.clientPartner;
    }
    const pdfData: BookingType = {
      type: isCommercial ? "commercial" : "residential",
      project: {
        name: form.projectName,
        by: projectResponse?.data.by || "",
        address: projectResponse?.data.location || "",
      },
      unit: {
        wing: form.wing || undefined,
        floor: form.floor,
        unitNo: form.unitNo,
        configuration: form.configuration,
        area: numeric(form.area),
      },
      payment: {
        amount: numeric(form.amount) * amountUnit,
        includedChargesNote: form.dealTerms,
        paymentTerms: form.paymentTerms,
        banks: form.banks,
      },
      applicants: {
        primary: form.applicant,
        coApplicant: form.coApplicant,
        aadhaarNo: form.aadhaarNo || undefined,
        panNo: form.panNo || undefined,
        contact: {
          phoneNo: form.phoneNo,
          residenceNo: form.residenceNo,
          email: form.email,
          address: form.address,
        },
      },
      bookingDetails: {
        date: form.bookingDate,
        bookingAmt: numeric(form.bookingAmt),
        checkNo: form.checkNo,
        bankName: form.bankName,
        paymentDate: form.paymentDate,
        av:
          calculationMode === "automatic"
            ? dealBreakdown?.agreementValue || 0
            : numeric(form.agreementValue),
      },
    };

    try {
      setIsSubmitting(true);
      await updateBooking.mutateAsync({ id, updateData });
      const blob = await pdf(
        <PdfBookingForm
          data={pdfData}
          metaData={{ manager: managerName || "N/A", cp: referenceName }}
          calculationMode={calculationMode}
          calculations={dealBreakdown ?? undefined}
        />,
      ).toBlob();
      window.open(URL.createObjectURL(blob), "_blank");
      toast({
        title: "Booking Updated",
        description: "The booking was updated and its PDF was regenerated.",
      });
    } catch (submitError) {
      const axiosError = submitError as CustomAxiosError;
      toast({
        title: "Regeneration Failed",
        description:
          axiosError.response?.data.error ||
          "Unable to update and regenerate the booking PDF.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (
    name: keyof RegenerateFormData,
    label: string,
    type = "text",
    important = false,
  ) => (
    <FormFieldWrapper
      LabelText={label}
      Important={important}
      ImportantSide="right"
      className="gap-3"
    >
      <Input
        type={type}
        value={String(form[name])}
        onChange={(event) => setField(name, event.target.value)}
        disabled={isSubmitting}
      />
    </FormFieldWrapper>
  );

  if (isLoading)
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (error || !booking)
    return <div className="p-6 text-center">Booking could not be loaded.</div>;

  return (
    <Card className="mx-auto w-full">
      <CardHeader className="border-b p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          <FileOutput className="h-5 w-5" />
          Regenerate Booking PDF
        </CardTitle>
        <CardDescription>
          Review stored booking information and complete the fields required
          only for the PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <section className="space-y-6">
          <h3 className="text-lg font-medium">General Information</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-6">
              <FormFieldWrapper
                LabelText="Project Name"
                Important
                ImportantSide="right"
                className="gap-3"
              >
                <Combobox
                  value={form.projectName}
                  onChange={() => undefined}
                  options={[
                    { label: form.projectName, value: form.projectName },
                  ]}
                  width="w-full"
                  disabled
                />
              </FormFieldWrapper>
              <div className="flex flex-col gap-6 sm:flex-row sm:gap-1">
                {field("applicant", "Applicant", "text", true)}
                {field("coApplicant", "Co-Applicant")}
              </div>
            </div>
            <div className="space-y-6">
              <FormFieldWrapper
                LabelText="Phone Number"
                Important
                ImportantSide="right"
                className="gap-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={form.phoneNo}
                    onChange={(event) =>
                      setField("phoneNo", event.target.value.trim())
                    }
                    disabled={isSubmitting}
                    placeholder="Primary No"
                  />
                  <Input
                    value={form.residenceNo}
                    onChange={(event) =>
                      setField("residenceNo", event.target.value.trim())
                    }
                    disabled={isSubmitting}
                    placeholder="Residence (Optional)"
                  />
                </div>
              </FormFieldWrapper>
              {field("email", "Email", "email")}
            </div>
            <div className="space-y-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:gap-1">
                <FormFieldWrapper
                  LabelText="Wing"
                  Important
                  ImportantSide="right"
                  className="w-full gap-3"
                >
                  <Combobox
                    value={form.wing}
                    onChange={() => undefined}
                    options={
                      form.wing ? [{ label: form.wing, value: form.wing }] : []
                    }
                    width="w-full"
                    disabled
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  LabelText="Floor"
                  Important
                  ImportantSide="right"
                  className="w-full gap-3"
                >
                  <Combobox
                    value={form.floor}
                    onChange={() => undefined}
                    options={[
                      {
                        label:
                          form.floor === "0"
                            ? "Ground Floor"
                            : `${form.floor} Floor`,
                        value: form.floor,
                      },
                    ]}
                    width="w-full"
                    disabled
                  />
                </FormFieldWrapper>
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:gap-1">
                <FormFieldWrapper
                  LabelText={formType === "residential" ? "Flat No" : "Shop No"}
                  Important
                  ImportantSide="right"
                  className="w-full gap-3"
                >
                  <Combobox
                    value={form.unitNo}
                    onChange={() => undefined}
                    options={[{ label: form.unitNo, value: form.unitNo }]}
                    width="w-full"
                    disabled
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  LabelText="Configuration"
                  Important
                  ImportantSide="right"
                  className="w-full gap-3"
                >
                  <Input value={form.configuration} disabled />
                </FormFieldWrapper>
              </div>
            </div>
          </div>
          <FormFieldWrapper
            LabelText="Address"
            Important
            ImportantSide="right"
            className="gap-3"
          >
            <Textarea
              className="min-h-20"
              value={form.address}
              onChange={(event) => setField("address", event.target.value)}
              disabled={isSubmitting}
            />
          </FormFieldWrapper>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field("aadhaarNo", "Aadhaar Number")}
            {field("panNo", "PAN Number")}
          </div>
        </section>

        <section className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-medium">Payment Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormFieldWrapper
              LabelText="Amount"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <div className="flex gap-4">
                <Input
                  className="w-full"
                  type="number"
                  value={form.amount}
                  onChange={(event) => setField("amount", event.target.value)}
                  disabled={isSubmitting}
                />
                <Select
                  value={amountUnit.toString()}
                  onValueChange={(value) => setAmountUnit(Number(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Units</SelectLabel>
                      {budgetOptions.map((unit) => (
                        <SelectItem
                          key={unit.value}
                          value={unit.value.toString()}
                        >
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </FormFieldWrapper>
            <FormFieldWrapper
              LabelText="Deal Terms"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <Combobox
                value={form.charges}
                onChange={(value) => {
                  setField("charges", value);
                  if (value !== "Other") setField("dealTerms", value);
                }}
                options={chargesOptions}
                width="w-full"
              />
            </FormFieldWrapper>
            {formType === "residential" && (
              <FormFieldWrapper LabelText="Banks for loan" className="gap-3">
                <MultiSelect
                  defaultValue={form.banks}
                  options={bankOptions}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, banks: value }))
                  }
                  maxCount={2}
                />
              </FormFieldWrapper>
            )}
          </div>
          {form.charges === "Other" &&
            field("dealTerms", "Deal Terms", "text", true)}
          <FormFieldWrapper
            LabelText="Payment Terms"
            Important
            ImportantSide="right"
            className="gap-3"
          >
            <Textarea
              className="min-h-20"
              value={form.paymentTerms}
              onChange={(event) => setField("paymentTerms", event.target.value)}
              disabled={isSubmitting}
            />
          </FormFieldWrapper>
        </section>

        <section className="space-y-4 border-t pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium">Calculation Mode</h3>
              <p className="text-sm text-muted-foreground">
                Choose how the agreement value should be handled.
              </p>
            </div>
            <Select
              value={calculationMode}
              onValueChange={(value) =>
                setCalculationMode(value as "manual" | "automatic")
              }
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Mode</SelectLabel>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {calculationMode === "automatic" && dealBreakdown && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Agreement Value", dealBreakdown.agreementValue],
                ["Registration Charges", dealBreakdown.registrationCharges],
                ["Stamp Duty", dealBreakdown.stampDuty],
                ["GST", dealBreakdown.gst],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    ₹{Number(value).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-medium">Booking Information</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormFieldWrapper
              LabelText="Booking Date"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <DatePickerV2
                className="sm:w-full"
                defaultDate={form.bookingDate}
                onDateChange={(date) =>
                  setForm((current) => ({ ...current, bookingDate: date }))
                }
                disabled={isSubmitting}
              />
            </FormFieldWrapper>
            <FormFieldWrapper
              LabelText="Booking Amount"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <div className="flex gap-2">
                <Input
                  className="w-full"
                  type="number"
                  value={form.bookingAmt}
                  onChange={(event) =>
                    setField("bookingAmt", event.target.value)
                  }
                  disabled={isSubmitting}
                />
                <Select defaultValue="1" disabled>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Units</SelectLabel>
                      {budgetOptions.map((unit) => (
                        <SelectItem
                          key={unit.value}
                          value={unit.value.toString()}
                        >
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </FormFieldWrapper>
            {field("checkNo", "Cheque/Draft No", "text", true)}
            {field("bankName", "Bank Name", "text", true)}
            <FormFieldWrapper
              LabelText="Payment Date"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <DatePickerV2
                className="sm:w-full"
                defaultDate={form.paymentDate}
                onDateChange={(date) =>
                  setForm((current) => ({ ...current, paymentDate: date }))
                }
                disabled={isSubmitting}
              />
            </FormFieldWrapper>
            <FormFieldWrapper
              LabelText="Agreement Value"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <div className="flex gap-4">
                <Input
                  className="w-full"
                  type="number"
                  value={
                    calculationMode === "automatic"
                      ? (dealBreakdown?.agreementValue ?? 0)
                      : form.agreementValue
                  }
                  onChange={(event) =>
                    setField("agreementValue", event.target.value)
                  }
                  disabled={isSubmitting || calculationMode === "automatic"}
                />
                <Select defaultValue="1" disabled>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Units</SelectLabel>
                      {budgetOptions.map((unit) => (
                        <SelectItem
                          key={unit.value}
                          value={unit.value.toString()}
                        >
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </FormFieldWrapper>
            <FormFieldWrapper
              LabelText="Payment Type"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <Select
                value={form.paymentType}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    paymentType: value as RegenerateFormData["paymentType"],
                  }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
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
              LabelText="Sales Manager"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <Combobox
                value={form.salesManager}
                options={managerOptions}
                onChange={(value) => setField("salesManager", value)}
                width="w-full"
                disabled={isSubmitting}
              />
            </FormFieldWrapper>
            <FormFieldWrapper
              LabelText="Client Partner"
              Important
              ImportantSide="right"
              className="gap-3"
            >
              <Combobox
                value={form.clientPartner}
                options={referenceOptions}
                onChange={(value) => setField("clientPartner", value)}
                width="w-full"
                disabled={isSubmitting}
              />
            </FormFieldWrapper>
          </div>
        </section>
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileOutput className="mr-2 h-4 w-4" />
          )}
          Update & Regenerate PDF
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RegenerateBookingPdf;
