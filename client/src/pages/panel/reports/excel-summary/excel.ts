import { ProjectType } from "@/store/inventory";
import ExcelJS, { CellValue } from "exceljs";

export type InventoryCategoryType = {
  _id: string;
  displayName: string;
  name: string;
  precedence: number;
  type: "mutable" | "immutable";
  createdAt: string;
  updatedAt: string;
};

// Convert 1-based column index -> Excel column letter (A, B, ... AA)
function colLetter(colIndex: number): string {
  let letter = "";
  while (colIndex > 0) {
    const rem = (colIndex - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return letter;
}

const norm = (s: string | undefined | null): string =>
  (s ?? "").trim().toLowerCase();

const ALIGN_CENTER: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const FILL_HEADER: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEEEEE" },
};

const FILL_STATUS: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF7F7F7" },
};

function styleRect(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  style: Partial<ExcelJS.Style>,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      cell.style = { ...cell.style, ...style } as ExcelJS.Style;
    }
  }
}

function borderRect(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  border: Partial<ExcelJS.Borders>,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).border = border as ExcelJS.Borders;
    }
  }
}

function isFormulaValue(v: CellValue): v is ExcelJS.CellFormulaValue {
  return !!v && typeof v === "object" && "formula" in v;
}

function cellValueToString(v: CellValue | undefined): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v.toISOString();
  if (isFormulaValue(v)) {
    if (v.result != null) return cellValueToString(v.result);
    return v.formula ?? "";
  }
  return String(v);
}

function setCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: CellValue,
  style?: Partial<ExcelJS.Style>,
) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  if (style) cell.style = { ...cell.style, ...style } as ExcelJS.Style;
}

// Sort configurations like 1BHK, 2BHK numerically first, then alpha
function configSort(a: string, b: string) {
  const parseBHK = (s: string) => {
    const m = s.toUpperCase().match(/^(\d+)\s*BHK$/);
    return m ? parseInt(m[1], 10) : null;
  };
  const na = parseBHK(a);
  const nb = parseBHK(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.localeCompare(b);
}

/**
 * ==============================================
 *  Build Residential Status Summary Sheet
 *  - Formulas include cached results for mobile
 *  - Borders & center alignment preserved
 * ==============================================
 */
export async function buildResidentialStatusSummaryWorkbook(
  project: ProjectType,
  categories?: InventoryCategoryType[],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  // Force a full calc in apps that support it (harmless elsewhere)
  workbook.calcProperties.fullCalcOnLoad = true;

  const ws = workbook.addWorksheet("Residential Status Summary");
  const wingNames = (project.wings ?? []).map((w) => w.name);

  // Order map from categories
  const orderMap = new Map<string, number>();
  categories?.forEach((c, idx) => {
    const dn = norm(c.displayName);
    const n = norm(c.name);
    if (dn) orderMap.set(dn, idx);
    if (n) orderMap.set(n, idx);
  });

  // Collect residential units (ignore status: "others")
  const IGNORE_STATUS = new Set(["others"]);
  type Flat = { wing: string; status: string; config: string };
  const flat: Flat[] = [];

  for (const wing of project.wings ?? []) {
    for (const floor of wing.floors ?? []) {
      if (floor.type !== "residential") continue;
      for (const u of floor.units ?? []) {
        const s = u?.status ? norm(u.status) : "";
        if (!s || IGNORE_STATUS.has(s)) continue;
        flat.push({
          wing: wing.name,
          status: u.status!, // keep original case
          config: (u.configuration ?? "Unspecified").trim() || "Unspecified",
        });
      }
    }
  }

  // Unique statuses ordered by categories then alpha
  const statuses = Array.from(new Set(flat.map((r) => r.status))).sort(
    (a, b) => {
      const ia = orderMap.has(norm(a))
        ? (orderMap.get(norm(a)) as number)
        : Number.POSITIVE_INFINITY;
      const ib = orderMap.has(norm(b))
        ? (orderMap.get(norm(b)) as number)
        : Number.POSITIVE_INFINITY;
      return ia !== ib ? ia - ib : a.localeCompare(b);
    },
  );

  // Pre-compute counts
  const countsByStatusWing: Record<string, Record<string, number>> = {};
  const configCounts: Record<
    string,
    Record<string, Record<string, number>>
  > = {};

  for (const st of statuses) {
    countsByStatusWing[st] = Object.fromEntries(wingNames.map((w) => [w, 0]));
    configCounts[st] = {};
  }

  for (const r of flat) {
    countsByStatusWing[r.status][r.wing] += 1;
    if (!configCounts[r.status][r.config]) {
      configCounts[r.status][r.config] = Object.fromEntries(
        wingNames.map((w) => [w, 0]),
      );
    }
    configCounts[r.status][r.config][r.wing] += 1;
  }

  // Columns: A = Category/Config, B..= wings, Last = Total
  const totalCols = 1 + wingNames.length + 1;
  const lastColIndex = totalCols;

  // Top Title Bar
  ws.mergeCells(1, 1, 1, lastColIndex);
  setCell(ws, 1, 1, project.name || "Project Summary", {
    font: { bold: true, size: 16 },
    alignment: ALIGN_CENTER,
  });

  ws.mergeCells(2, 1, 2, lastColIndex);
  setCell(
    ws,
    2,
    1,
    `Generated on ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    { font: { bold: true }, alignment: ALIGN_CENTER },
  );

  // Header
  const headerRowIndex = 4;
  const header = ["Category / Config", ...wingNames, "Total Units"];
  ws.getRow(headerRowIndex).values = header;
  styleRect(ws, headerRowIndex, headerRowIndex, 1, lastColIndex, {
    font: { bold: true },
    fill: FILL_HEADER,
    alignment: ALIGN_CENTER,
  });

  // Data Rows
  let currentRow = headerRowIndex + 1; // starts at 5
  const statusRowIndices: number[] = []; // for bottom totals
  const statusRowTotals: number[] = []; // cache totals per status row

  for (const status of statuses) {
    // STATUS ROW
    setCell(ws, currentRow, 1, status.toUpperCase(), {
      font: { bold: true },
      fill: FILL_STATUS,
      alignment: ALIGN_CENTER,
    });

    // Wing counts
    let rowTotal = 0;
    wingNames.forEach((wingName, i) => {
      const v = countsByStatusWing[status][wingName] ?? 0;
      rowTotal += v;
      setCell(ws, currentRow, 2 + i, v, {
        font: { bold: true },
        fill: FILL_STATUS,
        alignment: ALIGN_CENTER,
      });
    });

    // Row total: formula + cached result (shows on mobile)
    const firstWingColLetter = colLetter(2);
    const lastWingColLetter = colLetter(1 + wingNames.length);
    const sumRange = `${firstWingColLetter}${currentRow}:${lastWingColLetter}${currentRow}`;
    setCell(
      ws,
      currentRow,
      lastColIndex,
      { formula: `SUM(${sumRange})`, result: rowTotal },
      {
        font: { bold: true },
        fill: FILL_STATUS,
        alignment: ALIGN_CENTER,
      },
    );

    statusRowIndices.push(currentRow);
    statusRowTotals.push(rowTotal);
    currentRow++;

    // CONFIG ROWS (centered)
    const configs = Object.keys(configCounts[status] || {}).sort(configSort);
    for (const cfg of configs) {
      setCell(ws, currentRow, 1, cfg, { alignment: ALIGN_CENTER });

      let cfgRowTotal = 0;
      wingNames.forEach((wingName, i) => {
        const v = configCounts[status][cfg][wingName] ?? 0;
        cfgRowTotal += v;
        setCell(ws, currentRow, 2 + i, v, { alignment: ALIGN_CENTER });
      });

      setCell(ws, currentRow, lastColIndex, cfgRowTotal, {
        alignment: ALIGN_CENTER,
      });

      currentRow++;
    }

    // Spacer row
    setCell(ws, currentRow, 1, "");
    currentRow++;
  }

  // FINAL TOTAL ROW — sums ONLY the status rows
  const totalRowIndex = currentRow;
  setCell(ws, totalRowIndex, 1, "Total", {
    font: { bold: true },
    alignment: ALIGN_CENTER,
  });

  // Per-wing totals (formula + cached result)
  for (let i = 0; i < wingNames.length; i++) {
    const colIndex = 2 + i; // B..?
    const refs = statusRowIndices
      .map((r) => `${colLetter(colIndex)}${r}`)
      .join(",");
    // Compute cached total for this wing
    let colTotal = 0;
    for (const status of statuses) {
      colTotal += countsByStatusWing[status][wingNames[i]] ?? 0;
    }
    setCell(
      ws,
      totalRowIndex,
      colIndex,
      { formula: `SUM(${refs})`, result: colTotal },
      {
        font: { bold: true },
        alignment: ALIGN_CENTER,
      },
    );
  }

  // Grand Total (last col) — formula + cached result
  {
    const colIndex = lastColIndex;
    const refs = statusRowIndices
      .map((r) => `${colLetter(colIndex)}${r}`)
      .join(",");

    const grandTotal = statusRowTotals.reduce((a, b) => a + b, 0);

    setCell(
      ws,
      totalRowIndex,
      colIndex,
      { formula: `SUM(${refs})`, result: grandTotal },
      {
        font: { bold: true },
        alignment: ALIGN_CENTER,
      },
    );
  }

  // Global borders + global center
  const usedStartRow = headerRowIndex; // include header
  const usedEndRow = totalRowIndex; // through totals
  const usedStartCol = 1;
  const usedEndCol = lastColIndex;

  styleRect(ws, usedStartRow, usedEndRow, usedStartCol, usedEndCol, {
    alignment: ALIGN_CENTER,
  });

  borderRect(
    ws,
    usedStartRow,
    usedEndRow,
    usedStartCol,
    usedEndCol,
    BORDER_THIN,
  );

  // Freeze panes (keep header visible)
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRowIndex }];

  // Autosize columns (bounded)
  for (let c = 1; c <= lastColIndex; c++) {
    let max = 10;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const v: CellValue | undefined = row.getCell(c).value as
        | CellValue
        | undefined;
      const text = cellValueToString(v);
      max = Math.max(max, text.length + 2);
    });
    ws.getColumn(c).width = Math.min(Math.max(max, 10), 40);
  }

  return workbook.xlsx.writeBuffer();
}
