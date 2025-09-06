import { pdf } from "@react-pdf/renderer";
import { Download, FileBox, FileSearch, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// Components
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

// Hooks and state
import { toast } from "@/hooks/use-toast";
import type { InventoryCategoryType } from "@/store/category";
import { useCategories } from "@/store/category";
import { ProjectType, useInventory } from "@/store/inventory";

// PDF Component
import { AvailabilityPDF } from "@/pdf-templates/inventory-chart";

export function InventoryReport() {
  // State hooks
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPreviewingPDF, setIsPreviewingPDF] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Inventory hooks
  const { useProjectsStructure, useProjectDetails } = useInventory();
  const { data: projectsData, isLoading: isLoadingProjects } =
    useProjectsStructure();
  const { data: projectData, isLoading: isLoadingProjectDetails } =
    useProjectDetails(selectedProject);

  // Categories (fetched in parent; passed to PDF)
  const { useCategoriesList } = useCategories();
  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategoriesList();

  const sortedCategories = useMemo<InventoryCategoryType[]>(
    () =>
      [...(categories || [])].sort((a, b) =>
        a.precedence !== b.precedence
          ? a.precedence - b.precedence
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [categories],
  );

  // Memoize projects options
  const projects: ComboboxOption[] = useMemo(
    () =>
      projectsData?.data?.map((project) => ({
        label: project.name,
        value: project._id!,
      })) || [],
    [projectsData?.data],
  );

  // Handler for project selection
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    setError(null); // Reset any previous errors
  }, []);

  // Generate filename for the PDF
  const generateFilename = useCallback((project: ProjectType): string => {
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split("T")[0];
    return `Availability_Chart_${projectName}_${timestamp}.pdf`;
  }, []);

  // Generate and download PDF
  const downloadPDF = useCallback(
    async (project: ProjectType) => {
      if (!project) return;
      if (!sortedCategories.length) {
        toast({
          title: "Missing data",
          description: "Categories not loaded yet.",
          variant: "destructive",
        });
        return;
      }

      setIsGeneratingPDF(true);
      setError(null);

      try {
        const blob = await pdf(
          <AvailabilityPDF project={project} categories={sortedCategories} />,
        ).toBlob();

        // Create a URL for the blob
        const url = URL.createObjectURL(blob);

        // Generate filename
        const filename = generateFilename(project);

        // Download the PDF
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast({
          title: "PDF Downloaded Successfully",
          description: "The PDF has been downloaded to your device.",
          variant: "success",
        });

        // Clean up the blob URL after a delay to ensure download completes
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      } catch (error) {
        console.error("Error downloading PDF:", error);
        setError(
          error instanceof Error ? error.message : "Failed to download PDF",
        );

        toast({
          title: "PDF Download Error",
          description:
            "There was a problem downloading the PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [sortedCategories, generateFilename],
  );

  // Preview
  const previewPDF = useCallback(
    async (project: ProjectType) => {
      if (!project) return;
      if (!sortedCategories.length) {
        toast({
          title: "Missing data",
          description: "Categories not loaded yet.",
          variant: "destructive",
        });
        return;
      }

      setIsPreviewingPDF(true);
      setError(null);

      try {
        const blob = await pdf(
          <AvailabilityPDF project={project} categories={sortedCategories} />,
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, "_blank");

        if (!newWindow) {
          toast({
            title: "Preview Blocked",
            description:
              "Pop-up was blocked. Please allow pop-ups to preview the PDF.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "PDF Preview Opened",
            description: "The PDF preview has been opened in a new tab.",
            variant: "success",
          });

          newWindow.addEventListener("unload", () => URL.revokeObjectURL(url));
        }

        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        console.error("Error previewing PDF:", error);
        setError(
          error instanceof Error ? error.message : "Failed to preview PDF",
        );
        toast({
          title: "PDF Preview Error",
          description:
            "There was a problem previewing the PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsPreviewingPDF(false);
      }
    },
    [sortedCategories],
  );

  // Button states
  const isDownloadDisabled =
    !selectedProject ||
    isGeneratingPDF ||
    isLoadingProjectDetails ||
    isLoadingCategories;

  const isPreviewDisabled =
    !selectedProject ||
    isPreviewingPDF ||
    isLoadingProjectDetails ||
    isLoadingCategories;

  return (
    <Card className="w-72 flex flex-col h-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <FileBox className="text-gray-500 h-5 w-5" />
          <span className="text-sm text-muted-foreground font-medium">PDF</span>
        </div>
        <CardTitle className="mt-4">Availability Chart</CardTitle>
        <CardDescription>
          Detailed availability chart in PDF format
        </CardDescription>
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
            onClick={() => projectData?.data && downloadPDF(projectData.data)}
            disabled={isDownloadDisabled}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloa...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => projectData?.data && previewPDF(projectData.data)}
            disabled={isPreviewDisabled}
          >
            {isPreviewingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preview...
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
