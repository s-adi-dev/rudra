import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useUpdateClientBooking } from "@/store/client-booking/query";
import {
  ClientBooking,
  ClientBookingCreateUpdateData,
} from "@/store/client-booking/types";
import { ignoreRole } from "@/store/data/options";
import { useUsersSummary } from "@/store/users";
import { formatAddress, splitAndFormatAmpersand } from "@/utils/func/strUtils";
import { formatZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { bookingUpdateSchema } from "@/utils/zod-schema/booking";
import { useEffect, useState } from "react";

interface BookingUpdateFormProps {
  booking: ClientBooking;
  isOpen: boolean;
  onOpenChange: (state: boolean) => void;
}

export const BookingUpdateForm = ({
  booking,
  isOpen,
  onOpenChange,
}: BookingUpdateFormProps) => {
  const [formData, setFormData] = useState<
    Partial<ClientBookingCreateUpdateData>
  >({});

  // Update form data whenever booking changes or dialog opens
  useEffect(() => {
    if (isOpen && booking) {
      setFormData({
        date: booking.date,
        registrationDate: booking.registrationDate || undefined,
        applicant: booking.applicant,
        coApplicant: booking.coApplicant || "",
        aadhaarNo: booking.aadhaarNo || "",
        panNo: booking.panNo || "",
        phoneNo: booking.phoneNo,
        altNo: booking.altNo || "",
        email: booking.email || "",
        address: booking.address || "",
        bookingAmt: booking.bookingAmt,
        agreementValue: booking.agreementValue || 0,
        dealTerms: booking.dealTerms,
        paymentTerms: booking.paymentTerms,
        salesManager: booking.salesManager,
        clientPartner: booking.clientPartner,
        paymentType: booking.paymentType,
      });
    }
  }, [booking, isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateBookingMutation = useUpdateClientBooking();
  const { data: users } = useUsersSummary();

  const managerOptions: ComboboxOption[] = [
    ...(users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || []),
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "bookingAmt" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleRegistrationDateChange = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      registrationDate: date,
    }));
  };

  const handleSave = async () => {
    const formattedData = {
      ...formData,
      coApplicant: splitAndFormatAmpersand(formData.coApplicant || ""),
      address: formatAddress(formData.address || ""),
    };
    const schemaValidation = bookingUpdateSchema.safeParse(formattedData);
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
      setIsSubmitting(true);
      await updateBookingMutation.mutateAsync({
        id: booking._id,
        updateData: formattedData,
      });
      toast({
        title: "Booking Updated",
        description: "The booking details have been successfully updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update booking:", error);
      const err = error as CustomAxiosError;
      toast({
        title: "Update Failed",
        description:
          err.response?.data.error ||
          "An unknown error occurred while updating the booking.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = () => {
    return Object.entries(formData).some(([key, value]) => {
      if (key === "bookingAmt") {
        return booking[key] !== value;
      }
      return booking[key as keyof ClientBooking] !== value;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] px-2">
        <DialogHeader className="space-y-2 px-4">
          <DialogTitle className="text-xl font-semibold">
            Update Booking Details
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Edit booking information for {booking.applicant} - {booking.project}
            , {booking.wing} {booking.unit.unitNumber}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(100svh-250px)] px-4">
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Field */}
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Booking Date"
                className="gap-3"
              >
                <DatePickerV2
                  defaultDate={
                    formData.date ? new Date(formData.date) : undefined
                  }
                  onDateChange={handleDateChange}
                  disabled={isSubmitting}
                  className="sm:w-full"
                  closeOnDayClick={true}
                />
              </FormFieldWrapper>

              {/* Registration Date Field */}
              {booking.status === "registered" && (
                <FormFieldWrapper
                  LabelText="Registration Date"
                  className="gap-3"
                >
                  <DatePickerV2
                    defaultDate={
                      formData.registrationDate
                        ? new Date(formData.registrationDate)
                        : undefined
                    }
                    onDateChange={handleRegistrationDateChange}
                    disabled={isSubmitting}
                    className="sm:w-full"
                    closeOnDayClick={true}
                  />
                </FormFieldWrapper>
              )}

              {/* Applicant Information */}
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Applicant Name"
                className="gap-3"
              >
                <Input
                  name="applicant"
                  value={formData.applicant || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Enter full name of primary applicant"
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Co-Applicant Name" className="gap-3">
                <Input
                  name="coApplicant"
                  value={formData.coApplicant || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Enter co-applicant name (if applicable)"
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Aadhaar Number" className="gap-3">
                <Input
                  name="aadhaarNo"
                  value={formData.aadhaarNo || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="e.g., 1234 5678 9012"
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="PAN Number" className="gap-3">
                <Input
                  name="panNo"
                  value={formData.panNo || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="e.g., ABCDE1234F"
                />
              </FormFieldWrapper>
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Phone Number"
                className="gap-3"
              >
                <Input
                  name="phoneNo"
                  value={formData.phoneNo || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="e.g., +1 (555) 123-4567"
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Alternate Number" className="gap-3">
                <Input
                  name="altNo"
                  value={formData.altNo || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Additional contact number"
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Email Address" className="gap-3">
                <Input
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  type="email"
                  placeholder="example@email.com"
                />
              </FormFieldWrapper>

              {/* Payment Type */}
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Payment Type"
                className="gap-3"
              >
                <Select
                  value={formData.paymentType || ""}
                  onValueChange={(value) =>
                    handleSelectChange("paymentType", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
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
                Important
                ImportantSide="right"
                LabelText="Booking Amount"
                className="gap-3"
              >
                <Input
                  name="bookingAmt"
                  value={formData.bookingAmt || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  type="number"
                  placeholder="Enter amount"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Agreement Value"
                className="gap-3"
              >
                <Input
                  name="agreementValue"
                  value={formData.agreementValue || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  type="number"
                  placeholder="Enter agreement value"
                />
              </FormFieldWrapper>

              {/* Client Partner */}
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Client Partner"
                className="gap-3"
              >
                <Input
                  name="clientPartner"
                  value={formData.clientPartner || ""}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  placeholder="Name of partner or agency"
                />
              </FormFieldWrapper>

              {/* Sales Manager */}
              <FormFieldWrapper
                Important
                ImportantSide="right"
                LabelText="Sales Manager"
                className="gap-3"
              >
                <Combobox
                  value={formData.salesManager!}
                  width="w-full"
                  onChange={(value: string) =>
                    handleSelectChange("salesManager", value)
                  }
                  placeholder="Select sales manager"
                  options={managerOptions}
                  disabled={isSubmitting}
                />
              </FormFieldWrapper>
            </div>

            {/* Address */}
            <FormFieldWrapper LabelText="Address" className="gap-3">
              <Textarea
                name="address"
                value={formData.address || ""}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                placeholder="Enter complete mailing address"
              />
            </FormFieldWrapper>

            {/* Deal Terms */}
            <FormFieldWrapper
              Important
              ImportantSide="right"
              LabelText="Deal Terms"
              className="gap-3"
            >
              <Textarea
                name="dealTerms"
                value={formData.dealTerms || ""}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                placeholder="Specify all terms and conditions of the deal"
              />
            </FormFieldWrapper>

            {/* Payment Terms */}
            <FormFieldWrapper
              Important
              ImportantSide="right"
              LabelText="Payment Terms"
              className="gap-3"
            >
              <Textarea
                name="paymentTerms"
                value={formData.paymentTerms || ""}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                placeholder="Detail payment schedule, installments, due dates, etc."
              />
            </FormFieldWrapper>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !hasChanges()}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
