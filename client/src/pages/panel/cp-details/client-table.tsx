import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBreadcrumbStore } from "@/hooks/use-breadcrumb";
import { PopulatedVisit } from "@/store/client";
import { usersSummaryType, useUsersSummary } from "@/store/users";
import { toProperCase } from "@/utils/func/strUtils";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CP_ClientTableProps {
  data: PopulatedVisit[];
  pageCursor: { pageNo: number; _id: string };
}

export const CP_ClientTable = ({ data, pageCursor }: CP_ClientTableProps) => {
  // Hooks
  const { data: managers } = useUsersSummary();
  const { setBreadcrumbItems } = useBreadcrumbStore();
  const navigate = useNavigate();

  // Helper Functions
  const getManagerName = (
    username: string,
    managers: usersSummaryType[] | undefined,
  ) => {
    if (!managers || !username) return username;
    const manager = managers.find((m) => m.username === username);
    return manager ? manager.firstName : username;
  };

  function handleClientClick(name: string, clientId: string) {
    setBreadcrumbItems([
      {
        label: "Client Partner List",
        to: `/panel/client-partners/${pageCursor.pageNo}`,
      },
      {
        label: "Client Partner Details",
        to: `/panel/client-partners/${pageCursor.pageNo}/details/${pageCursor._id}`,
      },
      { label: `${name}` },
    ]);

    navigate(`/panel/clients/1/details/${clientId}`);
  }

  return (
    <div className="border p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead className="text-center">Date</TableHead>
            <TableHead className="text-center">Name</TableHead>
            <TableHead className="text-center">Source</TableHead>
            <TableHead className="text-center">Relation</TableHead>
            <TableHead className="text-center">Closing</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!(data.length > 0) ? (
            <TableRow className="hover:bg-card">
              <TableCell className="text-center" colSpan={6}>
                No Clients Available
              </TableCell>
            </TableRow>
          ) : (
            data.map((visit) => {
              return (
                <TableRow key={visit._id} className="hover:bg-card">
                  <TableCell className="text-center">
                    {new Date(visit.date)
                      .toLocaleString("en-GB", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                      .replace(",", "")}
                  </TableCell>
                  <TableCell className="text-center">
                    {visit.client.firstName + " " + visit.client.lastName}
                  </TableCell>
                  <TableCell className="text-center">
                    {getManagerName(visit.source, managers)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getManagerName(visit.relation, managers)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getManagerName(visit.closing, managers)}
                  </TableCell>
                  <TableCell className="text-center">
                    {toProperCase(visit.status || "")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="miniIcon"
                      variant="secondary"
                      onClick={() =>
                        handleClientClick(
                          `${visit.client.firstName} ${visit.client.lastName}`,
                          visit.client._id!,
                        )
                      }
                    >
                      <ChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
