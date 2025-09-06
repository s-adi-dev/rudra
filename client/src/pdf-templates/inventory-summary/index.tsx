import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import _ from "lodash";

// Component imports
import { BarChart } from "./BarChart";
import { PieChart } from "./PieChart";
import { ProjectSummaryTable } from "./ProjectSummaryTable";
import { StatusLegend } from "./StatusLegend";
import { WingSummaryTable } from "./WingSummaryTable";

// Font imports
import RobotoBold from "@/fonts/roboto/Roboto-Bold.ttf";
import RobotoBoldItalic from "@/fonts/roboto/Roboto-BoldItalic.ttf";
import RobotoItalic from "@/fonts/roboto/Roboto-Italic.ttf";
import RobotoRegular from "@/fonts/roboto/Roboto-Regular.ttf";
import { ProjectType, WingType } from "@/store/inventory";
import {
  ALL_UNIT_STATUSES,
  calculatePercentages,
  calculateStatusCounts,
  collectAllUnits,
} from "./utils";

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

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#FFFFFF",
    fontFamily: "Roboto",
  },
  header: {
    marginBottom: 15,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginBottom: 6,
  },
  reportSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
  },
  headerDivider: {
    borderBottomWidth: 2,
    borderBottomColor: "#1E3A8A",
    borderBottomStyle: "solid",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 30,
    color: "#1E3A8A",
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 4,
  },
  wingSection: {
    paddingLeft: 15,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#1E3A8A",
    borderLeftStyle: "solid",
  },
  container: {
    marginTop: 15,
    marginBottom: 30,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#1E3A8A",
    borderLeftStyle: "solid",
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1E3A8A",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#64748B",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: "#64748B",
  },
});

// Types for the summary data
interface ProjectSummaryType {
  totalUnits: number;
  statusCounts: Record<Exclude<string, "others">, number>;
  percentages: Record<Exclude<string, "others">, string>;
}

interface WingSummaryDataItem {
  configuration: string;
  total: number;
  [key: string]: number | string; // For status counts
}

interface WingSummaryType {
  summaryData: WingSummaryDataItem[];
  totalRow: WingSummaryDataItem;
  statusDistribution: Record<Exclude<string, "others">, number>;
}

// Data processing functions
const generateProjectSummary = (project: ProjectType): ProjectSummaryType => {
  const allUnits = collectAllUnits(project);
  const statusCounts = calculateStatusCounts(allUnits);
  const percentages = calculatePercentages(statusCounts, allUnits.length);

  return {
    totalUnits: allUnits.length,
    statusCounts,
    percentages,
  };
};

const generateWingSummary = (wing: WingType): WingSummaryType => {
  // Collect all units from wing
  const allWingUnits = [
    ...wing.floors.flatMap((floor) => floor.units),
    ...(wing.commercialFloors?.flatMap((floor) => floor.units) || []),
  ].filter((unit) => unit.status !== "others");

  // Get unique configurations
  const configurations = _.uniq(
    allWingUnits.map((unit) => unit.configuration),
  ).sort();

  // Create summary data by configuration
  const summaryData: WingSummaryDataItem[] = configurations.map((config) => {
    const configUnits = allWingUnits.filter(
      (unit) => unit.configuration === config,
    );
    const statusCounts = calculateStatusCounts(configUnits);

    return {
      configuration: config,
      ...statusCounts,
      total: configUnits.length,
    };
  });

  // Add total row
  const totalRow: WingSummaryDataItem = {
    configuration: "Total",
    total: allWingUnits.length,
  };

  ALL_UNIT_STATUSES.forEach((status) => {
    totalRow[status] = summaryData.reduce(
      (sum, row) => sum + ((row[status] as number) || 0),
      0,
    );
  });

  // Status distribution for pie chart
  const statusDistribution = calculateStatusCounts(allWingUnits);

  return { summaryData, totalRow, statusDistribution };
};

// Main PDF Component
export const ProjectSummaryPDF = ({ project }: { project: ProjectType }) => {
  const projectSummary = generateProjectSummary(project);
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.reportTitle}>{project.name}</Text>
          <Text style={styles.reportSubtitle}>Inventory Summary Report</Text>
          <View style={styles.headerDivider} />
        </View>

        {/* Status Legend */}
        <StatusLegend statuses={ALL_UNIT_STATUSES} />

        {/* Project Overall Summary */}
        <ProjectSummaryTable summary={projectSummary} />

        {/* Project Bar Chart */}
        <View style={styles.container}>
          <Text style={styles.title}>
            Project Inventory Status Distribution
          </Text>
          <BarChart
            data={projectSummary.statusCounts}
            width={500}
            height={200}
          />
        </View>

        {/* Wing Summaries */}
        {project.wings.map((wing, wingIndex) => {
          const wingSummary = generateWingSummary(wing);

          return (
            <View key={wingIndex} break>
              <Text style={[styles.sectionTitle, styles.wingSection]}>
                {wing.name} Summary
              </Text>

              {/* Wing Pie Chart */}
              <View style={styles.container}>
                <Text style={styles.title}>
                  {wing.name} Status Distribution
                </Text>
                <PieChart
                  data={wingSummary.statusDistribution}
                  total={wingSummary.totalRow.total}
                />
              </View>

              {/* Wing Summary Table */}
              <WingSummaryTable summary={wingSummary} />
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            {project.name} Summary Report | Generated on {currentDate} | Rudra
            Developers
          </Text>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
