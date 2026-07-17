import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { DatePicker } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { ClientType, useClients, VisitType } from "@/store/client";
import { useClientPartners } from "@/store/client-partner";
import {
  budgetOptions,
  customReferenceOptions,
  ignoreRole,
  refDefaultOptions,
  requirementOptions,
  statusOptions,
} from "@/store/data/options";
import { useInventory } from "@/store/inventory";
import { useUsersSummary } from "@/store/users";
import {
  capitalizeWords,
  formatAddress,
  toProperCase,
} from "@/utils/func/strUtils";
import { peekZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { ClientSchema } from "@/utils/zod-schema/client";
import { User } from "lucide-react";
import { useRef, useState } from "react";

interface ClientData extends Omit<ClientType, "_id" | "visits"> {
  visitData: Omit<VisitType, "client" | "_id" | "date"> & {
    date: undefined | Date;
  };
}

const ClientForm = () => {
  const defaultClient: ClientData = {
    firstName: "",
    lastName: "",
    occupation: "",
    email: "",
    phoneNo: "",
    altNo: "",
    address: "",
    note: "",
    project: "",
    requirement: "",
    budget: 0,
    visitData: {
      date: undefined,
      reference: "",
      otherRefs: "",
      source: "",
      relation: "",
      closing: "",
      status: null,
      remarks: [],
    },
  };
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [budgetUnit, setBudgetUnit] = useState<number>(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarkInput, setRemarkInput] = useState("");
  const { createClientMutation } = useClients();
  const { useReference } = useClientPartners();
  const { useProjectsStructure } = useInventory();
  const { data: projectsData } = useProjectsStructure();
  const { toast } = useToast();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const { data: users } = useUsersSummary({ includeDeleted: false });
  const { data: refData } = useReference();

  const projectOptions = [{ label: "N/A", value: "N/A" }].concat(
    projectsData?.data?.map((p) => ({ label: p.name, value: p.name! })) || [],
  );

  const managerOptions = [
    { label: "N/A", value: "N/A" },
    { label: "BANM", value: "BANM" },
  ].concat(
    users
      ?.filter((user) => !user.roles.some((role) => ignoreRole.includes(role)))
      .map((user) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.username,
      })) || [],
  );

  const refDynamicOptions: ComboboxOption[] =
    refData?.references?.map((ref) => ({
      label: `${ref.firstName} ${ref.lastName}${ref.companyName ? ` (${ref.companyName})` : ""}`,
      value: ref._id,
    })) || [];

  const referenceOptions: ComboboxOption[] = [
    ...refDefaultOptions,
    { label: "BANM", value: "BANM" },
    ...customReferenceOptions.map((opt) => {
      return { label: toProperCase(opt), value: opt };
    }),
    ...refDynamicOptions,
  ];

  // Define a type that represents all possible field paths including nested ones
  type ClientFieldPath =
    | keyof ClientData
    | `visitData.${keyof Omit<VisitType, "client">}`;

  function handleInputChange(
    field: ClientFieldPath,
    value: string | number | Date,
  ) {
    if (field.includes(".")) {
      // Handle nested property
      const [parent, child] = field.split(".");

      if (parent === "visitData") {
        setClient({
          ...client,
          visitData: {
            ...client.visitData,
            [child]: value,
          } as Omit<VisitType, "client">,
        });
      }
    } else {
      // Handle top-level property (type assertion needed here)
      setClient({
        ...client,
        [field as keyof ClientData]: value,
      });
    }
  }

  function handleUnitChange(unit: string) {
    setBudgetUnit(Number(unit));
  }

  function handleRemarkChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRemarkInput(e.target.value);
  }

  async function handleSubmit() {
    console.log("Client Form");
    // Prepare data for validation
    const clientData = {
      ...client,
      // Make sure budget is a number, not a string
      budget:
        typeof client.budget === "string"
          ? parseFloat(client.budget) * budgetUnit
          : client.budget * budgetUnit,
      address: client.address ? formatAddress(client.address) : client.address,
      // Handle null fields in visitData
      visitData: {
        ...client.visitData,
        // Ensure status is properly set
        status: client.visitData.status || null,

        // Add remark only if it's not empty
        remarks: remarkInput.trim()
          ? [{ remark: remarkInput, date: client.visitData.date }]
          : client.visitData.remarks,
      },
    };

    const validation = ClientSchema.safeParse(clientData);

    if (!validation.success) {
      const errorMessages = peekZodErrors(validation.error.errors);

      toast({
        title: "Form Validation Error",
        description: `Please correct the following errors:\n${errorMessages}`,
        variant: "warning",
      });
      return;
    }

    const hasStatus = !!validation.data.visitData.status;

    if (!hasStatus) {
      return toast({
        title: "Form Validation Error",
        description: `Please select a visit status before submitting.`,
        variant: "warning",
      });
    }

    // Actual client creation logic goes here
    try {
      setIsSubmitting(true);
      await createClientMutation.mutateAsync(validation.data);
      toast({
        title: "Success",
        description: "Client created successfully",
        variant: "success",
      });

      setClient(defaultClient);
      setRemarkInput("");
      setIsSubmitting(false);
    } catch (error) {
      const Err = error as CustomAxiosError;
      if (Err.response?.data.error) {
        toast({
          title: "Error occurred",
          description: `Failed to create client. ${Err.response?.data.error}`,
          variant: "destructive",
        });
      } else
        toast({
          title: "Error occurred",
          description: "Failed to create client. Please try again.",
          variant: "destructive",
        });

      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-5 w-5" />
          Client Registration Form
        </CardTitle>
        <CardDescription>
          Enter client details and visit information
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Client Information Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Client Information</h3>

            {/* Client Details - Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* First Column */}
              <div className="space-y-4">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Name"
                  Important
                  ImportantSide="right"
                >
                  <div className="flex flex-col sm:flex-row gap-4 grow">
                    <Input
                      ref={firstNameRef}
                      value={client.firstName}
                      onChange={(e) =>
                        handleInputChange(
                          "firstName",
                          capitalizeWords(e.target.value),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Tab" && e.shiftKey) {
                          e.preventDefault();
                          submitRef.current?.focus();
                        }
                      }}
                      placeholder="First Name"
                    />
                    <Input
                      value={client.lastName}
                      onChange={(e) =>
                        handleInputChange(
                          "lastName",
                          capitalizeWords(e.target.value),
                        )
                      }
                      placeholder="LastName Name"
                    />
                  </div>
                </FormFieldWrapper>

                <FormFieldWrapper className="gap-3" LabelText="Occupation">
                  <Input
                    value={client.occupation}
                    onChange={(e) =>
                      handleInputChange(
                        "occupation",
                        capitalizeWords(e.target.value),
                      )
                    }
                    placeholder="Software Engineer"
                  />
                </FormFieldWrapper>

                <FormFieldWrapper className="gap-3" LabelText="Email">
                  <Input
                    value={client.email}
                    onChange={(e) =>
                      handleInputChange("email", e.target.value.toLowerCase())
                    }
                    placeholder="john.doe@example.com"
                  />
                </FormFieldWrapper>
              </div>

              {/* Second Column */}
              <div className="space-y-4 flex flex-col">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Phone Number"
                  Important
                  ImportantSide="right"
                >
                  <div className="flex flex-col sm:flex-row gap-4 grow">
                    <Input
                      value={client.phoneNo}
                      onChange={(e) =>
                        handleInputChange("phoneNo", e.target.value.trim())
                      }
                      placeholder="Primary Number"
                    />
                    <Input
                      value={client.altNo}
                      onChange={(e) =>
                        handleInputChange("altNo", e.target.value.trim())
                      }
                      placeholder="Alt Number (optional)"
                    />
                  </div>
                </FormFieldWrapper>
                <FormFieldWrapper className="gap-3 flex-grow" LabelText="Notes">
                  <Textarea
                    className="h-full lg:resize-none"
                    value={client.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    placeholder="Additional notes about the client"
                  />
                </FormFieldWrapper>
              </div>

              {/* Third Column */}
              <div className="space-y-4">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Project"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={projectOptions}
                    value={client.project}
                    onChange={(e) => handleInputChange("project", e)}
                    placeholder="Select project"
                    emptyMessage="No project found"
                    width="w-full"
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Requirement"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={requirementOptions}
                    value={client.requirement}
                    onChange={(e) => handleInputChange("requirement", e)}
                    placeholder="Select requirement"
                    emptyMessage="No requirement found"
                    width="w-full"
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Budget"
                  Important
                  ImportantSide="right"
                >
                  <div className="flex flex-col sm:flex-row gap-4 grow">
                    <Input
                      value={client.budget}
                      onChange={(e) =>
                        handleInputChange(
                          "budget",
                          Number(e.target.value) ? Number(e.target.value) : 0,
                        )
                      }
                      placeholder="0"
                    />
                    <Select
                      value={budgetUnit.toString()}
                      onValueChange={handleUnitChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Budget Units" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Units</SelectLabel>
                          {budgetOptions.map((unit, index) => {
                            return (
                              <SelectItem
                                value={unit.value.toString()}
                                key={index}
                              >
                                {unit.label}
                              </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </FormFieldWrapper>
              </div>
            </div>

            {/* Address - Full Width */}
            <FormFieldWrapper className="gap-3" LabelText="Address">
              <Textarea
                className="min-h-20"
                value={client.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="123 Main Street, Anytown, State, 12345"
              />
            </FormFieldWrapper>
          </div>

          {/* Visit Information Section */}
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-medium">Visit Information</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* First Column */}
              <div className="space-y-4">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Date"
                  Important
                  ImportantSide="right"
                >
                  <DatePicker
                    className="w-full"
                    defaultDate={client.visitData?.date}
                    onDateChange={(e) => handleInputChange("visitData.date", e)}
                    disableDates="future"
                    closeOnDayClick
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Reference"
                  Important
                  ImportantSide="right"
                >
                  <div className="flex flex-col lg:flex-row gap-2">
                    <Combobox
                      options={referenceOptions}
                      value={client.visitData?.reference ?? ""}
                      onChange={(e) =>
                        handleInputChange("visitData.reference", e)
                      }
                      width="w-full"
                      placeholder="Select reference"
                      emptyMessage="No reference found"
                    />
                    {customReferenceOptions.includes(
                      client.visitData?.reference,
                    ) && (
                      <Input
                        placeholder="Enter reference"
                        value={client.visitData.otherRefs}
                        onChange={(e) =>
                          handleInputChange(
                            "visitData.otherRefs",
                            e.target.value,
                          )
                        }
                      />
                    )}
                  </div>
                </FormFieldWrapper>
              </div>

              {/* Second Column */}
              <div className="space-y-4">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Source"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={managerOptions}
                    value={client.visitData?.source ?? ""}
                    onChange={(e) => handleInputChange("visitData.source", e)}
                    width="w-full"
                    placeholder="Select source"
                    emptyMessage="No source manager found"
                  />
                </FormFieldWrapper>

                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Relation"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={managerOptions}
                    value={client.visitData?.relation ?? ""}
                    onChange={(e) => handleInputChange("visitData.relation", e)}
                    width="w-full"
                    placeholder="Select relation"
                    emptyMessage="No relation manager found"
                  />
                </FormFieldWrapper>
              </div>

              {/* Third Column */}
              <div className="space-y-4">
                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Closing"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={managerOptions}
                    value={client.visitData?.closing ?? ""}
                    onChange={(e) => handleInputChange("visitData.closing", e)}
                    width="w-full"
                    placeholder="Select closing"
                    emptyMessage="No closing manager found"
                  />
                </FormFieldWrapper>

                <FormFieldWrapper
                  className="gap-3"
                  LabelText="Status"
                  Important
                  ImportantSide="right"
                >
                  <Combobox
                    options={statusOptions}
                    value={client.visitData?.status ?? ""}
                    onChange={(e) => handleInputChange("visitData.status", e)}
                    placeholder="Select status"
                    emptyMessage="No status found"
                    width="w-full"
                  />
                </FormFieldWrapper>
              </div>
            </div>
            <FormFieldWrapper LabelText="Remark">
              <Textarea
                value={remarkInput}
                onChange={handleRemarkChange}
                placeholder="Client remarks (Optional)"
              />
            </FormFieldWrapper>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              disabled={isSubmitting}
              type="submit"
              ref={submitRef}
              onClick={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault(); // prevent natural tabbing
                  firstNameRef.current?.focus();
                }
              }}
            >
              Save Client Information
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientForm;
