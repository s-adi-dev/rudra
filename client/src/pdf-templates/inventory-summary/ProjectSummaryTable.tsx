import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { InventoryCategoryType } from "@/store/category";
import {
  getStatusColor,
  calculateHeaderFontSize,
  calculateHeaderPadding,
  getStatusHeaderAbbreviation,
} from "./utils";
import { toProperCase } from "@/utils/func/strUtils";

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
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
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerRow: {
    backgroundColor: "#E2E8F0",
  },
  headerCell: {
    padding: 10,
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
    whiteSpace: "nowrap",
    hyphens: "none",
  },
  cell: {
    padding: 10,
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 10,
    color: "#334155",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
  },
  statusCell: {
    padding: 10,
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
  },
  percentageText: {
    fontSize: 8,
    marginTop: 2,
    color: "#64748B",
  },
});

interface ProjectSummaryProps {
  summary: {
    totalUnits: number;
    statusCounts: Record<string, number>;
    percentages: Record<string, string>;
  };
  statuses: string[];
  categories: InventoryCategoryType[];
}

export const ProjectSummaryTable = ({
  summary,
  statuses,
  categories,
}: ProjectSummaryProps) => {
  const headerFontSize = calculateHeaderFontSize(statuses.length);
  const headerPadding = calculateHeaderPadding(statuses.length);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Project Overall Summary</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.headerRow]}>
            <Text
              style={[
                styles.headerCell,
                {
                  flex: 2,
                  fontSize: headerFontSize,
                  padding: headerPadding,
                  paddingLeft: headerPadding,
                  paddingRight: headerPadding / 2,
                },
              ]}
            >
              Total Units
            </Text>
            {statuses.map((status, index) => (
              <Text
                key={index}
                style={[
                  styles.headerCell,
                  {
                    flex: 1,
                    fontSize: headerFontSize,
                    padding: headerPadding,
                    paddingLeft: headerPadding / 2,
                    paddingRight: headerPadding / 2,
                  },
                ]}
              >
                {status !== getStatusHeaderAbbreviation(status)
                  ? getStatusHeaderAbbreviation(status)
                  : toProperCase(status)}
              </Text>
            ))}
          </View>
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.cell,
                {
                  flex: 2,
                  fontWeight: "bold",
                  padding: headerPadding,
                  paddingLeft: headerPadding,
                  paddingRight: headerPadding / 2,
                },
              ]}
            >
              {summary.totalUnits}
            </Text>
            {statuses.map((status, index) => (
              <View
                key={index}
                style={[
                  styles.statusCell,
                  {
                    flex: 1,
                    backgroundColor: `${getStatusColor(status, categories)}15`,
                    padding: headerPadding,
                    paddingLeft: headerPadding / 2,
                    paddingRight: headerPadding / 2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: "#000000",
                  }}
                >
                  {summary.statusCounts[status]}
                </Text>
                <Text style={styles.percentageText}>
                  ({summary.percentages[status]})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};
