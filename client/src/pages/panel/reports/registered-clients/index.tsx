// src/components/reports/RegisteredClientsReport.tsx
import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory } from "@/store/inventory";
import { useRegisteredClients } from "@/store/registered-clients";
import { logReportAction } from "@/utils/report-audit-logger";
import type { userType } from "@/store/users/types";
import type { CombinedRoleType } from "@/store/role/types";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { exportRegisteredClientsToExcel } from "./excel";

interface RegisteredClientsReportProps {
  user: userType | null;
  combinedRole: CombinedRoleType | null;
}

export function RegisteredClientsReport({
  user,
  combinedRole,
}: RegisteredClientsReportProps) {
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Fetch projects list
  const { useProjectsStructure } = useInventory();
  const { data: projectsData } = useProjectsStructure();
  const projects = projectsData?.data || [];

  // Fetch registered clients data
  const { useRegisteredClientsByProject } = useRegisteredClients();
  const { data, isFetching } = useRegisteredClientsByProject(selectedProject, {
    includeStatuses: "registered",
  });

  // Handle export action
  const handleDownload = async () => {
    if (data?.data && data.data.length > 0 && user) {
      const projectName =
        projects.find((p) => p.name === selectedProject)?.name ||
        selectedProject;

      // Log the download action
      await logReportAction(
        user._id,
        user.username || "",
        {
          action: "download",
          reportType: "Payment Report",
          description: `Downloaded Payment Report for ${projectName} with ${data.data.length} records`,
        },
        combinedRole?.roles || [],
      );

      exportRegisteredClientsToExcel(data.data, projectName);
    } else {
      console.log("No registered clients data available");
    }
  };

  // Check if download should be disabled
  const isDownloadDisabled =
    !selectedProject || !data?.data || data.data.length === 0 || isFetching;

  return (
    <Card className="w-72 flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500" />
          <span className="text-sm text-gray-500 uppercase">XLSX</span>
        </div>
        <CardTitle className="mt-4">Payment Report</CardTitle>
        <CardDescription>
          Download registered clients payment data by project
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label htmlFor="project-select">Select Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project-select">
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Tooltip
          content={
            !selectedProject
              ? "Please select a project"
              : isDownloadDisabled
                ? "No data available"
                : "Download Excel report"
          }
        >
          <Button
            className="w-full"
            variant="default"
            onClick={handleDownload}
            disabled={isDownloadDisabled}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </Tooltip>
      </CardFooter>
    </Card>
  );
}
