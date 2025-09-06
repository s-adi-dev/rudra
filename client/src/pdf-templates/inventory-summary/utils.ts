import { FloorType, ProjectType, UnitType, WingType } from "@/store/inventory";

// Constants
export const STATUS_COLORS: Record<Exclude<string, "others">, string> = {
  available: "#ffffff", // White
  reserved: "#fff085", // Muted Green
  booked: "#ffba00", // Yellow
  registered: "#bbf451", // Light Green
  canceled: "#fb2c36", // Red
  investor: "#8aadf4", // Light Blue
  "not-for-sale": "#f5a97f", // Peach
};

export const ALL_UNIT_STATUSES: Array<Exclude<string, "others">> = [
  "available",
  "canceled",
  "booked",
  "registered",
  "reserved",
  "investor",
  "not-for-sale",
];

// Helper functions
export const getStatusColor = (status: Exclude<string, "others">): string =>
  STATUS_COLORS[status] || "#64748B";

export const collectAllUnits = (project: ProjectType): UnitType[] => {
  const allUnits: UnitType[] = [];

  // Units from wings
  project.wings.forEach((wing: WingType) => {
    // Residential floors
    allUnits.push(...wing.floors.flatMap((floor) => floor.units));

    // Wing-level commercial floors
    if (wing.commercialFloors?.length) {
      allUnits.push(...wing.commercialFloors.flatMap((floor) => floor.units));
    }
  });

  // Project-level commercial floors
  if (project.commercialFloors?.length) {
    allUnits.push(
      ...project.commercialFloors.flatMap((floor: FloorType) => floor.units),
    );
  }

  // Filter out "not-for-sale" units
  return allUnits.filter((unit) => unit.status !== "others");
};

export const calculateStatusCounts = (
  units: UnitType[],
): Record<Exclude<string, "others">, number> => {
  const counts: Partial<Record<Exclude<string, "others">, number>> = {};

  ALL_UNIT_STATUSES.forEach((status) => {
    counts[status] = units.filter(
      (unit: UnitType) => unit.status === status,
    ).length;
  });

  return counts as Record<Exclude<string, "others">, number>;
};

export const calculatePercentages = (
  counts: Record<Exclude<string, "others">, number>,
  total: number,
): Record<Exclude<string, "others">, string> => {
  const percentages: Partial<Record<Exclude<string, "others">, string>> = {};

  ALL_UNIT_STATUSES.forEach((status) => {
    percentages[status] =
      total > 0 ? ((counts[status] / total) * 100).toFixed(1) + "%" : "0%";
  });

  return percentages as Record<Exclude<string, "others">, string>;
};
