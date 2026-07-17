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

type FlatInventoryUnit = {
  wing: string;
  status: string;
  config: string;
  partnerId?: string;
};

type SummarySheetContext = {
  title: string;
  subtitle: string;
  units: FlatInventoryUnit[];
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

function sanitizeWorksheetName(name: string): string {
  const cleaned = name
    .replace(/[\\/*?:\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Sheet";
  return cleaned.slice(0, 31);
}

function uniqueWorksheetName(
  workbook: ExcelJS.Workbook,
  baseName: string,
): string {
  const base = sanitizeWorksheetName(baseName);
  if (!workbook.worksheets.some((sheet) => sheet.name === base)) {
    return base;
  }

  for (let suffix = 2; suffix < 100; suffix++) {
    const maxBaseLength = 31 - String(suffix).length - 1;
    const candidate = `${base.slice(0, maxBaseLength)}-${suffix}`;
    if (!workbook.worksheets.some((sheet) => sheet.name === candidate)) {
      return candidate;
    }
  }

  return `${base.slice(0, 28)}-99`;
}

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

function collectResidentialUnits(project: ProjectType): FlatInventoryUnit[] {
  const flat: FlatInventoryUnit[] = [];

  for (const wing of project.wings ?? []) {
    for (const floor of wing.floors ?? []) {
      if (floor.type !== "residential") continue;
      for (const unit of floor.units ?? []) {
        const status = unit?.status ? norm(unit.status) : "";
        if (!status || status === "others") continue;

        flat.push({
          wing: wing.name,
          status: unit.status!,
          config: (unit.configuration ?? "Unspecified").trim() || "Unspecified",
          partnerId: unit.partnerId,
        });
      }
    }
  }

  return flat;
}

function collectPartnerNames(
  project: ProjectType,
  units: FlatInventoryUnit[],
): string[] {
  const partnerNames: string[] = [];
  const seen = new Set<string>();

  for (const partner of project.partners ?? []) {
    const key = norm(partner);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    partnerNames.push(partner);
  }

  for (const unit of units) {
    if (!unit.partnerId) continue;
    const key = norm(unit.partnerId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    partnerNames.push(unit.partnerId);
  }

  return partnerNames;
}

function filterUnitsForPartner(
  units: FlatInventoryUnit[],
  partnerName?: string,
): FlatInventoryUnit[] {
  if (!partnerName) return units;
  const target = norm(partnerName);
  return units.filter((unit) => norm(unit.partnerId) === target);
}

function writeSummarySheet(
  workbook: ExcelJS.Workbook,
  categories: InventoryCategoryType[] | undefined,
  wingNames: string[],
  context: SummarySheetContext,
): void {
  const ws = workbook.addWorksheet(
    uniqueWorksheetName(workbook, context.title),
  );

  const orderMap = new Map<string, number>();
  categories?.forEach((category, idx) => {
    const displayName = norm(category.displayName);
    const name = norm(category.name);
    if (displayName) orderMap.set(displayName, idx);
    if (name) orderMap.set(name, idx);
  });

  const flat = context.units;

  const statuses = Array.from(new Set(flat.map((row) => row.status))).sort(
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

  const countsByStatusWing: Record<string, Record<string, number>> = {};
  const configCounts: Record<
    string,
    Record<string, Record<string, number>>
  > = {};

  for (const status of statuses) {
    countsByStatusWing[status] = Object.fromEntries(
      wingNames.map((w) => [w, 0]),
    );
    configCounts[status] = {};
  }

  for (const row of flat) {
    if (!countsByStatusWing[row.status]) {
      countsByStatusWing[row.status] = Object.fromEntries(
        wingNames.map((w) => [w, 0]),
      );
    }
    countsByStatusWing[row.status][row.wing] += 1;

    if (!configCounts[row.status][row.config]) {
      configCounts[row.status][row.config] = Object.fromEntries(
        wingNames.map((w) => [w, 0]),
      );
    }
    configCounts[row.status][row.config][row.wing] += 1;
  }

  const totalCols = 1 + wingNames.length + 1;
  const lastColIndex = totalCols;

  ws.mergeCells(1, 1, 1, lastColIndex);
  setCell(ws, 1, 1, context.title, {
    font: { bold: true, size: 16 },
    alignment: ALIGN_CENTER,
  });

  ws.mergeCells(2, 1, 2, lastColIndex);
  setCell(ws, 2, 1, context.subtitle, {
    font: { bold: true },
    alignment: ALIGN_CENTER,
  });

  const headerRowIndex = 4;
  const header = ["Category / Config", ...wingNames, "Total Units"];
  ws.getRow(headerRowIndex).values = header;
  styleRect(ws, headerRowIndex, headerRowIndex, 1, lastColIndex, {
    font: { bold: true },
    fill: FILL_HEADER,
    alignment: ALIGN_CENTER,
  });

  let currentRow = headerRowIndex + 1;
  const statusRowIndices: number[] = [];
  const statusRowTotals: number[] = [];

  for (const status of statuses) {
    setCell(ws, currentRow, 1, status.toUpperCase(), {
      font: { bold: true },
      fill: FILL_STATUS,
      alignment: ALIGN_CENTER,
    });

    let rowTotal = 0;
    wingNames.forEach((wingName, index) => {
      const value = countsByStatusWing[status][wingName] ?? 0;
      rowTotal += value;
      setCell(ws, currentRow, 2 + index, value, {
        font: { bold: true },
        fill: FILL_STATUS,
        alignment: ALIGN_CENTER,
      });
    });

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

    const configs = Object.keys(configCounts[status] || {}).sort(configSort);
    for (const cfg of configs) {
      setCell(ws, currentRow, 1, cfg, { alignment: ALIGN_CENTER });

      let cfgRowTotal = 0;
      wingNames.forEach((wingName, index) => {
        const value = configCounts[status][cfg][wingName] ?? 0;
        cfgRowTotal += value;
        setCell(ws, currentRow, 2 + index, value, { alignment: ALIGN_CENTER });
      });

      setCell(ws, currentRow, lastColIndex, cfgRowTotal, {
        alignment: ALIGN_CENTER,
      });

      currentRow++;
    }

    setCell(ws, currentRow, 1, "");
    currentRow++;
  }

  const totalRowIndex = currentRow;
  setCell(ws, totalRowIndex, 1, "Total", {
    font: { bold: true },
    alignment: ALIGN_CENTER,
  });

  for (let i = 0; i < wingNames.length; i++) {
    const colIndex = 2 + i;
    const wingTotal = statuses.reduce(
      (sum, status) => sum + (countsByStatusWing[status][wingNames[i]] ?? 0),
      0,
    );

    if (statusRowIndices.length > 0) {
      const refs = statusRowIndices.map(
        (row) => `${colLetter(colIndex)}${row}`,
      );
      setCell(
        ws,
        totalRowIndex,
        colIndex,
        { formula: `SUM(${refs.join(",")})`, result: wingTotal },
        {
          font: { bold: true },
          alignment: ALIGN_CENTER,
        },
      );
    } else {
      setCell(ws, totalRowIndex, colIndex, wingTotal, {
        font: { bold: true },
        alignment: ALIGN_CENTER,
      });
    }
  }

  const grandTotal = statusRowTotals.reduce((sum, value) => sum + value, 0);
  if (statusRowIndices.length > 0) {
    const refs = statusRowIndices.map(
      (row) => `${colLetter(lastColIndex)}${row}`,
    );
    setCell(
      ws,
      totalRowIndex,
      lastColIndex,
      { formula: `SUM(${refs.join(",")})`, result: grandTotal },
      {
        font: { bold: true },
        alignment: ALIGN_CENTER,
      },
    );
  } else {
    setCell(ws, totalRowIndex, lastColIndex, grandTotal, {
      font: { bold: true },
      alignment: ALIGN_CENTER,
    });
  }

  const usedStartRow = headerRowIndex;
  const usedEndRow = totalRowIndex;
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

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRowIndex }];

  for (let c = 1; c <= lastColIndex; c++) {
    let max = 10;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const value: CellValue | undefined = row.getCell(c).value as
        | CellValue
        | undefined;
      const text = cellValueToString(value);
      max = Math.max(max, text.length + 2);
    });
    ws.getColumn(c).width = Math.min(Math.max(max, 10), 40);
  }
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

  const allUnits = collectResidentialUnits(project);
  const wingNames = (project.wings ?? []).map((wing) => wing.name);
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  writeSummarySheet(workbook, categories, wingNames, {
    title: project.name || "Project Summary",
    subtitle: `Generated on ${generatedOn}`,
    units: allUnits,
  });

  const partnerNames = collectPartnerNames(project, allUnits);
  for (const partnerName of partnerNames) {
    const partnerUnits = filterUnitsForPartner(allUnits, partnerName);
    writeSummarySheet(workbook, categories, wingNames, {
      title: `${project.name || "Project Summary"} - ${partnerName}`,
      subtitle: `Partner allocation: ${partnerUnits.length} of ${allUnits.length} units | Generated on ${generatedOn}`,
      units: partnerUnits,
    });
  }

  return workbook.xlsx.writeBuffer();
}
