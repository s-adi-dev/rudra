export type projectStatus = "planning" | "under-construction" | "completed";
export type commercialUnitPlacementType = "projectLevel" | "wingLevel";

export interface ProjectType {
  _id?: string;
  name: string;
  by: string;
  location: string;
  email?: string;
  description: string;
  startDate: string;
  completionDate?: string;
  status: projectStatus;
  commercialUnitPlacement: commercialUnitPlacementType;
  wings: WingType[];
  commercialFloors?: FloorType[];
  projectStage: number;
  bank?: {
    holderName: string;
    accountNumber: string;
    name: string;
    branch: string;
    ifscCode: string;
    accountType: "saving" | "current";
  };
}

export interface WingType {
  _id?: string;
  projectId?: string; // Reference to parent project
  name: string; // e.g., "A Wing", "East Wing"
  commercialFloors?: FloorType[];
  floors: FloorType[];
  unitsPerFloor: number; // Maximum number of base units possible per floor
  headerFloorIndex: number; //Floor index that will be used as table header when creating a availability chart
}

export interface FloorType {
  _id?: string;
  wingId?: string; // Reference to parent wing
  projectId?: string; // Reference to parent project
  type: "residential" | "commercial"; // field to indicate floor type
  displayNumber: number; // The actual floor number as displayed (e.g., 2nd floor)
  showArea: boolean;
  units: UnitType[];
}

export interface UnitType {
  _id?: string;
  floorId?: string; // Reference to parent floor
  unitNumber: string; // The actual unit number displayed (e.g., "101", "A2")
  area: number; // Square footage
  configuration: string; // 1BHK, 2BHK, 3BHK, Shop, Office, etc.
  unitSpan: number; // Number of base units this unit spans (default is 1)
  status: string;
  reservedByOrReason?: string; // Stores customer name or amenity reason for unavailability
  referenceId?: string; // Reference to customer who booked this unit
}
