// Type for a single client booking
export type bookingClientStatus =
  | "booked"
  | "cnc"
  | "registeration-process"
  | "loan-process"
  | "registered"
  | "canceled";

export interface ClientBooking {
  _id: string;
  date: Date;
  registrationDate?: Date | null;
  applicant: string;
  coApplicant?: string;
  aadhaarNo?: string;
  panNo?: string;
  status: bookingClientStatus;
  project: string;
  wing?: string;
  floor: string;
  unit: {
    _id: string;
    unitNumber: string;
    area: string;
    configuration: string;
  };
  phoneNo: string;
  altNo?: string;
  email?: string;
  address?: string;
  paymentType: "regular-payment" | "down-payment";
  paymentStatus: string;
  bookingAmt: number;
  dealTerms: string;
  paymentTerms: string;
  agreementValue: number;
  salesManager: string;
  clientPartner: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type for paginated booking response
export interface ClientBookingPaginatedResponse {
  success: boolean;
  total: number;
  totalPages: number;
  currentPage: number;
  limitNumber: number;
  data: ClientBooking[];
}

// Type for single booking response
export interface ClientBookingResponse {
  success: boolean;
  data: ClientBooking;
}

// Type for booking creation/update
export interface ClientBookingCreateUpdateData {
  date?: Date;
  registrationDate?: Date | null;
  applicant: string;
  coApplicant?: string;
  aadhaarNo?: string;
  panNo?: string;
  status: bookingClientStatus;
  project: string;
  wing?: string;
  floor: string;
  unit: string; // Unit ID
  phoneNo: string;
  altNo?: string;
  email?: string;
  address?: string;
  paymentType: "regular-payment" | "down-payment";
  paymentStatus: string;
  bookingAmt: number;
  agreementValue: number;
  dealTerms: string;
  paymentTerms: string;
  salesManager: string;
  clientPartner: string; // ClientPartner ID
}
