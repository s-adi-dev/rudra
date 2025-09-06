import { toProperCase } from "@/utils/func/strUtils";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { ALL_UNIT_STATUSES } from "./utils";

function getStatusHeader(status: Exclude<string, "others">) {
  switch (status) {
    case "not-for-sale":
      return "N.F.S";
    case "registered":
      return "Reg.";
    default:
      return toProperCase(status);
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
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
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
    whiteSpace: "nowrap",
    hyphens: "none",
  },
  headerCellLeft: {
    padding: 10,
    paddingLeft: 10,
    paddingRight: 5,
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "left",
    whiteSpace: "nowrap",
    hyphens: "none",
  },
  cell: {
    padding: 10,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 10,
    color: "#334155",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
  },
  cellLeft: {
    padding: 10,
    paddingLeft: 10,
    paddingRight: 5,
    fontSize: 10,
    color: "#334155",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "left",
  },
  statusCell: {
    padding: 10,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
  },
  totalRow: {
    backgroundColor: "#F1F5F9",
  },
  totalCell: {
    padding: 10,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "center",
  },
  totalCellLeft: {
    padding: 10,
    paddingLeft: 10,
    paddingRight: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    textAlign: "left",
  },
});

interface SummaryRowData {
  configuration: string;
  available?: number;
  reserved?: number;
  booked?: number;
  registered?: number;
  canceled?: number;
  investor?: number;
  total: number;
  [key: string]: number | string | undefined;
}

interface WingSummaryTableProps {
  summary: {
    summaryData: SummaryRowData[];
    totalRow: SummaryRowData;
  };
}

export const WingSummaryTable = ({ summary }: WingSummaryTableProps) => (
  <View style={styles.container}>
    <View style={styles.table}>
      {/* Header Row */}
      <View style={[styles.tableRow, styles.headerRow]}>
        <Text style={[styles.headerCellLeft, { flex: 1.5 }]}>
          Configuration
        </Text>
        {ALL_UNIT_STATUSES.map((status, index) => (
          <Text key={index} style={[styles.headerCell, { flex: 1 }]}>
            {getStatusHeader(status)}
          </Text>
        ))}
        <Text style={[styles.headerCell, { flex: 1 }]}>Total</Text>
      </View>

      {/* Data Rows */}
      {summary.summaryData.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.tableRow,
            rowIndex % 2 === 1 ? { backgroundColor: "#F8FAFC" } : {},
          ]}
        >
          <Text style={[styles.cellLeft, { flex: 1.5 }]}>
            {row.configuration.toUpperCase()}
          </Text>
          {ALL_UNIT_STATUSES.map((status, index) => (
            <Text
              key={index}
              style={[
                styles.statusCell,
                {
                  flex: 1,
                  color: "#000000",
                  fontWeight: (row[status] as number) > 0 ? "bold" : "normal",
                },
              ]}
            >
              {row[status] || 0}
            </Text>
          ))}
          <Text style={[styles.cell, { flex: 1, fontWeight: "bold" }]}>
            {row.total}
          </Text>
        </View>
      ))}

      {/* Total Row */}
      <View style={[styles.tableRow, styles.totalRow]}>
        <Text style={[styles.totalCellLeft, { flex: 1.5 }]}>Total</Text>
        {ALL_UNIT_STATUSES.map((status, index) => (
          <Text key={index} style={[styles.totalCell, { flex: 1 }]}>
            {summary.totalRow[status] || 0}
          </Text>
        ))}
        <Text style={[styles.totalCell, { flex: 1 }]}>
          {summary.totalRow.total}
        </Text>
      </View>
    </View>
  </View>
);
