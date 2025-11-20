import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import { EoiModel } from "./models/eoi"; // Adjust the path to your model

interface RawEOIData {
  date: string;
  applicant?: string;
  contact: number | string;
  alt: number | string;
  config: string;
  eoiAmt: number;
  eoiNo: number;
  manager: string;
  cp: string;
  pan: string;
  aadhar: number | string;
  address: string;
}

// MongoDB connection string
// const MONGO_URI = process.env.MONGO || "mongodb://localhost:27017/rudra";
const MONGO_URI =
  process.env.MONGO ||
  "mongodb+srv://sradityadev:B2CbuXiBaPEKFhUj@cluster0.az5to.mongodb.net/rudra?retryWrites=true&w=majority&appName=Cluster0";

// Function to parse date in MM/DD/YY format
function parseDate(dateStr: string): Date {
  const [month, day, year] = dateStr.split("/");
  const fullYear =
    parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
  return new Date(fullYear, parseInt(month) - 1, parseInt(day));
}

// Function to validate and clean data
function cleanData(data: RawEOIData[]): any[] {
  return data
    .map((item, index) => {
      try {
        const cleaned: any = {
          date: parseDate(item.date),
          applicant: item.applicant?.trim() || null,
          contact: item.contact ? parseInt(item.contact.toString()) : null,
          alt: item.alt ? parseInt(item.alt.toString()) : null,
          config: item.config?.trim() || "",
          eoiAmt: item.eoiAmt || 0,
          eoiNo: item.eoiNo,
          manager: item.manager?.trim() || "",
          cp: item.cp?.trim() || null,
          pan: item.pan?.trim().toUpperCase() || null,
          aadhar: item.aadhar ? parseInt(item.aadhar.toString()) : null,
          address: item.address?.trim() || null,
        };

        return cleaned;
      } catch (error) {
        console.error(`Error cleaning data at index ${index}:`, error);
        return null;
      }
    })
    .filter((item) => item !== null);
}

async function importData(
  jsonFilePath: string,
  skipValidation: boolean = false,
) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Read JSON file
    const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
    const rawData: RawEOIData[] = JSON.parse(fileContent);
    console.log(`📄 Found ${rawData.length} records in JSON file`);

    // Clean data
    const cleanedData = cleanData(rawData);
    console.log(`🧹 Cleaned ${cleanedData.length} records`);

    // Import data
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < cleanedData.length; i++) {
      try {
        if (skipValidation) {
          // Insert without validation for records with missing required fields
          await EoiModel.collection.insertOne(cleanedData[i]);
        } else {
          // Use model validation
          await EoiModel.create(cleanedData[i]);
        }
        successCount++;
        console.log(
          `✅ Imported record ${i + 1}/${cleanedData.length} - EOI No: ${cleanedData[i].eoiNo}`,
        );
      } catch (error: any) {
        errorCount++;
        errors.push({
          record: cleanedData[i],
          error: error.message,
        });
        console.error(
          `❌ Error importing record ${i + 1} (EOI No: ${cleanedData[i].eoiNo}):`,
          error.message,
        );
      }
    }

    // Summary
    console.log("\n📊 Import Summary:");
    console.log(`   Total records: ${cleanedData.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n❌ Failed Records:");
      errors.forEach((err, idx) => {
        console.log(
          `   ${idx + 1}. EOI No: ${err.record.eoiNo} - ${err.error}`,
        );
      });

      // Save errors to file
      const errorFilePath = path.join(
        path.dirname(jsonFilePath),
        "import-errors.json",
      );
      fs.writeFileSync(errorFilePath, JSON.stringify(errors, null, 2));
      console.log(`\n📝 Error details saved to: ${errorFilePath}`);
    }
  } catch (error) {
    console.error("💥 Fatal error during import:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// CLI Usage
const args = process.argv.slice(2);
const jsonFilePath = args[0] || "./data-new.json";
const skipValidation = args.includes("--skip-validation");

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ File not found: ${jsonFilePath}`);
  console.log(
    "\nUsage: ts-node importEOI.ts <path-to-json-file> [--skip-validation]",
  );
  process.exit(1);
}

console.log(`\n🚀 Starting EOI data import from: ${jsonFilePath}`);
console.log(`   Skip validation: ${skipValidation}\n`);

importData(jsonFilePath, skipValidation)
  .then(() => {
    console.log("\n✨ Import process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Import process failed:", error);
    process.exit(1);
  });
