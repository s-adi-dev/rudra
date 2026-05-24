// InkedRectStamp.tsx
import StampFont from "@/fonts/stamp-font.otf";
import { Font, Svg, Text } from "@react-pdf/renderer";
import React from "react";

// Register Cacha font
Font.register({
  family: "Cacha",
  src: StampFont,
});

type Props = {
  companyName: string;
  width?: number;
  height?: number;
  color?: string;
  seed?: number;
  rotateDeg?: number;
  noise?: number;
  fontSize?: number;
  fontFamily?: string;
  bottomText?: string;
};

const InkedRectStamp: React.FC<Props> = ({
  companyName,
  width = 160,
  height = 90,
  color = "#2c197e",
  rotateDeg = 0,
  fontSize = 12,
  fontFamily = "Cacha",
  bottomText = "Authorised Signatory",
}) => {
  const pad = 12;
  const y = pad;
  const h = height - pad * 2;
  const cx = width / 2;
  const transform = `rotate(${rotateDeg} ${cx} ${height / 2})`;

  // --- ink ghost layers: simulate uneven ink pressure on rubber stamp ---
  // More layers, varied offsets and opacities for a tactile smudged feel
  const textSet = (text: string, yPos: number, key: string, bold = true) => {
    const base = { fontSize, fontFamily, fill: color } as const;
    const main = { ...base, fontWeight: bold ? ("bold" as const) : undefined };

    // Each ghost offset simulates ink spread direction under press pressure
    const ghosts = [
      // close smear (slightly asymmetric — like a real press)
      { dx: 0.3, dy: 0.2, op: 0.3 },
      { dx: -0.2, dy: 0.3, op: 0.22 },
    ];

    return [
      ...ghosts.map(({ dx, dy, op }, i) => (
        <Text
          key={`${key}-g${i}`}
          x={cx + dx}
          y={yPos + dy}
          textAnchor="middle"
          transform={transform}
          style={{ ...main, opacity: op }}
        >
          {text}
        </Text>
      )),
      // main ink pass — full opacity
      <Text
        key={`${key}-main`}
        x={cx}
        y={yPos}
        textAnchor="middle"
        transform={transform}
        style={main}
      >
        {text}
      </Text>,
    ];
  };

  // --- layout ---
  const topY = y + 24;
  const botY = y + h - 8;

  return (
    <Svg width={width} height={height}>
      {textSet(`For ${companyName}`, topY, "top")}
      {textSet(bottomText, botY, "bot")}
    </Svg>
  );
};

export default InkedRectStamp;
