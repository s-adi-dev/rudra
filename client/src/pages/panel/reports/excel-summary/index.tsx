// components/reports/InventorySummaryExcelReport.tsx
import { toast } from "@/hooks/use-toast";
import { ProjectType, useInventory } from "@/store/inventory";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { buildResidentialStatusSummaryWorkbook } from "./excel";

import { Combobox, ComboboxOption } from "@/components/custom ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/store/category";

export function InventorySummaryExcelReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { useProjectsStructure, useProjectDetails } = useInventory();
  const { data: categories } = useCategories().useCategoriesList();
  const { data: projectsData, isLoading: isLoadingProjects } =
    useProjectsStructure();
  const { data: projectData, isLoading: isLoadingProjectDetails } =
    useProjectDetails(selectedProject);

  const projects: ComboboxOption[] = useMemo(
    () =>
      projectsData?.data?.map((project) => ({
        label: project.name,
        value: project._id!,
      })) || [],
    [projectsData?.data],
  );

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    setError(null);
  }, []);

  const generateFilename = useCallback((project: ProjectType): string => {
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split("T")[0];
    return `Inventory_Status_Summary_${projectName}_${timestamp}.xlsx`;
  }, []);

  const generateExcelBlob = useCallback(
    async (project: ProjectType): Promise<Blob> => {
      const buffer = await buildResidentialStatusSummaryWorkbook(
        project,
        categories,
      );
      return new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    },
    [categories],
  );

  const doDownload = useCallback(
    async (project: ProjectType) => {
      setIsGenerating(true);
      setError(null);
      try {
        const blob = await generateExcelBlob(project);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = generateFilename(project);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({
          title: "Excel Downloaded",
          description: "The Excel summary has been downloaded.",
          variant: "success",
        });

        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (err) {
        console.error("Error generating Excel:", err);
        const msg =
          err instanceof Error ? err.message : "Failed to generate Excel";
        setError(msg);
        toast({
          title: "Excel Generation Error",
          description:
            "There was a problem generating the Excel file. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [generateExcelBlob, generateFilename],
  );

  const handleDownloadClick = useCallback(() => {
    if (projectData?.data) {
      doDownload(projectData.data);
    } else {
      setError("No project data available");
      toast({
        title: "Error",
        description: "No project data available. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectData, doDownload]);

  const isButtonDisabled =
    !selectedProject || isGenerating || isLoadingProjectDetails;

  return (
    <Card className="w-72 flex flex-col h-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <FileSpreadsheet className="text-gray-500 h-5 w-5" />
          <span className="text-sm text-muted-foreground font-medium">
            XLSX
          </span>
        </div>
        <CardTitle className="mt-4">Inventory Summary</CardTitle>
        <CardDescription>Inventory summary in XLSX format</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow">
        {error && (
          <Alert variant="destructive" className="mb-3 py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {isLoadingProjects ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects available.
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="mt-auto flex-col gap-3 pt-2">
        <Combobox
          value={selectedProject}
          options={projects}
          onChange={handleProjectSelect}
          width="w-full"
          placeholder="Select Projects"
          disabled={isLoadingProjects || projects.length === 0}
        />
        <div className="w-full gap-2 flex justify-between">
          <Button
            className="w-full"
            variant="default"
            onClick={handleDownloadClick}
            disabled={isButtonDisabled}
          >
            {isGenerating || isLoadingProjectDetails ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isGenerating ? "Genera..." : "Loading..."}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
