// routes/index.ts
import type { Express, Router as IRouter } from "express";

import analyticsRoute from "./analytics";
import auditRoute from "./audit";
import authRoute from "./auth";
import bankRoute from "./bank";
import bookingLedgerRoute from "./booking-ledger";
import categoryRoute from "./category";
import clientRoute from "./client";
import clientPartnerRoute from "./client-partner";
import clientBookingRoute from "./clientBooking";
import eoiRoute from "./eoi";
import inventoryRoute from "./inventory";
import roleRoute from "./role";
import targetRoute from "./target";
import userRoute from "./user";
import visitRoute from "./visit";

// Keep the registry in one place:
const ROUTES: Array<{ path: string; router: IRouter }> = [
  { path: "/auth", router: authRoute },
  { path: "/user", router: userRoute },
  { path: "/role", router: roleRoute },
  { path: "/audit", router: auditRoute },
  { path: "/client", router: clientRoute },
  { path: "/client-booking", router: clientBookingRoute },
  { path: "/booking-ledger", router: bookingLedgerRoute },
  { path: "/visit", router: visitRoute },
  { path: "/client-partner", router: clientPartnerRoute },
  { path: "/analytics", router: analyticsRoute },
  { path: "/inventory", router: inventoryRoute },
  { path: "/bank", router: bankRoute },
  { path: "/target", router: targetRoute },
  { path: "/category", router: categoryRoute },
  { path: "/eoi", router: eoiRoute },
];

export function registerRoutes(app: Express, base = "/api") {
  ROUTES.forEach(({ path, router }) => {
    if (!router) {
      console.warn(`Warning: No router found for path ${path}`);
      return;
    }
    app.use(`${base}${path}`, router);
  });
}

// (optional) also export default for convenience
export default registerRoutes;
