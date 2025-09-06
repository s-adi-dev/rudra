import {
  Circle,
  G,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import _ from "lodash";
import { ALL_UNIT_STATUSES, getStatusColor } from "./utils";

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    margin: 5,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    border: "1px solid #000",
    marginRight: 5,
  },
  legendText: {
    fontSize: 8,
    color: "#334155",
  },
});

interface PieChartProps {
  data: Record<Exclude<string, "others">, number>;
  size?: number;
  total: number;
}

export const PieChart = ({ data, size = 140, total }: PieChartProps) => {
  const borderWidth = 3;
  const radius = size / 2;

  // Calculate proper dimensions and center position
  const centerX = 100;
  const centerY = 70;

  // Add padding to SVG dimensions to fully contain the circle with border
  const svgWidth = 2 * centerX;
  const svgHeight = 2 * centerY;

  // Calculate offsets to center the circle properly
  const offsetX = borderWidth;
  const offsetY = borderWidth;

  // Calculate slice path
  const getSlicePath = (startAngle: number, endAngle: number): string => {
    const start = (startAngle * Math.PI) / 180;
    const end = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Generate pie slices
  let currentAngle = 0;
  const slices: JSX.Element[] = [];
  const statusLabels = Object.keys(data) as Array<Exclude<string, "others">>;

  statusLabels.forEach((status, index) => {
    const value = data[status];
    if (value > 0) {
      const angle = (value / total) * 360;
      const path = getSlicePath(currentAngle, currentAngle + angle);
      const fillColor = getStatusColor(status);
      slices.push(
        <Path
          key={index}
          d={path}
          fill={fillColor}
          stroke="#000000"
          strokeWidth={1}
        />,
      );
      currentAngle += angle;
    }
  });

  return (
    <View style={styles.wrapper}>
      {/* Add proper padding to ensure the border isn't cut off */}
      <Svg
        width={svgWidth + 2 * borderWidth}
        height={svgHeight + 2 * borderWidth}
      >
        {/* Move everything to create padding space for the border */}
        <G transform={`translate(${offsetX}, ${offsetY})`}>
          {/* Outer border circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            // stroke="#000000"
            stroke="none"
            strokeWidth={borderWidth}
          />

          {/* Slices */}
          <G>{slices}</G>

          {/* Center circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.4}
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth={1}
          />

          {/* Total number */}
          <Text
            x={centerX}
            y={centerY + 4}
            style={{
              fontSize: 10,
              textAnchor: "middle",
              fontWeight: "bold",
              fill: "#1E293B",
            }}
          >
            {total}
          </Text>
        </G>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {ALL_UNIT_STATUSES.map((status, index) => {
          const value = data[status] || 0; // Provide default value if undefined
          return value > 0 ? (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: getStatusColor(status) },
                ]}
              />
              <Text style={styles.legendText}>
                {_.startCase(status)}: {value} (
                {((value / total) * 100).toFixed(1)}%)
              </Text>
            </View>
          ) : null;
        })}
      </View>
    </View>
  );
};
