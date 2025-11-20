import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EoiType, GetEoisResponse } from "@/store/eoi";
import { usersSummaryType, useUsersSummary } from "@/store/users";
import { simplifyNumber } from "@/utils/func/numberUtils.ts";
import { Ban, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface EoiTableProps {
  data?: GetEoisResponse;
  openDetails: (_id: string) => void;
}

export const EoiTable = ({ data, openDetails }: EoiTableProps) => {
  const { data: managers } = useUsersSummary();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      [id]: !prev[id],
    }));
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
  }, [data?.data]);

  const getManagerName = (
    username: string,
    managers: usersSummaryType[] | undefined,
  ) => {
    if (!managers || !username) return username;
    const manager = managers.find((m) => m.username === username);
    return manager ? manager.firstName : username;
  };

  return (
    <div className="rounded-md border w-full">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead>Date</TableHead>
            <TableHead>EOI No</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Config</TableHead>
            <TableHead>EOI Amount</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data?.data?.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No EOI Data
              </TableCell>
            </TableRow>
          ) : (
            data.data.map((eoi: EoiType) => {
              const eoiId = eoi._id.toString();
              const isOpen = openItems[eoiId] || false;

              return (
                <React.Fragment key={eoiId}>
                  <TableRow
                    className={`transition-colors duration-200 cursor-pointer ${isOpen ? "bg-muted/30" : ""} ${eoi.status == "booked" ? "bg-green-200 hover:bg-green-200" : ""}`}
                    onClick={() => toggleItem(eoiId)}
                  >
                    <TableCell>
                      {new Date(eoi.date)
                        .toLocaleString("en-GB", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                        .replace(",", "")}
                    </TableCell>
                    <TableCell className="font-medium">{eoi.eoiNo}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {eoi.applicant || "N/A"}
                    </TableCell>
                    <TableCell>{eoi.config}</TableCell>
                    <TableCell>₹{simplifyNumber(eoi.eoiAmt)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getManagerName(eoi.manager, managers)}
                    </TableCell>
                    <TableCell>
                      <Tooltip content="View Booking Form">
                        <Button
                          variant="secondary"
                          size="miniIcon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(eoi._id);
                          }}
                          disabled={eoi.status == "booked"}
                        >
                          {eoi.status == "booked" ? (
                            <Ban className="h-5 w-5 text-red-500" />
                          ) : (
                            <ChevronRight />
                          )}
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow className="expandable-row">
                    <TableCell colSpan={7} className="p-0 border-b border-t-0">
                      <div
                        style={{
                          height: isOpen ? `${heights[eoiId] || 0}px` : "0px",
                          opacity: isOpen ? 1 : 0,
                          overflow: "hidden",
                          transition: "height 0.3s ease, opacity 0.3s ease",
                        }}
                      >
                        <div
                          ref={(e) => (contentRefs.current[eoiId] = e)}
                          className="p-4 bg-muted/50"
                        >
                          <div className="rounded-md bg-muted/70 p-4 shadow-sm grid grid-cols-2 items-center gap-3">
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">Contact:</h4>
                              <p className="text-sm">{eoi.contact || "N/A"}</p>
                            </span>
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">
                                Alt Contact:
                              </h4>
                              <p className="text-sm">{eoi.alt || "N/A"}</p>
                            </span>
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">CP:</h4>
                              <p className="text-sm">{eoi.cp || "N/A"}</p>
                            </span>
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">PAN:</h4>
                              <p className="text-sm">{eoi.pan || "N/A"}</p>
                            </span>
                            <span className="flex items-center gap-3">
                              <h4 className="text-sm font-bold">Aadhar:</h4>
                              <p className="text-sm">{eoi.aadhar || "N/A"}</p>
                            </span>
                            <span className="col-span-2 flex items-center gap-3">
                              <h4 className="text-sm font-bold">Address:</h4>
                              <p className="text-sm">{eoi.address || "N/A"}</p>
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
