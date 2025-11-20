import { z } from "zod";

// Payment type enum
const PaymentTypeEnum = z.enum(["regular-payment", "down-payment"]);

// Main FormData schema
export const FormDataSchema = z.object({
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date must be a valid date",
  }),

  eoiNumber: z
    .string({
      required_error: "EOI number is required",
    })
    .min(1, "EOI number is required")
    .regex(
      /^[A-Z0-9/-]+$/,
      "EOI number must contain only letters, numbers, and hyphens",
    ),

  project: z
    .string({
      required_error: "Project is required",
    })
    .min(1, "Project is required"),

  projectAddress: z
    .string({
      required_error: "Project address is required",
    })
    .min(1, "Project address is required")
    .min(10, "Project address must be at least 10 characters"),

  projectBy: z
    .string({
      required_error: "Project by is required",
    })
    .min(1, "Project by is required"),

  applicant: z
    .string({
      required_error: "Applicant name is required",
    })
    .min(1, "Applicant name is required")
    .min(2, "Applicant name must be at least 2 characters")
    .regex(
      /^[a-zA-Z\s]+$/,
      "Applicant name can only contain letters and spaces",
    ),

  coApplicant: z.string().optional(),

  phoneNo: z
    .string({
      required_error: "Phone number is required",
    })
    .min(1, "Phone number is required")
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),

  altNo: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), {
      message: "Alternate number must be exactly 10 digits",
    }),

  address: z
    .string({
      required_error: "Address is required",
    })
    .min(1, "Address is required"),

  wing: z
    .string({
      required_error: "Wing is required",
    })
    .min(1, "Wing is required"),

  floor: z
    .string({
      required_error: "Floor is required",
    })
    .min(1, "Floor is required"),

  unitId: z
    .string({
      required_error: "Unit ID is required",
    })
    .min(1, "Unit ID is required"),

  unitNo: z
    .string({
      required_error: "Unit number is required",
    })
    .min(1, "Unit number is required"),

  area: z
    .number({
      required_error: "Area is required",
      invalid_type_error: "Area must be a number",
    })
    .positive("Area must be a positive number")
    .min(1, "Area must be at least 1 sq ft"),

  configuration: z
    .string({
      required_error: "Configuration is required",
    })
    .min(1, "Configuration is required"),

  eoiDate: z.date().optional(),

  eoiAmt: z
    .number({
      required_error: "EOI amount is required",
      invalid_type_error: "EOI amount must be a number",
    })
    .nonnegative("EOI amount cannot be negative"),

  bookingAmt: z
    .number({
      required_error: "Booking amount is required",
      invalid_type_error: "Booking amount must be a number",
    })
    .positive("Booking amount must be a positive number"),

  tokenAmt: z
    .number({
      required_error: "Token amount is required",
      invalid_type_error: "Token amount must be a number",
    })
    .nonnegative("Token amount cannot be negative"),

  agreementValue: z
    .number({
      required_error: "Agreement value is required",
      invalid_type_error: "Agreement value must be a number",
    })
    .positive("Agreement value must be a positive number"),

  dealTerms: z
    .string({
      required_error: "Deal terms are required",
    })
    .min(1, "Deal terms are required")
    .min(5, "Deal terms must be at least 5 characters"),

  paymentTerms: z
    .string({
      required_error: "Payment terms are required",
    })
    .min(1, "Payment terms are required"),

  paymentMethod: z
    .string({
      required_error: "Payment method is required",
    })
    .min(1, "Payment method is required"),

  paymentType: PaymentTypeEnum,

  banks: z.array(
    z.string({
      invalid_type_error: "Bank must be a string",
    }),
  ),

  salesManager: z
    .string({
      required_error: "Sales manager is required",
    })
    .min(1, "Sales manager is required"),

  clientPartner: z
    .string({
      required_error: "Client partner is required",
    })
    .min(1, "Client partner is required"),
});

// Custom validation for business logic
export const EnhancedFormDataSchema = FormDataSchema.refine(
  (data) => data.tokenAmt <= data.bookingAmt,
  {
    message: "Token amount cannot exceed booking amount",
    path: ["tokenAmt"],
  },
)
  .refine((data) => data.eoiAmt <= data.bookingAmt, {
    message: "EOI amount cannot exceed booking amount",
    path: ["eoiAmt"],
  })
  .refine((data) => data.phoneNo !== data.altNo, {
    message: "Primary and alternate numbers cannot be the same",
    path: ["altNo"],
  });

// Type inference from schema
export type FormData = z.infer<typeof EnhancedFormDataSchema>;
export type PaymentType = z.infer<typeof PaymentTypeEnum>;

// Validation function
export const validateFormData = (data: unknown) => {
  return EnhancedFormDataSchema.safeParse(data);
};

// Partial validation for step-by-step form validation
export const PartialFormDataSchema = FormDataSchema.partial();

// Utility function to get field-specific validation
export const getFieldValidation = (field: keyof FormData) => {
  return FormDataSchema.shape[field];
};
