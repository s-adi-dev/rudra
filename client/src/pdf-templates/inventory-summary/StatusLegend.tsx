import { StyleSheet, Text, View } from "@react-pdf/renderer";
import _ from "lodash";
import { getStatusColor } from "./utils";

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
    padding: 10,
    borderRadius: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 6,
  },
  legendText: {
    fontSize: 9,
    color: "#475569",
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
    border: "1px solid #000",
  },
});

interface StatusLegendProps {
  statuses: Array<Exclude<string, "others">>;
}

export const StatusLegend = ({ statuses }: StatusLegendProps) => (
  <View style={styles.legend}>
    {statuses.map((status, index) => (
      <View key={index} style={styles.legendItem}>
        <View
          style={[
            styles.indicator,
            { backgroundColor: getStatusColor(status) },
          ]}
        />
        <Text style={styles.legendText}>{_.startCase(status)}</Text>
      </View>
    ))}
  </View>
);
