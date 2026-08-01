import ganpatiImage from "@/assets/ganpati.png";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";
import { BookingType } from "./utils";

import RobotoBold from "@/fonts/roboto/Roboto-Bold.ttf";
import RobotoBoldItalic from "@/fonts/roboto/Roboto-BoldItalic.ttf";
import RobotoItalic from "@/fonts/roboto/Roboto-Italic.ttf";
import RobotoRegular from "@/fonts/roboto/Roboto-Regular.ttf";
import {
  formatToCurrency,
  numberToWords,
  simplifyNumber,
} from "@/utils/func/numberUtils";
import { addNumberingToLines, formatAddress } from "@/utils/func/strUtils";

export interface calculationsType {
  agreementValue: number;
  registrationCharges: number;
  stampDuty: number;
  gst: number;
}

interface BookingFormProps {
  data: BookingType;
  calculationMode: "manual" | "automatic";
  metaData: { manager: string; cp: string };
  calculations?: calculationsType;
}

// Register fonts with better performance loading
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: RobotoRegular,
      fontWeight: "normal",
      fontStyle: "normal",
    },
    {
      src: RobotoBold,
      fontWeight: "bold",
      fontStyle: "normal",
    },
    {
      src: RobotoItalic,
      fontWeight: "normal",
      fontStyle: "italic",
    },
    {
      src: RobotoBoldItalic,
      fontWeight: "bold",
      fontStyle: "italic",
    },
  ],
});

// Optimized styles with better naming conventions and organization
const styles = StyleSheet.create({
  // Layout
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontSize: 10,
    fontFamily: "Roboto",
    position: "relative", // Important for positioning elements
  },
  container: {
    border: "2pt solid black",
    padding: 20,
    flexDirection: "column",
    gap: 8,
    flex: 1,
    position: "relative", // Important for positioning elements
  },
  row: {
    flexDirection: "row",
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  spaceAround: { justifyContent: "space-around" },
  flexEnd: {
    justifyContent: "flex-end",
  },

  // Column layouts
  col10: { width: "10%" },
  col20: { width: "20%" },
  col25: { width: "25%" },
  col30: { width: "30%" },
  col33: { width: "33%" },
  col45: { width: "45%" },
  col50: { width: "50%" },
  col55: { width: "55%" },

  // Typography
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  subHeading: {
    textDecoration: "underline",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  bold: { fontWeight: "bold" },
  center: { textAlign: "center" },
  small: { fontSize: 8 },
  underline: { textDecoration: "underline" },

  // Table styles
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
  },
  tableRowLast: {
    flexDirection: "row",
    borderBottomWidth: 0,
  },
  tableColHeader: {
    width: "33.33%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 5,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableCol: {
    width: "33.33%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 5,
    textAlign: "center",
  },
  tableColLast: {
    width: "33.33%",
    padding: 5,
    textAlign: "center",
  },
  tableColFull: {
    width: "100%",
    padding: 5,
  },

  // Automatic mode 2-column table styles
  tableColHeader2: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 5,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableCol2: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 5,
  },
  tableColLast2: {
    width: "50%",
    padding: 5,
    textAlign: "right",
  },

  // Spacing
  mt16: { marginTop: 16 },
  mt12: { marginTop: 12 },
  mt8: { marginTop: 8 },
  mb4: { marginBottom: 4 },
  gap2: { gap: 2 },
  gap4: { gap: 4 },
  gap5: { gap: 5 },
  gap10: { gap: 10 },
  gap15: { gap: 15 },

  // Signature
  signatureBlock: {
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderTopStyle: "solid",
    width: 150,
    marginBottom: 2,
  },

  // logoContainer
  logoContainer: {
    position: "absolute",
    top: -20, // Space from the top of the container
    left: 0,
    right: 0, // Set both left and right to 0 to span full width
    flexDirection: "row",
    justifyContent: "center", // Center the image horizontally
    alignItems: "center",
    zIndex: 1, // Ensure it's above other content
  },

  // Section separator
  separator: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
  },

  // Section container
  section: {
    marginTop: 2,
    marginBottom: 2,
  },

  // Bottom signatures positioning
  bottomSignatures: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Spacer to push content
  contentSpacer: {
    marginBottom: 70, // Creates space for the absolute positioned signature block
  },

  // New styles for copy indicator
  copyIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 70,
    color: "#BBBBBB",
    opacity: 0.3,
    transform: "rotate(-45deg)",
    display: "flex",
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 100,
    overflow: "hidden",
  },

  // Page break style
  pageBreak: {
    height: 0,
    pageBreakAfter: "always",
  },
});

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Label with bold text before colon
const LabeledText = ({ label, value }: { label: string; value: string }) => (
  <Text>
    <Text style={styles.bold}>{label}: </Text>
    {value}
  </Text>
);

// Component for a single booking form
const BookingFormPage = ({
  data,
  metaData,
  calculationMode,
  calculations,
  isCustomerCopy = false,
}: {
  data: BookingType;
  metaData: { manager: string; cp: string };
  calculationMode: "manual" | "automatic";
  isCustomerCopy?: boolean;
  calculations?: calculationsType;
}) => {
  const [labelPart, valuePart] = data.unit.wing
    ? data.unit.wing.toUpperCase().split(/ (.+)/)
    : "";
  return (
    <Page
      size={calculationMode === "automatic" ? "LEGAL" : "A4"}
      style={styles.page}
    >
      <View style={styles.container}>
        {/* Copy Indicator */}
        {isCustomerCopy && (
          <View style={styles.copyIndicator}>
            <Text style={styles.bold}>CUSTOMER COPY</Text>
          </View>
        )}
        {/* Header Section */}
        <View style={styles.section}>
          <View style={styles.logoContainer}>
            <Image src={ganpatiImage} style={{ width: 30, height: 30 }} />
          </View>
          <Text style={styles.heading}>{data.project.name.toUpperCase()}</Text>
          <Text style={[styles.bold, styles.center, { marginBottom: 4 }]}>
            Project By: {data.project.by.toUpperCase()}
          </Text>
          <Text style={styles.center}>{data.project.address}</Text>
          <Text style={[styles.subHeading, styles.mt8]}>
            BOOKING APPLICATION FORM
          </Text>
        </View>

        {/* Date field */}
        <View style={[styles.row, styles.flexEnd]}>
          <LabeledText
            label="DATE"
            value={formatDate(data.bookingDetails.date.toString())}
          />
        </View>

        {/* Applicant Information */}
        <View style={[styles.section, styles.gap2]}>
          <LabeledText
            label="APPLICANT NAME"
            value={data.applicants.primary.toUpperCase()}
          />
          <LabeledText
            label="CO-APPLICANT NAME"
            value={
              data.applicants.coApplicant
                ? data.applicants.coApplicant.toUpperCase()
                : "_______________________"
            }
          />
          <LabeledText
            label="ADDRESS"
            value={formatAddress(data.applicants.contact.address)}
          />
        </View>

        {/* Contact Information */}
        <View style={[styles.row, styles.gap15, styles.section]}>
          <View>
            <LabeledText
              label="MOBILE NO"
              value={data.applicants.contact.phoneNo}
            />
          </View>
          <View>
            <LabeledText
              label="RESIDENCE NO"
              value={
                data.applicants.contact.residenceNo
                  ? data.applicants.contact.residenceNo
                  : "_________________"
              }
            />
          </View>
          <View>
            <LabeledText
              label="EMAIL"
              value={
                data.applicants.contact.email
                  ? data.applicants.contact.email.toLowerCase()
                  : "________________________________"
              }
            />
          </View>
        </View>

        <View style={styles.separator} />

        {/* Property Details */}
        <View style={[styles.row, styles.section]}>
          <View style={styles.col20}>
            <LabeledText
              label={
                data.type == "residential"
                  ? "FLAT NO"
                  : `${data.unit.configuration.toUpperCase()} NO`
              }
              value={data.unit.unitNo}
            />
          </View>
          {data.type == "residential" && data.unit.wing && (
            <View style={styles.col20}>
              <LabeledText
                label={labelPart || "WING"}
                value={valuePart || "Unkown"}
              />
            </View>
          )}
          {data.type == "commercial" && data.unit.area && (
            <View style={styles.col20}>
              <LabeledText
                label="AREA"
                value={`${data.unit.area.toString()}Sq.ft.`}
              />
            </View>
          )}

          <View style={styles.col20}>
            <LabeledText label="FLOOR" value={data.unit.floor} />
          </View>
          <View style={styles.col30}>
            <LabeledText
              label="CONFIGURATION"
              value={data.unit.configuration.toUpperCase()}
            />
          </View>

          <View style={styles.col10}>
            <Text style={styles.bold}>
              {"A-" + (simplifyNumber(data.bookingDetails.av) || 0)}
            </Text>
          </View>
        </View>

        {/* Cost Table Section */}
        {calculationMode === "manual" && (
          <View style={[styles.section]}>
            <View style={styles.table}>
              {/* Header Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader}>
                  <Text>DESCRIPTION</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text>RATE</Text>
                </View>
                <View style={[styles.tableColHeader, { borderRightWidth: 0 }]}>
                  <Text>AMOUNT (Rs.)</Text>
                </View>
              </View>

              {/* Data Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text>UNIT COST</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text>LUMP SUM</Text>
                </View>
                <View style={styles.tableColLast}>
                  <Text>₹{formatToCurrency(data.payment.amount)}</Text>
                </View>
              </View>

              {/* Notes Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableColFull}>
                  <Text>{data.payment.includedChargesNote}</Text>
                </View>
              </View>

              {/* Amount in Words Row */}
              <View style={styles.tableRowLast}>
                <View style={styles.tableColFull}>
                  <Text>
                    <Text style={styles.bold}>Rupees in Words: </Text>
                    {numberToWords(data.payment.amount)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {calculationMode === "automatic" && calculations && (
          <View style={[styles.section]}>
            <View style={styles.table}>
              {/* Column Header Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader2}>
                  <Text>DESCRIPTION</Text>
                </View>
                <View style={[styles.tableColHeader2, { borderRightWidth: 0 }]}>
                  <Text>AMOUNT (Rs.)</Text>
                </View>
              </View>

              {/* Agreement Value Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableCol2}>
                  <Text>AGREEMENT VALUE</Text>
                </View>
                <View style={styles.tableColLast2}>
                  <Text>₹{formatToCurrency(calculations.agreementValue)}</Text>
                </View>
              </View>

              {/* Stamp Duty Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableCol2}>
                  <Text>STAMP DUTY</Text>
                </View>
                <View style={styles.tableColLast2}>
                  <Text>₹{formatToCurrency(calculations.stampDuty)}</Text>
                </View>
              </View>

              {/* Registration Fees Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableCol2}>
                  <Text>REGISTRATION FEES</Text>
                </View>
                <View style={styles.tableColLast2}>
                  <Text>
                    ₹{formatToCurrency(calculations.registrationCharges)}
                  </Text>
                </View>
              </View>

              {/* G.S.T Row */}
              <View style={styles.tableRow}>
                <View style={styles.tableCol2}>
                  <Text>G.S.T</Text>
                </View>
                <View style={styles.tableColLast2}>
                  <Text>₹{formatToCurrency(calculations.gst)}</Text>
                </View>
              </View>

              {/* Total Row */}
              <View style={styles.tableRow}>
                <View style={[styles.tableCol2, styles.bold]}>
                  <Text style={styles.bold}>TOTAL VALUE OF THE FLAT</Text>
                </View>
                <View style={styles.tableColLast2}>
                  <Text style={styles.bold}>
                    ₹
                    {formatToCurrency(
                      calculations.agreementValue +
                        calculations.registrationCharges +
                        calculations.stampDuty +
                        calculations.gst,
                    )}
                  </Text>
                </View>
              </View>

              {/* Amount in Words Row (spans both columns) */}
              <View style={styles.tableRow}>
                <View style={styles.tableColFull}>
                  <Text>
                    <Text style={styles.bold}>Rupees in Words: </Text>
                    {numberToWords(
                      calculations.agreementValue +
                        calculations.registrationCharges +
                        calculations.stampDuty +
                        calculations.gst,
                    )}
                  </Text>
                </View>
              </View>

              {/* Parking Info Row (spans both columns) */}
              <View style={styles.tableRowLast}>
                <View style={styles.tableColFull}>
                  <Text>{data.payment.includedChargesNote}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bank Information */}
        {data.type == "residential" && (
          <View style={styles.section}>
            <LabeledText
              label={
                data.payment.banks && data.payment.banks?.length > 0
                  ? "SELECTED BANK FOR LOAN"
                  : "PAYMENT MODE"
              }
              value={data.payment.banks?.join(", ") || "SELF FUNDING"}
            />
          </View>
        )}

        <View style={styles.separator} />

        {data.type == "residential" && (
          <React.Fragment>
            {/* Notes Section */}
            <View style={[styles.row, styles.section]}>
              {/* Extra Charges */}
              <View style={[styles.col45, styles.small, styles.gap4]}>
                <Text style={[styles.bold, styles.underline, { fontSize: 10 }]}>
                  Extra:
                </Text>
                <Text>
                  1) Rs.15000 Advocate Charges at the time of Registration.
                </Text>
                <Text>2) Maintenance at the time of Possession.</Text>
                <Text>
                  3) Society Charges Rs.1 Lakh at the time of Possession.
                </Text>
              </View>

              {/* Notes */}
              <View style={[styles.col55, styles.small, styles.gap4]}>
                <Text style={[styles.bold, styles.underline, { fontSize: 10 }]}>
                  Note:
                </Text>
                <Text>
                  1) Token amount less than Rs.50,000/- is Non-Refundable after
                  15 days.
                </Text>
                <Text>2) Registration within 30 days from Booking date.</Text>
              </View>
            </View>

            {/* First Signature Block */}
            <View style={[styles.row, styles.flexEnd, styles.mt8]}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text>APPLICANT SIGNATURE</Text>
              </View>
            </View>
          </React.Fragment>
        )}

        {data.type == "commercial" && (
          <React.Fragment>
            {/* Notes Section */}
            <View style={[styles.row, styles.section]}>
              {/* Extra Charges */}
              <View style={[styles.col50, styles.small, styles.gap4]}>
                <Text style={[styles.bold, styles.underline, { fontSize: 10 }]}>
                  EXTRA CHARGES: AT THE TIME OF REGISTRATION
                </Text>
                <Text>
                  1) Development Charges (₹400 x {data.unit.area}Sq.ft.) = ₹
                  {data.unit.area && 400 * data.unit.area}/-
                </Text>
                <Text>2) Society Charges = ₹1,00,000/-</Text>
                <Text>3) Advocate Charges = ₹15,000/-</Text>
                <Text>4) Maintenance at the time of Possession.</Text>
              </View>

              {/* Notes */}
              <View style={[styles.col50, styles.small, styles.gap4]}>
                <Text style={[styles.bold, styles.underline, { fontSize: 10 }]}>
                  Note:
                </Text>
                <Text>
                  1) Token amount less than Rs.50,000/- is Non-Refundable. after
                  15 days.
                </Text>
              </View>
            </View>

            {/* First Signature Block */}
            <View style={[styles.row, styles.flexEnd, styles.mt8]}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text>APPLICANT SIGNATURE</Text>
              </View>
            </View>
          </React.Fragment>
        )}

        <View style={styles.separator} />

        {/* Payment Terms */}
        <View style={styles.section}>
          <Text style={styles.subHeading}>PAYMENT TERMS</Text>
          <Text>{addNumberingToLines(data.payment.paymentTerms)}</Text>
        </View>

        <View style={styles.separator} />

        {/* Payment Details */}
        <View style={[styles.row, styles.section]}>
          <View style={styles.col50}>
            <LabeledText
              label="BOOKING AMOUNT"
              value={`₹${formatToCurrency(data.bookingDetails.bookingAmt)}`}
            />
          </View>
          <View style={styles.col50}>
            <LabeledText
              label="CHEQUE NO"
              value={data.bookingDetails.checkNo}
            />
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View style={styles.col50}>
            <LabeledText
              label="BANK NAME"
              value={data.bookingDetails.bankName}
            />
          </View>
          <View style={styles.col50}>
            <LabeledText
              label="DATE"
              value={formatDate(data.bookingDetails.paymentDate.toString())}
            />
          </View>
        </View>

        <View style={styles.separator} />

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.subHeading}>
            HOW DID YOU GET TO KNOW ABOUT OUR PROJECT
          </Text>

          <View style={[styles.row, styles.gap15, styles.mt16]}>
            <LabeledText label="HOARDING" value={"_______________________"} />
            <LabeledText label="WEBSITE" value={"_______________________"} />
            <LabeledText label="FRIEND" value={"_________________________"} />
          </View>
          <View
            style={[styles.row, styles.gap15, styles.mt16, styles.spaceBetween]}
          >
            <LabeledText
              label="CHANNEL PARTNER"
              value={
                !isCustomerCopy
                  ? metaData.cp
                  : "________________________________"
              }
            />
            <LabeledText
              label="SALES MANAGER"
              value={
                !isCustomerCopy
                  ? metaData.manager
                  : "__________________________"
              }
            />
          </View>
        </View>

        {calculationMode === "automatic" && calculations && (
          <View style={styles.separator} />
        )}

        {/* Final Signatures - Absolutely positioned at bottom */}
        <View style={styles.bottomSignatures}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text>AUTHORISED SIGNATORY</Text>
          </View>

          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text>APPLICANT SIGNATURE</Text>
          </View>
        </View>
      </View>
    </Page>
  );
};

export const BookingForm = ({
  data,
  metaData,
  calculationMode,
  calculations,
}: BookingFormProps) => {
  return (
    <Document>
      {/* Original */}
      <BookingFormPage
        data={data}
        metaData={metaData}
        calculationMode={calculationMode}
        calculations={calculations}
      />

      {/* Customer Copy */}
      <BookingFormPage
        data={data}
        metaData={metaData}
        calculationMode={calculationMode}
        calculations={calculations}
        isCustomerCopy
      />
    </Document>
  );
};
