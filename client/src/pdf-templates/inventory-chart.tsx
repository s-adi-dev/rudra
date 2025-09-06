import RobotoBold from "@/fonts/roboto/Roboto-Bold.ttf";
import RobotoBoldItalic from "@/fonts/roboto/Roboto-BoldItalic.ttf";
import RobotoItalic from "@/fonts/roboto/Roboto-Italic.ttf";
import RobotoRegular from "@/fonts/roboto/Roboto-Regular.ttf";
import { InventoryCategoryType } from "@/store/category";
import { FloorType, ProjectType, WingType } from "@/store/inventory";
import { getOrdinal } from "@/utils/func/numberUtils";
import { capitalizeWords } from "@/utils/func/strUtils";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import _ from "lodash";
import React, { useMemo } from "react";

/**
 * AVAILABILITY PDF – DYNAMIC STATUS COLORS/LEGEND (from /category)
 * ---------------------------------------------------------------
 * This version accepts `categories` via props (no React Query hooks here),
 * so it works with @react-pdf/renderer.
 */

// Register fonts
Font.register({
  family: "Roboto",
  fonts: [
    { src: RobotoRegular, fontWeight: "normal", fontStyle: "normal" },
    { src: RobotoBold, fontWeight: "bold", fontStyle: "normal" },
    { src: RobotoItalic, fontWeight: "normal", fontStyle: "italic" },
    { src: RobotoBoldItalic, fontWeight: "bold", fontStyle: "italic" },
  ],
});

// Layout constants
const CONSTANTS = {
  A4_WIDTH: 595,
  A4_HEIGHT: 842,
  PAGE_PADDING: 20,
  FLOOR_CELL_WIDTH: 40,
  FLOORS_PER_PAGE_PORTRAIT: 16,
  FLOORS_PER_PAGE_LANDSCAPE: 11,
  UNIT_THRESHOLD: 10,
};

const styles = StyleSheet.create({
  page: {
    padding: CONSTANTS.PAGE_PADDING,
    backgroundColor: "#ffffff",
    fontFamily: "Roboto",
  },
  footer: {
    position: "absolute",
    bottom: CONSTANTS.PAGE_PADDING,
    left: CONSTANTS.PAGE_PADDING,
    right: CONSTANTS.PAGE_PADDING,
    textAlign: "center",
    fontSize: 8,
  },

  // Typography
  title: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: "center",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  wingTitle: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "bold",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "bold",
  },
  continuedText: {
    fontSize: 8,
    textAlign: "center",
    marginBottom: 4,
    fontStyle: "italic",
  },

  // Table structure
  table: {
    display: "flex",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: "100%",
  },
  tableLastRow: {
    flexDirection: "row",
    width: "100%",
  },

  // Cells
  tableHeaderCell: {
    padding: 3,
    backgroundColor: "#f3f4f6",
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 8,
  },
  tableCell: {
    padding: 3,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 8,
  },
  floorCell: {
    width: CONSTANTS.FLOOR_CELL_WIDTH,
    padding: 3,
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    backgroundColor: "#f3f4f6",
    fontSize: 8,
    fontWeight: "bold",
  },
  unitCell: {
    padding: 3,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 8,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  unitAreaText: {
    fontSize: 6,
  },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 3,
  },
  legendColor: {
    width: 10,
    height: 10,
    marginRight: 3,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 4,
  },
  legendText: {
    fontSize: 8,
  },

  // Backgrounds
  bgLabel: {
    backgroundColor: "#8ec5ff",
  },
  bgCommercial: {
    backgroundColor: "#ffb347",
  },
  commercialHeaderCell: {
    padding: 3,
    backgroundColor: "#ffb347",
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 8,
    flex: 1,
  },
});

// Orientation helpers
const shouldUseLandscape = (wing: WingType): boolean =>
  wing.unitsPerFloor > CONSTANTS.UNIT_THRESHOLD;

const shouldCommercialUseLandscape = (floors: FloorType[]): boolean => {
  const maxUnits = Math.max(...floors.map((floor) => floor.units.length), 0);
  return maxUnits > CONSTANTS.UNIT_THRESHOLD;
};

// Column width calculators
const useCommercialColumnWidths = (
  floors: FloorType[],
  isLandscape: boolean,
) => {
  return useMemo(() => {
    const pageWidth = isLandscape ? CONSTANTS.A4_HEIGHT : CONSTANTS.A4_WIDTH;
    const totalPageWidth = pageWidth - CONSTANTS.PAGE_PADDING * 2;
    const availableWidthForUnits = totalPageWidth - CONSTANTS.FLOOR_CELL_WIDTH;

    return {
      floorCellWidth: CONSTANTS.FLOOR_CELL_WIDTH,
      getUnitWidth: (_: number, floorIndex: number) => {
        const floor = floors[floorIndex];
        const totalUnits = floor.units.length;
        return availableWidthForUnits / totalUnits;
      },
      totalUnitWidth: availableWidthForUnits,
    };
  }, [floors, isLandscape]);
};

const useColumnWidths = (wing: WingType, isLandscape: boolean) => {
  return useMemo(() => {
    const pageWidth = isLandscape ? CONSTANTS.A4_HEIGHT : CONSTANTS.A4_WIDTH;
    const totalPageWidth = pageWidth - CONSTANTS.PAGE_PADDING * 2;
    const availableWidthForUnits = totalPageWidth - CONSTANTS.FLOOR_CELL_WIDTH;
    const headerFloor = wing.floors.find(
      (_floor, index) => index === wing.headerFloorIndex,
    );

    if (!headerFloor) {
      const unitCellWidth =
        availableWidthForUnits / Math.max(wing.unitsPerFloor, 1);
      return {
        floorCellWidth: CONSTANTS.FLOOR_CELL_WIDTH,
        getUnitWidth: (unitSpan: number) => unitCellWidth * unitSpan,
        totalUnitWidth: availableWidthForUnits,
      };
    }

    const totalSpans = headerFloor.units.reduce(
      (total, unit) => total + unit.unitSpan,
      0,
    );
    const baseUnitWidth = availableWidthForUnits / Math.max(totalSpans, 1);

    return {
      floorCellWidth: CONSTANTS.FLOOR_CELL_WIDTH,
      getUnitWidth: (unitSpan: number) => baseUnitWidth * unitSpan,
      totalUnitWidth: availableWidthForUnits,
    };
  }, [wing, isLandscape]);
};

// Color lookup from categories
const statusBg = (status: string, categories: InventoryCategoryType[]) => {
  const found = categories.find((c) => c.name === status);
  return found?.colorHex || "#000000";
};

// Header with legend
const ProjectHeader: React.FC<{
  project: ProjectType;
  categories: InventoryCategoryType[];
}> = ({ project, categories }) => (
  <>
    <Text style={styles.title}>{project.name} - Availability Chart</Text>
    <Text style={styles.subtitle}>Project by: {project.by.toUpperCase()}</Text>
    <View style={styles.legend}>
      {categories.map((cat) => (
        <View key={cat._id} style={styles.legendItem}>
          <View
            style={[styles.legendColor, { backgroundColor: cat.colorHex }]}
          />
          <Text style={styles.legendText}>{cat.displayName}</Text>
        </View>
      ))}
    </View>
  </>
);

// Commercial floor row
const CommercialFloorRow: React.FC<{
  floor: FloorType;
  floorCellWidth: number;
  getUnitWidth: (unitIndex: number, floorIndex: number) => number;
  isLastRow?: boolean;
  floorIndex: number;
  categories: InventoryCategoryType[];
}> = ({
  floor,
  floorCellWidth,
  getUnitWidth,
  isLastRow = false,
  floorIndex,
  categories,
}) => (
  <View style={isLastRow ? styles.tableLastRow : styles.tableRow}>
    <View
      style={[styles.floorCell, styles.bgCommercial, { width: floorCellWidth }]}
    >
      <Text>
        {floor.displayNumber === 0 ? "Ground" : getOrdinal(floor.displayNumber)}
      </Text>
    </View>
    {floor.units.map((unit, unitIndex) => (
      <View
        key={unitIndex}
        style={[
          styles.unitCell,
          {
            backgroundColor: statusBg(unit.status, categories),
            width: getUnitWidth(unitIndex, floorIndex),
          },
        ]}
      >
        <Text>{unit.unitNumber}</Text>
        {floor.showArea && unit.area && <Text>{unit.area} sqft</Text>}
        {unit.configuration && unit.configuration !== "terrace" && (
          <Text>{unit.configuration.toUpperCase()}</Text>
        )}
        {unit.reservedByOrReason && (
          <Text>{capitalizeWords(unit.reservedByOrReason.toLowerCase())}</Text>
        )}
      </View>
    ))}
  </View>
);

// Project-level commercial section
const ProjectCommercialSection: React.FC<{
  commercialFloors: FloorType[];
  isLandscape: boolean;
  categories: InventoryCategoryType[];
}> = ({ commercialFloors, isLandscape, categories }) => {
  const sortedCommercialFloors = _.orderBy(
    commercialFloors,
    ["displayNumber"],
    ["asc"],
  );
  const { floorCellWidth, getUnitWidth, totalUnitWidth } =
    useCommercialColumnWidths(sortedCommercialFloors, isLandscape);

  return (
    <>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View
            style={[
              styles.tableHeaderCell,
              styles.bgCommercial,
              {
                width: floorCellWidth,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ fontSize: 10 }}>Floor</Text>
          </View>
          <View
            style={[styles.commercialHeaderCell, { width: totalUnitWidth }]}
          >
            <Text
              style={[
                styles.wingTitle,
                { fontSize: 10, marginTop: 6, marginBottom: 6 },
              ]}
            >
              Project Commercial Units
            </Text>
          </View>
        </View>
        {sortedCommercialFloors.map((floor, floorIndex) => (
          <React.Fragment key={`commercial-floor-${floorIndex}`}>
            <CommercialFloorRow
              floor={floor}
              floorCellWidth={floorCellWidth}
              getUnitWidth={getUnitWidth}
              isLastRow={floorIndex === sortedCommercialFloors.length - 1}
              floorIndex={floorIndex}
              categories={categories}
            />
          </React.Fragment>
        ))}
      </View>
    </>
  );
};

// Commercial header row
const CommercialHeader: React.FC<{
  floorCellWidth: number;
  totalWidth: number;
}> = ({ floorCellWidth, totalWidth }) => (
  <View style={styles.tableRow}>
    <View
      style={[
        styles.tableHeaderCell,
        styles.bgCommercial,
        { width: floorCellWidth },
      ]}
    >
      <Text>Floor</Text>
    </View>
    <View style={[styles.commercialHeaderCell, { width: totalWidth }]}>
      <Text>Commercial Floors</Text>
    </View>
  </View>
);

// Residential/commercial table header
const TableHeader: React.FC<{
  wing: WingType;
  floorCellWidth: number;
  getUnitWidth: (unitSpan: number) => number;
  totalUnitWidth: number;
  isCommercial?: boolean;
}> = ({
  wing,
  floorCellWidth,
  getUnitWidth,
  totalUnitWidth,
  isCommercial = false,
}) => {
  const headerFloor = wing.floors.find(
    (_floor, index) => index === wing.headerFloorIndex,
  );

  if (isCommercial) {
    return (
      <CommercialHeader
        floorCellWidth={floorCellWidth}
        totalWidth={totalUnitWidth}
      />
    );
  }

  return (
    <View style={styles.tableRow}>
      <View
        style={[
          styles.tableHeaderCell,
          styles.bgLabel,
          { width: floorCellWidth },
        ]}
      >
        <Text>Floor</Text>
      </View>
      {headerFloor
        ? headerFloor.units.map((unit, index) => (
            <View
              key={index}
              style={[
                styles.tableHeaderCell,
                styles.bgLabel,
                { width: getUnitWidth(unit.unitSpan) },
              ]}
            >
              <Text>{unit.configuration.toUpperCase()}</Text>
              {unit.area && (
                <Text style={styles.unitAreaText}>{unit.area} sqft</Text>
              )}
            </View>
          ))
        : Array(wing.unitsPerFloor)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tableHeaderCell,
                  styles.bgLabel,
                  { width: getUnitWidth(1) },
                ]}
              >
                <Text>Unit {i + 1}</Text>
              </View>
            ))}
    </View>
  );
};

// Single floor row
const FloorRow: React.FC<{
  floor: FloorType;
  floorCellWidth: number;
  getUnitWidth: (unitSpan: number) => number;
  isLastRow?: boolean;
  isCommercial?: boolean;
  categories: InventoryCategoryType[];
}> = ({
  floor,
  floorCellWidth,
  getUnitWidth,
  isLastRow = false,
  isCommercial = false,
  categories,
}) => (
  <View style={isLastRow ? styles.tableLastRow : styles.tableRow}>
    <View
      style={[
        styles.floorCell,
        isCommercial ? styles.bgCommercial : styles.bgLabel,
        { width: floorCellWidth },
      ]}
    >
      <Text>
        {floor.displayNumber === 0 ? "Ground" : getOrdinal(floor.displayNumber)}
      </Text>
    </View>
    {floor.units.map((unit, index) => {
      const addPadding = !unit.reservedByOrReason && !floor.showArea;
      return (
        <View
          key={index}
          style={[
            styles.unitCell,
            {
              backgroundColor: statusBg(unit.status, categories),
              width: getUnitWidth(unit.unitSpan),
            },
            addPadding ? { paddingTop: 8, paddingBottom: 8 } : {},
          ]}
        >
          <Text>{unit.unitNumber}</Text>
          {floor.showArea && unit.status !== "others" && unit.area && (
            <Text>{unit.area} sqft</Text>
          )}
          {floor.showArea && unit.status !== "others" && unit.configuration && (
            <Text>{unit.configuration.toUpperCase()}</Text>
          )}
          {unit.reservedByOrReason && (
            <Text>
              {capitalizeWords(unit.reservedByOrReason.toLowerCase())}
            </Text>
          )}
        </View>
      );
    })}
  </View>
);

// Wing-level commercial section
const CommercialSection: React.FC<{
  wing: WingType;
  floorCellWidth: number;
  getUnitWidth: (unitSpan: number) => number;
  totalUnitWidth: number;
  categories: InventoryCategoryType[];
}> = ({ wing, floorCellWidth, getUnitWidth, totalUnitWidth, categories }) => {
  if (!wing.commercialFloors || wing.commercialFloors.length === 0) return null;
  const sortedCommercialFloors = _.orderBy(
    wing.commercialFloors,
    ["displayNumber"],
    ["asc"],
  );

  return (
    <>
      <Text style={styles.sectionTitle}>Commercial Units</Text>
      <View style={styles.table}>
        <TableHeader
          wing={wing}
          floorCellWidth={floorCellWidth}
          getUnitWidth={getUnitWidth}
          totalUnitWidth={totalUnitWidth}
          isCommercial={true}
        />
        {sortedCommercialFloors.map((floor, index) => (
          <FloorRow
            key={index}
            floor={floor}
            floorCellWidth={floorCellWidth}
            getUnitWidth={getUnitWidth}
            isLastRow={index === sortedCommercialFloors.length - 1}
            isCommercial={true}
            categories={categories}
          />
        ))}
      </View>
    </>
  );
};

// Residential section for a page of floors
const ResidentialSection: React.FC<{
  wing: WingType;
  floorCellWidth: number;
  getUnitWidth: (unitSpan: number) => number;
  totalUnitWidth: number;
  pageFloors: FloorType[];
  categories: InventoryCategoryType[];
}> = ({
  wing,
  floorCellWidth,
  getUnitWidth,
  totalUnitWidth,
  pageFloors,
  categories,
}) => {
  if (pageFloors.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Residential Units</Text>
      <View style={styles.table}>
        <TableHeader
          wing={wing}
          floorCellWidth={floorCellWidth}
          getUnitWidth={getUnitWidth}
          totalUnitWidth={totalUnitWidth}
          isCommercial={false}
        />
        {pageFloors.map((floor, index) => (
          <FloorRow
            key={index}
            floor={floor}
            floorCellWidth={floorCellWidth}
            getUnitWidth={getUnitWidth}
            isLastRow={index === pageFloors.length - 1}
            isCommercial={false}
            categories={categories}
          />
        ))}
      </View>
    </>
  );
};

// Project-level Commercial Page
const ProjectCommercialPage: React.FC<{
  project: ProjectType;
  isLandscape: boolean;
  categories: InventoryCategoryType[];
}> = ({ project, isLandscape, categories }) => (
  <Page
    size="A4"
    orientation={isLandscape ? "landscape" : "portrait"}
    style={styles.page}
  >
    <ProjectHeader project={project} categories={categories} />
    <ProjectCommercialSection
      commercialFloors={project.commercialFloors || []}
      isLandscape={isLandscape}
      categories={categories}
    />
    <Text style={styles.footer}>
      Generated on{" "}
      {new Date().toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })}
    </Text>
  </Page>
);

// Wing Page
const WingPage: React.FC<{
  project: ProjectType;
  wing: WingType;
  pageIndex: number;
  pageFloors: WingType["floors"];
  showCommercial: boolean;
  totalPages: number;
  isLandscape: boolean;
  categories: InventoryCategoryType[];
}> = ({
  project,
  wing,
  pageIndex,
  pageFloors,
  showCommercial,
  totalPages,
  isLandscape,
  categories,
}) => {
  const { floorCellWidth, getUnitWidth, totalUnitWidth } = useColumnWidths(
    wing,
    isLandscape,
  );

  return (
    <Page
      key={`${wing._id}-page-${pageIndex}`}
      size="A4"
      orientation={isLandscape ? "landscape" : "portrait"}
      style={styles.page}
    >
      {pageIndex === 0 && (
        <ProjectHeader project={project} categories={categories} />
      )}
      {pageIndex === 0 ? (
        <Text style={styles.wingTitle}>{wing.name}</Text>
      ) : (
        <Text style={styles.continuedText}>{wing.name} (continued)</Text>
      )}

      {pageIndex === 0 &&
        showCommercial &&
        project.commercialUnitPlacement === "wingLevel" && (
          <CommercialSection
            wing={wing}
            floorCellWidth={floorCellWidth}
            getUnitWidth={getUnitWidth}
            totalUnitWidth={totalUnitWidth}
            categories={categories}
          />
        )}

      {pageFloors.length > 0 && (
        <ResidentialSection
          wing={wing}
          floorCellWidth={floorCellWidth}
          getUnitWidth={getUnitWidth}
          totalUnitWidth={totalUnitWidth}
          pageFloors={pageFloors}
          categories={categories}
        />
      )}

      {totalPages > 1 ? (
        <Text style={styles.footer}>
          Page {pageIndex + 1} of {totalPages} | Generated on{" "}
          {new Date().toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </Text>
      ) : (
        <Text style={styles.footer}>
          Generated on{" "}
          {new Date().toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </Text>
      )}
    </Page>
  );
};

// MAIN: AvailabilityPDF (accept categories)
export const AvailabilityPDF: React.FC<{
  project: ProjectType;
  categories: InventoryCategoryType[];
}> = ({ project, categories }) => {
  // Optionally sort here (if not sorted in parent)
  const sortedCategories = useMemo<InventoryCategoryType[]>(
    () =>
      [...(categories || [])].sort((a, b) =>
        a.precedence !== b.precedence
          ? a.precedence - b.precedence
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [categories],
  );

  const hasProjectCommercialUnits =
    project.commercialUnitPlacement === "projectLevel" &&
    project.commercialFloors &&
    project.commercialFloors.length > 0;

  const isProjectCommercialLandscape =
    hasProjectCommercialUnits &&
    shouldCommercialUseLandscape(project.commercialFloors || []);

  return (
    <Document>
      {hasProjectCommercialUnits && (
        <ProjectCommercialPage
          project={project}
          isLandscape={isProjectCommercialLandscape || false}
          categories={sortedCategories}
        />
      )}

      {project.wings.map((wing, i) => {
        const isLandscape = shouldUseLandscape(wing);
        const sortedFloors = _.orderBy(wing.floors, ["displayNumber"], ["asc"]);
        const hasCommercialFloors =
          project.commercialUnitPlacement === "wingLevel" &&
          wing.commercialFloors &&
          wing.commercialFloors.length > 0;
        const floorsPerPage = isLandscape
          ? CONSTANTS.FLOORS_PER_PAGE_LANDSCAPE
          : CONSTANTS.FLOORS_PER_PAGE_PORTRAIT;
        const totalPages = Math.ceil(sortedFloors.length / floorsPerPage);

        return Array.from({ length: totalPages }).map((_, pageIndex) => {
          const startFloorIndex = pageIndex * floorsPerPage;
          const endFloorIndex = Math.min(
            startFloorIndex + floorsPerPage,
            sortedFloors.length,
          );
          const pageFloors = sortedFloors.slice(startFloorIndex, endFloorIndex);

          return (
            <WingPage
              key={`${i}-page-${pageIndex}`}
              project={project}
              wing={wing}
              pageIndex={pageIndex}
              pageFloors={pageFloors}
              showCommercial={hasCommercialFloors || false}
              totalPages={totalPages}
              isLandscape={isLandscape}
              categories={sortedCategories}
            />
          );
        });
      })}
    </Document>
  );
};
