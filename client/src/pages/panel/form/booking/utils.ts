import { aadhaarSchema, panSchema } from "@/utils/zod-schema/utils";
import { z } from "zod";
import { calculationsType } from "./booking-pdf";

// Define a discriminated union for the unit based on type
const FlatUnitSchema = z.object({
  wing: z.string().min(1, "Wing required"),
  floor: z.string().min(1, "Floor required"),
  unitNo: z.string().min(1, "Flat no required"),
  configuration: z.string().min(1, "Configuration required"),
});

const ShopUnitSchema = z.object({
  area: z.number().min(1, "Area required"),
  floor: z.string().min(1, "Floor required"),
  unitNo: z.string().min(1, "Shop no required"),
  configuration: z.string().min(1, "Configuration required"),
});

// Create a discriminated union based on type
const BookingSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("residential"),
    // Project Information
    project: z.object({
      name: z.string().min(1, "Project name required"),
      by: z.string().min(1, "Builder name required"),
      address: z.string().min(1, "Project address required"),
    }),
    // Unit Information for Flat
    unit: FlatUnitSchema,
    // Booking Details
    payment: z.object({
      amount: z.number().min(1, "Amount required"),
      includedChargesNote: z.string().min(1, "Included charges note required"),
      banks: z.array(z.string()).optional(), // Optional list of acceptable banks
      paymentTerms: z.string().min(1, "Payment terms required"),
    }),
    // Applicant Information
    applicants: z.object({
      primary: z.string().min(1, "Primary applicant required"),
      coApplicant: z.string().optional(),
      contact: z.object({
        phoneNo: z
          .string()
          .regex(/^\d{10}$/, { message: "Phone number must be 10 digits" }),
        email: z.string().optional(),
        address: z.string().min(1, "Address required"),
        residenceNo: z.string().optional(),
      }),
      aadhaarNo: aadhaarSchema.optional(),
      panNo: panSchema.optional(),
    }),
    // Payment Information
    bookingDetails: z.object({
      date: z.date({ required_error: "Booking date required" }),
      bookingAmt: z.number().min(1, "Booking amount required"),
      checkNo: z.string().min(1, "Check number required"),
      bankName: z.string().min(1, "Bank name required"),
      paymentDate: z.date({ required_error: "Payment date required" }),
    }),
  }),
  z.object({
    type: z.literal("commercial"),
    // Project Information
    project: z.object({
      name: z.string().min(1, "Project name required"),
      by: z.string().min(1, "Builder name required"),
      address: z.string().min(1, "Project address required"),
    }),
    // Unit Information for Shop
    unit: ShopUnitSchema,
    // Booking Details
    payment: z.object({
      amount: z.number().min(1, "Amount required"),
      includedChargesNote: z.string().min(1, "Included charges note required"),
      banks: z.array(z.string()).optional(), // Optional for shops
      paymentTerms: z.string().min(1, "Payment terms required"),
    }),
    // Applicant Information
    applicants: z.object({
      primary: z.string().min(1, "Primary applicant required"),
      coApplicant: z.string().optional(),
      contact: z.object({
        phoneNo: z.string().min(1, "Phone number required"),
        email: z.string().optional(),
        address: z.string().min(1, "Address required"),
        residenceNo: z.string().optional(),
      }),
      aadhaarNo: aadhaarSchema.optional(),
      panNo: panSchema.optional(),
    }),
    // Payment Information
    bookingDetails: z.object({
      date: z.date({ required_error: "Booking date required" }),
      bookingAmt: z.number().min(1, "Booking amount required"),
      checkNo: z.string().min(1, "Check number required"),
      bankName: z.string().min(1, "Bank name required"),
      paymentDate: z.date({ required_error: "Payment date required" }),
    }),
  }),
]);

export { BookingSchema };

export interface BookingType {
  type: "residential" | "commercial";
  // Project Information
  project: {
    name: string;
    by: string;
    address: string;
  };
  // Unit Information
  unit: {
    wing?: string;
    floor: string;
    unitNo: string;
    configuration: string;
    area?: number;
  };
  // Booking Details
  payment: {
    amount: number;
    includedChargesNote: string;
    banks?: string[]; // List of acceptable banks
    paymentTerms: string;
  };
  // Applicant Information
  applicants: {
    primary: string;
    coApplicant?: string;
    contact: {
      phoneNo: string;
      email?: string;
      address: string;
      residenceNo?: string;
    };
    aadhaarNo?: string;
    panNo?: string;
  };
  // Payment Information
  bookingDetails: {
    date: Date;
    bookingAmt: number;
    checkNo: string;
    bankName: string;
    paymentDate: Date;
    av: number;
  };
}

export const ProjectList = [
  {
    name: "Rudra Kristina",
    by: "Sai Lifespaces",
    address:
      "Survey 2/3, Koynawele, RTO Road, Taloja-II, Panvel, Dist. Raigad-410208",
  },
  {
    name: "Rudra Kristina - II",
    by: "Sai Realty",
    address:
      "Survey 2/4/A & 2/4/B, Koynawele, RTO Road, Taloja-II, Panvel, Dist. Raigad-410208",
  },
  {
    name: "Rudra Kristina - III",
    by: "Om Sai Infra",
    address:
      "Survey 2/2/A & 2/2/B, Koynawele, RTO Road, Taloja-II, Panvel, Dist. Raigad-410208",
  },
  {
    name: "Rudra Kristina - IV",
    by: "Sai Kripa",
    address:
      "Survey 2/2/C & 2/2/D, Koynawele, RTO Road, Taloja-II, Panvel, Dist. Raigad-410208",
  },
  {
    name: "Rudra Kristina - VII",
    by: "Sai Kripa",
    address:
      "Survey 6/2, Koynawele, RTO Road, Taloja-II, Panvel, Dist. Raigad-410208",
  },
  {
    name: "Rudra Dream City",
    by: "Sai Ashirwad",
    address: "Survey 9/5, Pisarve, Taloja Phase-I, Near Metro Station - 410208",
  },
];

export const FlatChargesNoteList = [
  "Extra Taxes & Parking",
  "Including Taxes without Parking",
  "Including Taxes with Stilt Parking",
  "Including Taxes with Open Parking",
  "Other",
];

export const ShopChargesNoteList = ["Extra Taxes", "Including Taxes", "Other"];

export function calculateDealBreakdown(dealAmount: number): calculationsType {
  const registrationCharges = Math.round(Math.min(30000, dealAmount * 0.01));
  const netAmount = Math.round(dealAmount - registrationCharges);
  const agreementValue = Math.round(netAmount / 1.08);
  const stampDuty = Math.round(agreementValue * 0.07);
  const gst = Math.round(agreementValue * 0.01);

  return {
    agreementValue,
    registrationCharges,
    stampDuty,
    gst,
  };
}
