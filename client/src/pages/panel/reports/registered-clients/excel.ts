// src/utils/excel/registeredClientsExcel.ts
import { RegisteredClientData } from "@/store/registered-clients";
import { autoSizeColumns } from "@/utils/func/excel";
import ExcelJS from "exceljs";

// Format the registered client data for export
const formatRegisteredClientData = (client: RegisteredClientData) => {
  return {
    Date: new Date(client.date).toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    "Registration Date": client.registrationDate
      ? new Date(client.registrationDate).toLocaleString("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-",
    "Client Name": client.name,
    Config: client.config.toUpperCase(),
    Unit: client.unit,
    Wing: client.wing || "-",
    "Agreement Value": `₹${client.agreementValue.toLocaleString("en-IN")}`,
    "Received Amount": `₹${client.receivedAmount.toLocaleString("en-IN")}`,
    "Pending Amount": `₹${(client.agreementValue - client.receivedAmount).toLocaleString("en-IN")}`,
    "Payment %": `${((client.receivedAmount / client.agreementValue) * 100).toFixed(2)}%`,
  };
};

// Export registered clients data to Excel file
export function exportRegisteredClientsToExcel(
  data: RegisteredClientData[],
  projectName?: string,
): void {
  if (!data || data.length === 0) {
    console.warn("No registered clients data to export");
    return;
  }

  const formattedData = data.map((client) =>
    formatRegisteredClientData(client),
  );

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheetName = projectName
    ? `${projectName} - Registered Clients`
    : "Registered Clients";
  const worksheet = workbook.addWorksheet(
    worksheetName.substring(0, 31), // Excel worksheet name limit
  );

  // Get headers from the first data item
  const headers = Object.keys(formattedData[0]);

  // Add columns with headers
  worksheet.columns = headers.map((header) => ({
    header: header,
    key: header,
    width: 12, // Default width, will be auto-sized later
  }));

  // Add rows
  worksheet.addRows(formattedData);

  // Define column alignment: columns 1-3 (Date, Registration Date, Client Name) = left,
  // columns 4-6 (Config, Unit, Wing) = center, columns 7-10 = right
  const columnAlignments: { [key: number]: "left" | "center" | "right" } = {
    1: "left", // Date
    2: "left", // Registration Date
    3: "left", // Client Name
    4: "center", // Config
    5: "center", // Unit
    6: "center", // Wing
    7: "right", // Agreement Value
    8: "right", // Received Amount
    9: "right", // Pending Amount
    10: "right", // Payment %
  };

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" }, // White text
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" }, // Blue background
    };
    cell.alignment = {
      horizontal: columnAlignments[colNumber] || "center",
      vertical: "middle",
    };
  });

  // Apply alignment to data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // Skip header row
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: columnAlignments[colNumber] || "left",
          vertical: "middle",
        };
      });
    }
  });

  // Add total row
  const totalRow = worksheet.addRow({
    Date: "",
    "Registration Date": "",
    "Client Name": "",
    Config: "",
    Unit: "",
    Wing: "",
    "Agreement Value": `₹${data.reduce((sum, c) => sum + c.agreementValue, 0).toLocaleString("en-IN")}`,
    "Received Amount": `₹${data.reduce((sum, c) => sum + c.receivedAmount, 0).toLocaleString("en-IN")}`,
    "Pending Amount": `₹${data.reduce((sum, c) => sum + (c.agreementValue - c.receivedAmount), 0).toLocaleString("en-IN")}`,
    "Payment %": "",
  });

  // Style the total row
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" }, // Light gray background
    };
    cell.alignment = {
      horizontal: columnAlignments[colNumber] || "left",
      vertical: "middle",
    };
  });

  // First cell in total row should say "TOTAL"
  const firstCell = totalRow.getCell(1);
  firstCell.value = "TOTAL";
  firstCell.alignment = { horizontal: "left", vertical: "middle" };

  // Auto size columns
  autoSizeColumns(worksheet);

  // Generate filename
  const fileName = projectName
    ? `${projectName}_Registered_Clients_Report.xlsx`
    : "Registered_Clients_Report.xlsx";

  // Save workbook
  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(downloadLink);
  });
}
