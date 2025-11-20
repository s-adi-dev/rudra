type NavLinkType = {
  pageName: string;
  icon: string;
  label: string;
  to: string;
};
// navLinks.js
export const NavLinks: NavLinkType[] = [
  {
    pageName: "Dashboard",
    icon: "LayoutDashboard",
    label: "Dashboard",
    to: "/dashboard",
  },
  {
    pageName: "Users",
    icon: "UserRound",
    label: "Users",
    to: "/users",
  },
  {
    pageName: "Clients",
    icon: "Scroll",
    label: "Client List",
    to: "/clients/1",
  },
  {
    pageName: "ClientPartner",
    icon: "Handshake",
    label: "Channel Partners",
    to: "/client-partners/1",
  },
  {
    pageName: "Booking",
    icon: "Ticket",
    label: "Booking List",
    to: "/booking",
  },
  {
    pageName: "Inventory",
    icon: "Inbox",
    label: "Inventory",
    to: "/inventory",
  },
  { pageName: "Form", icon: "ReceiptText", label: "Form", to: "/form" },
  {
    pageName: "Reports",
    icon: "TriangleAlert",
    label: "Reports",
    to: "/reports",
  },
  {
    pageName: "EOI",
    icon: "Bookmark",
    label: "EOI",
    to: "/eoi/1",
  },
  {
    pageName: "Settings",
    icon: "Bolt",
    label: "Settings",
    to: "/settings",
  },
];

export function getLabelForPage(pageName: string): string | undefined {
  const found = NavLinks.find((link) => link.pageName === pageName);
  return found ? found.label : pageName;
}

// Example list that has notification
// {
//   pageName: "WebsitePages",
//   icon: "Globe",
//   label: "Pages",
//   to: "/pages",
//   notifications: "5",
// }
