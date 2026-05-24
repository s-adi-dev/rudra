import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission } from "@/hooks/use-role";
import { useAuth } from "@/store/auth";
import { ClientType, GetClientsResponse } from "@/store/client";
import { RefernceListType, useClientPartners } from "@/store/client-partner";
import {
  customReferenceOptions,
  requirementOptions,
} from "@/store/data/options";
import { usersSummaryType, useUsersSummary } from "@/store/users";
import { getLabelFromValue } from "@/utils/func/arrayUtils";
import { simplifyNumber } from "@/utils/func/numberUtils.ts";
import { toProperCase } from "@/utils/func/strUtils";
import { ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface ClientTableProps {
  data?: GetClientsResponse;
  openDetails: (_id: string) => void;
  showContactInfo: boolean;
}

function getStatusClr(status: string | null) {
  switch (status) {
    case "lost":
      return "destructive";
    case "cold":
      return "info";
    case "warm":
      return "warning";
    case "hot":
      return "urgent";
    case "booked":
      return "success";
    default:
      return "default";
  }
}

export const ClientTable = ({
  data,
  openDetails,
  showContactInfo = false,
}: ClientTableProps) => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { data: managers } = useUsersSummary();
  const { useReferenceWithDelete } = useClientPartners();
  const { data: refData } = useReferenceWithDelete();

  const { combinedRole } = useAuth(true);
  const showDetails = hasPermission(
    combinedRole,
    "Clients",
    "view-client-details",
  );

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      [id]: !prev[id],
    }));
  };

  const getRefernceName = (
    ref: string,
    references: RefernceListType[] | undefined,
  ) => {
    if (!references || !ref) return ref;
    const reference = references.find((r) => r._id === ref);
    return reference ? reference.companyName : ref;
  };

  const getManagerName = (
    username: string,
    managers: usersSummaryType[] | undefined,
  ) => {
    if (!managers || !username) return username;
    const manager = managers.find((m) => m.username === username);
    return manager ? manager.firstName : username;
  };

  useEffect(() => {
    const newHeights: Record<string, number> = {};
    Object.keys(contentRefs.current).forEach((id) => {
      const element = contentRefs.current[id];
      if (element) {
        newHeights[id] = element.scrollHeight;
      }
    });
    setHeights(newHeights);
  }, [data?.clients]);

  return (
    <div className="rounded-md border w-full">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Relation</TableHead>
            <TableHead>Closing</TableHead>
            <TableHead>Status</TableHead>
            {showDetails && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data?.clients?.length ? (
            <TableRow>
              <TableCell colSpan={showDetails ? 10 : 9} className="text-center">
                No Client Data
              </TableCell>
            </TableRow>
          ) : (
            data.clients.map((client: ClientType) => {
              const clientId = client._id.toString();
              const isOpen = openItems[clientId] || false;

              return (
                <React.Fragment key={clientId}>
                  <TableRow
                    className={`transition-colors duration-200 ${isOpen ? "bg-muted/30" : ""}`}
                    onClick={() => toggleItem(clientId)}
                  >
                    <TableCell>
                      {client.visits[0]
                        ? new Date(client.visits[0].date)
                            .toLocaleString("en-GB", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })
                            .replace(",", "")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {client.firstName} {client.lastName}
                    </TableCell>
                    <TableCell>
                      {getLabelFromValue(
                        requirementOptions,
                        client.requirement,
                      )}
                    </TableCell>
                    <TableCell>₹{simplifyNumber(client.budget)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {customReferenceOptions.includes(
                        client.visits[0].reference,
                      )
                        ? `${client.visits[0].reference} - ${client.visits[0].otherRefs}`
                        : getRefernceName(
                            client.visits[0].reference,
                            refData?.references,
                          )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getManagerName(client.visits[0].source, managers)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getManagerName(client.visits[0].relation, managers)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getManagerName(client.visits[0].closing, managers)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusClr(client.visits[0].status)}>
                        {toProperCase(client.visits[0].status ?? "N/A")}
                      </Badge>
                    </TableCell>
                    {showDetails && (
                      <TableCell>
                        <Tooltip content="View client details">
                          <Button
                            variant="secondary"
                            size="miniIcon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(client._id);
                            }}
                          >
                            <ChevronRight />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow className="expandable-row">
                    <TableCell
                      colSpan={showDetails ? 10 : 9}
                      className="p-0 border-b border-t-0"
                    >
                      <div
                        style={{
                          height: isOpen
                            ? `${heights[clientId] || 0}px`
                            : "0px",
                          opacity: isOpen ? 1 : 0,
                          overflow: "hidden",
                          transition: "height 0.3s ease, opacity 0.3s ease",
                        }}
                      >
                        <div
                          ref={(e) => (contentRefs.current[clientId] = e)}
                          className="p-4 bg-muted/50"
                        >
                          <div className="rounded-md bg-muted/70 p-4 shadow-sm grid grid-cols-2 items-center gap-1">
                            {showContactInfo && (
                              <>
                                <span className="flex items-center gap-3">
                                  <h4 className="text-sm font-bold">Email:</h4>
                                  <p className="text-sm">
                                    {client.email?.trim() || "N/A"}
                                  </p>
                                </span>
                                <span className="flex items-center gap-3">
                                  <h4 className="text-sm font-bold">
                                    Phone No:
                                  </h4>
                                  <p className="text-sm">{client.phoneNo}</p>
                                </span>
                              </>
                            )}
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">Occupation:</h4>
                              <p className="text-sm">
                                {client.occupation?.trim() || "N/A"}
                              </p>
                            </span>

                            {showContactInfo && (
                              <span className="flex items-center gap-3">
                                <h4 className="text-sm font-bold">Alt No:</h4>
                                <p className="text-sm">
                                  {client.altNo?.trim() || "N/A"}
                                </p>
                              </span>
                            )}

                            <span className="col-span-2 flex items-center gap-3">
                              <h4 className="text-sm font-bold">Project:</h4>
                              <p className="text-sm">
                                {client.project || "N/A"}
                              </p>
                            </span>
                            <span className="col-span-2 flex items-center justify-start gap-3">
                              <h4 className="text-sm font-bold">Remark:</h4>
                              <p className="text-sm">
                                {client.visits?.[0]?.remarks?.[0]?.remark ??
                                  "No remark"}
                              </p>
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
