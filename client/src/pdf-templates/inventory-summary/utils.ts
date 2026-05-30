import { FloorType, ProjectType, UnitType, WingType } from "@/store/inventory";
import { InventoryCategoryType } from "@/store/category";

// Helper function to get status color from categories
export const getStatusColor = (
  status: string,
  categories: InventoryCategoryType[],
): string => {
  const found = categories.find((c) => c.name === status);
  return found?.colorHex || "#64748B";
};

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
  statuses: string[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  statuses.forEach((status) => {
    counts[status] = units.filter(
      (unit: UnitType) => unit.status === status,
    ).length;
  });

  return counts;
};

export const calculatePercentages = (
  counts: Record<string, number>,
  total: number,
): Record<string, string> => {
  const percentages: Record<string, string> = {};

  Object.keys(counts).forEach((status) => {
    percentages[status] =
      total > 0 ? ((counts[status] / total) * 100).toFixed(1) + "%" : "0%";
  });

  return percentages;
};

/**
 * Dynamically collect unique statuses from a project
 * Filters out "others" status
 */
export const collectStatusesFromProject = (project: ProjectType): string[] => {
  const statuses = new Set<string>();

  const allUnits = collectAllUnits(project);
  allUnits.forEach((unit) => {
    if (unit.status && unit.status !== "others") {
      statuses.add(unit.status);
    }
  });

  // Sort statuses alphabetically
  return [...statuses].sort((a, b) => a.localeCompare(b));
};

/**
 * Calculate dynamic header font size based on number of statuses
 * More statuses = slightly smaller font to prevent text wrapping
 * But always keeps it proportional to content cells
 */
export const calculateHeaderFontSize = (statusCount: number): number => {
  if (statusCount <= 3) return 10;
  if (statusCount <= 5) return 9.5;
  if (statusCount <= 7) return 9;
  return 8.5;
};

/**
 * Calculate dynamic header padding based on number of statuses
 * Reduces padding slightly when many statuses to prevent wrapping
 */
export const calculateHeaderPadding = (statusCount: number): number => {
  if (statusCount <= 5) return 10;
  if (statusCount <= 7) return 8;
  return 6;
};

/**
 * Get abbreviated header text for status
 * Only abbreviate when necessary (long names)
 */
export const getStatusHeaderAbbreviation = (status: string): string => {
  const abbreviations: Record<string, string> = {
    "not-for-sale": "N.F.S",
    "self-funding": "S.F",
    registered: "Reg",
  };

  const lower = status.toLowerCase();
  if (abbreviations[lower]) {
    return abbreviations[lower];
  }

  // Return short names as-is (registered, booked, investor, available, reserved, etc.)
  if (status.length <= 10) {
    return status;
  }

  // Auto-abbreviate very long names: take first letters of words if hyphenated/spaced
  if (status.includes("-") || status.includes(" ")) {
    return status
      .split(/[-\s]+/)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }

  // Otherwise truncate to 4 chars
  return status.substring(0, 4);
};
