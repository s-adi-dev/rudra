export interface EoiType {
  _id: string;
  date: Date;
  applicant?: string | null;
  contact?: number | null;
  alt?: number | null;
  status?: string;
  config: string;
  eoiAmt: number;
  eoiNo: number;
  manager: string;
  cp?: string | null;
  pan?: string | null;
  aadhar?: number | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
