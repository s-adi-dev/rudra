import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLog } from "@/store/audit";
import { splitCamelCaseWords } from "@/utils/func/strUtils";

interface AuditLogTableProps {
  logs: AuditLog[];
  onViewDetails?: (log: AuditLog) => void;
}

function getStatus(
  action: string,
): "success" | "destructive" | "warning" | "info" | "default" {
  switch (action.toLowerCase()) {
    case "create":
      return "success";
    case "delete":
      return "destructive";
    case "update":
      return "warning";
    case "locked":
      return "info";
    case "unlocked":
      return "info";
    default:
      return "default";
  }
}
export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <Card className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-card">
            <TableHead>Timestamp</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length ? (
            logs.map((log) => (
              <TableRow key={log._id} className="hover:bg-secondary/15">
                <TableCell className="whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString("en-GB", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {log.description}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatus(log.event.action)}>
                    {log.event.action.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{splitCamelCaseWords(log.source)}</TableCell>
                <TableCell>{log.actor.username}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-card">
              <TableCell colSpan={5} className="text-center">
                No logs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
