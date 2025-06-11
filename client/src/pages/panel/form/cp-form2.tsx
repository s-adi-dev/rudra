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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClientPartners } from "@/store/client-partner";
import { capitalizeWords, formatAddress } from "@/utils/func/strUtils";
import { formatZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import {
  ClientPartnerSchema,
  employeeSchema,
} from "@/utils/zod-schema/client-partner";
import {
  Building2,
  Check,
  Edit2,
  Globe,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

const generateCPId = (companyName: string): string => {
  const initials = companyName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const timestamp = Date.now().toString().slice(-6);

  return `CP-${initials}-${timestamp}`;
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  altNo: string;
  position: string;
  commissionPercentage: string;
}

export default function ClientPartnerForm() {
  const { toast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const { createClientPartnerMutation } = useClientPartners();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const defaultCompany = {
    name: "",
    ownerName: "",
    email: "",
    phoneNo: "",
    address: "",
    notes: "",
    companyWebsite: "",
  };

  const defaultEmployee: Omit<Employee, "id"> = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    altNo: "",
    position: "",
    commissionPercentage: "",
  };

  const [company, setCompany] = useState(defaultCompany);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] =
    useState<Omit<Employee, "id">>(defaultEmployee);

  const handleCompanyChange = (name: string, value: string) => {
    setCompany({
      ...company,
      [name]: value,
    });
  };

  const handleNewEmployeeChange = (name: string, value: string) => {
    setNewEmployee({
      ...newEmployee,
      [name]: value,
    });
  };

  const handleEmployeeEdit = (
    employeeId: string,
    name: string,
    value: string,
  ) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === employeeId ? { ...emp, [name]: value } : emp,
      ),
    );
  };

  const addEmployee = () => {
    // Basic validation for required fields
    if (
      !newEmployee.firstName.trim() ||
      !newEmployee.lastName.trim() ||
      !newEmployee.phoneNo.trim()
    ) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in First Name, Last Name, and Phone Number",
        variant: "warning",
      });
      return;
    }

    const validation = employeeSchema.safeParse(newEmployee);

    if (!validation.success) {
      const errorMessages = formatZodErrors(validation.error.errors);

      toast({
        title: "Employee Validation Error",
        description: `Please correct the following errors:\n${errorMessages}`,
        variant: "warning",
      });
      return;
    }

    const employee: Employee = {
      ...newEmployee,
      id: Date.now().toString(),
    };

    setEmployees([...employees, employee]);
    setNewEmployee(defaultEmployee);

    toast({
      title: "Employee Added",
      description: `${employee.firstName} ${employee.lastName} has been added to the list`,
    });
  };

  const removeEmployee = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    setEmployees(employees.filter((emp) => emp.id !== employeeId));

    if (employee) {
      toast({
        title: "Employee Removed",
        description: `${employee.firstName} ${employee.lastName} has been removed`,
      });
    }
  };

  const startEditing = (employeeId: string) => {
    setEditingEmployeeId(employeeId);
  };

  const stopEditing = () => {
    setEditingEmployeeId(null);
  };

  const handleSubmit = async () => {
    // Check if at least one employee exists
    if (employees.length === 0) {
      toast({
        title: "No Employees Added",
        description: "Please add at least one employee before submitting",
        variant: "warning",
      });
      return;
    }

    const formData = {
      company,
      employees: employees.map((emp) => ({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phoneNo: emp.phoneNo,
        altNo: emp.altNo,
        position: emp.position,
        commissionPercentage: emp.commissionPercentage,
      })),
    };

    const validation = ClientPartnerSchema.safeParse(formData);

    if (!validation.success) {
      const errorMessages = formatZodErrors(validation.error.errors);

      toast({
        title: "Form Validation Error",
        description: `Please correct the following errors:\n${errorMessages}`,
        variant: "warning",
      });
      return;
    }

    const formattedData = {
      cpId: generateCPId(company.name),
      name: company.name,
      ownerName: company.ownerName,
      email: company.email,
      phoneNo: company.phoneNo,
      address: formatAddress(company.address),
      notes: company.notes,
      website: company.companyWebsite,
      employees: employees.map((emp) => ({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phoneNo: emp.phoneNo,
        altNo: emp.altNo,
        position: emp.position,
        commissionPercentage: emp.commissionPercentage
          ? parseFloat(emp.commissionPercentage)
          : 0,
      })),
    };

    try {
      setIsSubmitting(true);
      await createClientPartnerMutation.mutateAsync(formattedData);

      toast({
        title: "Success",
        description: "Client Partner created successfully",
        variant: "success",
      });

      setCompany(defaultCompany);
      setEmployees([]);
      setNewEmployee(defaultEmployee);
      setIsSubmitting(false);
    } catch (error) {
      const Err = error as CustomAxiosError;
      if (Err.response?.data.error) {
        toast({
          title: "Error occurred",
          description: `Failed to create client partner. ${Err.response?.data.error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error occurred",
          description: "Failed to create client partner. Please try again.",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-0 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Enter the client partner company details
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldWrapper
                  LabelText="Company Name"
                  Important
                  ImportantSide="right"
                >
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. TechCorp Pvt Ltd"
                    ref={nameRef}
                    value={company.name}
                    onChange={(e) =>
                      handleCompanyChange(
                        e.target.name,
                        e.target.value.toUpperCase(),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && e.shiftKey) {
                        e.preventDefault();
                        submitRef.current?.focus();
                      }
                    }}
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  LabelText="Owner Name"
                  Important
                  ImportantSide="right"
                >
                  <Input
                    id="ownerName"
                    name="ownerName"
                    placeholder="e.g. John Doe"
                    value={company.ownerName}
                    onChange={(e) =>
                      handleCompanyChange(
                        e.target.name,
                        capitalizeWords(e.target.value),
                      )
                    }
                  />
                </FormFieldWrapper>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldWrapper LabelText="Email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={company.email}
                    onChange={(e) =>
                      handleCompanyChange(
                        e.target.name,
                        e.target.value.toLowerCase(),
                      )
                    }
                  />
                </FormFieldWrapper>
                <FormFieldWrapper
                  LabelText="Phone Number"
                  Important
                  ImportantSide="right"
                >
                  <Input
                    id="phoneNo"
                    name="phoneNo"
                    placeholder="Contact"
                    value={company.phoneNo}
                    onChange={(e) =>
                      handleCompanyChange(e.target.name, e.target.value)
                    }
                  />
                </FormFieldWrapper>
              </div>

              <FormFieldWrapper LabelText="Website">
                <div className="flex">
                  <div className="p-2 flex items-center rounded-l-md border border-r-0">
                    <Globe className="h-4 w-4 text-foreground" />
                  </div>
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    placeholder="e.g. www.company-name.com"
                    value={company.companyWebsite}
                    className="rounded-l-none"
                    onChange={(e) =>
                      handleCompanyChange(
                        e.target.name,
                        e.target.value.toLowerCase(),
                      )
                    }
                  />
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Address">
                <Textarea
                  id="address"
                  name="address"
                  className="h-20"
                  placeholder="e.g. 123 Main Street, Anytown, State, 12345"
                  value={company.address}
                  onChange={(e) =>
                    handleCompanyChange(e.target.name, e.target.value)
                  }
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Notes">
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional info about the company"
                  value={company.notes}
                  onChange={(e) =>
                    handleCompanyChange(e.target.name, e.target.value)
                  }
                />
              </FormFieldWrapper>
            </div>
          </CardContent>
        </Card>

        {/* Add Employee Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Add Employee
            </CardTitle>
            <CardDescription>Add employee details one by one</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <FormFieldWrapper
                LabelText="Name"
                Important
                ImportantSide="right"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="First Name"
                    value={newEmployee.firstName}
                    onChange={(e) =>
                      handleNewEmployeeChange(
                        e.target.name,
                        capitalizeWords(e.target.value),
                      )
                    }
                  />
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Last Name"
                    value={newEmployee.lastName}
                    onChange={(e) =>
                      handleNewEmployeeChange(
                        e.target.name,
                        capitalizeWords(e.target.value),
                      )
                    }
                  />
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Email">
                <Input
                  id="empEmail"
                  name="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={newEmployee.email}
                  onChange={(e) =>
                    handleNewEmployeeChange(
                      e.target.name,
                      e.target.value.toLowerCase(),
                    )
                  }
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                LabelText="Phone Number"
                Important
                ImportantSide="right"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="empPhoneNo"
                    name="phoneNo"
                    placeholder="Primary Number"
                    value={newEmployee.phoneNo}
                    onChange={(e) =>
                      handleNewEmployeeChange(e.target.name, e.target.value)
                    }
                  />
                  <Input
                    id="altNo"
                    name="altNo"
                    placeholder="Alt Number (optional)"
                    value={newEmployee.altNo}
                    onChange={(e) =>
                      handleNewEmployeeChange(e.target.name, e.target.value)
                    }
                  />
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Position">
                <Input
                  id="position"
                  name="position"
                  placeholder="e.g. Sales Manager"
                  value={newEmployee.position}
                  onChange={(e) =>
                    handleNewEmployeeChange(
                      e.target.name,
                      capitalizeWords(e.target.value),
                    )
                  }
                />
              </FormFieldWrapper>

              <FormFieldWrapper LabelText="Commission Percentage">
                <Input
                  id="commissionPercentage"
                  name="commissionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 5"
                  value={newEmployee.commissionPercentage}
                  onChange={(e) =>
                    handleNewEmployeeChange(e.target.name, e.target.value)
                  }
                />
              </FormFieldWrapper>

              <Button
                type="button"
                onClick={addEmployee}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees List */}
      {employees.length > 0 && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Employees ({employees.length})
            </CardTitle>
            <CardDescription>
              Manage the list of employees for this client partner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  {editingEmployeeId === employee.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Edit Employee</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={stopEditing}
                            variant="outline"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={stopEditing}
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="First Name"
                          value={employee.firstName}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "firstName",
                              capitalizeWords(e.target.value),
                            )
                          }
                        />
                        <Input
                          placeholder="Last Name"
                          value={employee.lastName}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "lastName",
                              capitalizeWords(e.target.value),
                            )
                          }
                        />
                        <Input
                          placeholder="Email"
                          type="email"
                          value={employee.email}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "email",
                              e.target.value.toLowerCase(),
                            )
                          }
                        />
                        <Input
                          placeholder="Phone Number"
                          value={employee.phoneNo}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "phoneNo",
                              e.target.value,
                            )
                          }
                        />
                        <Input
                          placeholder="Alt Number"
                          value={employee.altNo}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "altNo",
                              e.target.value,
                            )
                          }
                        />
                        <Input
                          placeholder="Position"
                          value={employee.position}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "position",
                              capitalizeWords(e.target.value),
                            )
                          }
                        />
                        <Input
                          placeholder="Commission %"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={employee.commissionPercentage}
                          onChange={(e) =>
                            handleEmployeeEdit(
                              employee.id,
                              "commissionPercentage",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.position}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">{employee.email}</p>
                          <p className="text-sm">{employee.phoneNo}</p>
                          {employee.altNo && (
                            <p className="text-sm text-muted-foreground">
                              Alt: {employee.altNo}
                            </p>
                          )}
                        </div>
                        <div>
                          {employee.commissionPercentage && (
                            <p className="text-sm">
                              Commission: {employee.commissionPercentage}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(employee.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeEmployee(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-end space-x-4">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || employees.length === 0}
          ref={submitRef}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              nameRef.current?.focus();
            }
          }}
        >
          Add Channel Partner{" "}
          {employees.length > 0 && `(${employees.length} employees)`}
        </Button>
      </div>
    </div>
  );
}
