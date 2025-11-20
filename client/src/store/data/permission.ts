import { Permission } from "../role";

export const AdminPermissions: Permission[] = [
  {
    page: "Dashboard",
    actions: ["view-dashboard", "view-dashboard-unfiltered"],
  },
  {
    page: "Users",
    actions: [
      "view-users",
      "reset-password",
      "create-user",
      "lock-user",
      "view-details",
      "update-user",
      "delete-user",
    ],
  },
  {
    page: "Clients",
    actions: [
      "view-clients",
      "delete-client",
      "update-client",
      "view-client-details",
      "create-visits",
      "update-visits",
      "delete-visits",
      "create-remarks",
      "delete-remarks",
      "view-all-clients",
      "view-contact-info",
    ],
  },
  {
    page: "ClientPartner",
    actions: [
      "view-client-partner",
      "create-client-partner",
      "update-client-partner",
      "delete-client-partner",
      "view-cp-contacts",
      "view-all-cp",
      "view-cp-details",
      "create-cp-employee",
      "update-cp-employee",
      "delete-cp-employee",
    ],
  },
  {
    page: "Booking",
    actions: [
      "view-booking",
      "update-booking",
      "update-booking-status",
      "delete-booking",
    ],
  },
  {
    page: "BookingLedger",
    actions: [
      "view-booking-ledger",
      "add-booking-payment",
      "restore-booking-payment",
      "delete-booking-payment",
      "view-deleted-booking-payments",
    ],
  },
  {
    page: "Inventory",
    actions: [
      "view-inventory",
      "create-inventory",
      "view-inventory-details",
      "delete-inventory",
      "update-inventory",
      "update-unit",
      "update-unit-status",
    ],
  },
  {
    page: "Form",
    actions: [
      "client-form",
      "client-partner-form",
      "booking-form",
      "cancellation-form",
    ],
  },
  {
    page: "Reports",
    actions: [
      "user-report",
      "client-report",
      "cp-report",
      "inventory-report",
      "inventory-summary-report",
      "booking-report",
      "sales-range-report",
    ],
  },
  { page: "EOI", actions: ["show-eoi-page"] },
  {
    page: "Settings",
    actions: [
      "create-role",
      "update-role",
      "view-role",
      "delete-role",
      "change-precedence",
      "view-audit",
      "view-auth",
      "view-category",
    ],
  },
];

export const DefaultPermissions: Permission[] = [
  {
    page: "Dashboard",
    actions: ["view-dashboard"],
  },
];

interface PermissionAction {
  value: string;
  label: string;
}

interface AvailablePermissionPage {
  page: string;
  pageLabel: string;
  actions: PermissionAction[];
}

export const availablePermissionPages: AvailablePermissionPage[] = [
  {
    page: "Dashboard",
    pageLabel: "Dashboard Sections",
    actions: [
      { value: "view-dashboard", label: "View Dashboard" },
      {
        value: "view-dashboard-unfiltered",
        label: "View Dashboard Unfiltered",
      },
    ],
  },
  {
    page: "Users",
    pageLabel: "Users Sections",
    actions: [
      { value: "view-users", label: "View Users" },
      { value: "create-user", label: "Create new users" },
      { value: "view-details", label: "View user details" },
      { value: "update-user", label: "Update user details" },
      { value: "delete-user", label: "Delete user" },
      { value: "reset-password", label: "Reset user password" },
      { value: "lock-user", label: "Lock users" },
    ],
  },
  {
    page: "Clients",
    pageLabel: "Client Sections",
    actions: [
      { value: "view-clients", label: "View Clients" },
      { value: "delete-client", label: "Delete Client" },
      { value: "update-client", label: "Update Client Details" },
      { value: "view-client-details", label: "View Client Details" },
      { value: "create-visits", label: "Create Client Visit" },
      { value: "update-visits", label: "Update Client Visit" },
      { value: "delete-visits", label: "Delete Client Visit" },
      { value: "create-remarks", label: "Create Visit Remarks" },
      { value: "delete-remarks", label: "Delete Visit Remarks" },
      { value: "view-all-clients", label: "View All Clients" },
      { value: "view-contact-info", label: "View Client Contact Info" },
    ],
  },
  {
    page: "ClientPartner",
    pageLabel: "Channel Partner Sections",
    actions: [
      { value: "view-client-partner", label: "View Channel Partners" },
      { value: "view-cp-contacts", label: "View Channel Partner Contacts" },
      { value: "view-all-cp", label: "View All Channel Partners" },
      { value: "create-client-partner", label: "Create Channel Partner" },
      { value: "update-client-partner", label: "Update Channel Partner" },
      { value: "delete-client-partner", label: "Delete Channel Partner" },
      { value: "view-cp-details", label: "View Channel Partner Details" },
      {
        value: "create-cp-employee",
        label: "Create Channel Partner Employee",
      },
      {
        value: "update-cp-employee",
        label: "Update Channel Partner Employee",
      },
      {
        value: "delete-cp-employee",
        label: "Delete Channel Partner Employee",
      },
    ],
  },
  {
    page: "Booking",
    pageLabel: "Booking Sections",
    actions: [
      { value: "view-booking", label: "View Booking" },
      { value: "update-booking", label: "Update Booking" },
      { value: "update-booking-status", label: "Update Booking Status" },
      { value: "delete-booking", label: "Delete Booking" },
    ],
  },
  {
    page: "BookingLedger",
    pageLabel: "Booking Ledger Sections",
    actions: [
      { value: "view-booking-ledger", label: "View Booking Ledger" },
      { value: "add-booking-payment", label: "Add Booking Payment" },
      { value: "restore-booking-payment", label: "Restore Booking Payment" },
      { value: "delete-booking-payment", label: "Delete Booking Payment" },
      {
        value: "view-deleted-booking-payments",
        label: "View Deleted Booking Payments",
      },
    ],
  },
  {
    page: "Inventory",
    pageLabel: "Inventory Sections",
    actions: [
      { value: "view-inventory", label: "View Inventory" },
      { value: "create-inventory", label: "Create Inventory" },
      { value: "view-inventory-details", label: "View Inventory Details" },
      { value: "delete-inventory", label: "Delete Inventory" },
      { value: "update-inventory", label: "Update Inventory" },
      { value: "update-unit", label: "Update Unit" },
      { value: "update-unit-status", label: "Update Unit Status" },
    ],
  },
  {
    page: "Form",
    pageLabel: "Form Sections",
    actions: [
      { value: "client-form", label: "View Client Form" },
      { value: "client-partner-form", label: "View Client Partner Form" },
      { value: "booking-form", label: "View Booking Form" },
      { value: "cancellation-form", label: "View Cancellation Form" },
    ],
  },
  {
    page: "Reports",
    pageLabel: "Report Sections",
    actions: [
      { value: "user-report", label: "View User Reports" },
      { value: "client-report", label: "View Client Reports" },
      { value: "cp-report", label: "View Client Partner Reports" },
      { value: "inventory-report", label: "View Inventory Reports" },
      {
        value: "inventory-summary-report",
        label: "View Inventory Summary Reports",
      },
      { value: "booking-report", label: "View Booking Reports" },
      { value: "sales-range-report", label: "View Sales Range Reports" },
    ],
  },
  {
    page: "EOI",
    pageLabel: "Eoi Section",
    actions: [{ value: "show-eoi-page", label: "Show EOI Page" }],
  },
  {
    page: "Settings",
    pageLabel: "Settings Sections",
    actions: [
      { value: "create-role", label: "Create Roles" },
      { value: "update-role", label: "View & Update Roles" },
      { value: "view-role", label: "View Roles" },
      { value: "view-audit", label: "View Audit Logs" },
      { value: "delete-role", label: "Delete Roles" },
      { value: "change-precedence", label: "Change Role Precedence" },
      { value: "view-auth", label: "View Auth Logs" },
      { value: "view-category", label: "View Category Section" },
    ],
  },
];
