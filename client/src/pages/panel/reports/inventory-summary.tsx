import { pdf } from "@react-pdf/renderer";
import { Download, FileChartPie, FileSearch, Loader2 } from "lucide-react";
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
import { ProjectType, useInventory } from "@/store/inventory";
import { useCategories } from "@/store/category";

// PDF Component
import { ProjectSummaryPDF } from "@/pdf-templates/inventory-summary";

export function InventorySummaryReport() {
  // State hooks
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Inventory hooks
  const { useProjectsStructure, useProjectDetails } = useInventory();
  const { data: categories } = useCategories().useCategoriesList();
  const { data: projectsData, isLoading: isLoadingProjects } =
    useProjectsStructure();
  const { data: projectData, isLoading: isLoadingProjectDetails } =
    useProjectDetails(selectedProject);

  // Memoize projects options to prevent unnecessary re-renders
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
    return `Inventory_Summary_${projectName}_${timestamp}.pdf`;
  }, []);

  // Generate PDF blob
  const generatePDFBlob = useCallback(
    async (project: ProjectType): Promise<Blob> => {
      if (!categories) {
        throw new Error("Categories are required to generate PDF");
      }
      return await pdf(
        <ProjectSummaryPDF project={project} categories={categories} />,
      ).toBlob();
    },
    [categories],
  );

  // Download PDF only
  const handleDownload = useCallback(
    async (project: ProjectType) => {
      if (!project) return;

      setIsGeneratingPDF(true);
      setError(null);

      try {
        // Create a blob from the PDF component
        const blob = await generatePDFBlob(project);

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
        console.error("Error generating PDF:", error);
        setError(
          error instanceof Error ? error.message : "Failed to generate PDF",
        );

        toast({
          title: "PDF Generation Error",
          description:
            "There was a problem generating the PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [generatePDFBlob, generateFilename],
  );

  // Preview PDF only
  const handlePreview = useCallback(
    async (project: ProjectType) => {
      if (!project) return;

      setIsGeneratingPDF(true);
      setError(null);

      try {
        // Create a blob from the PDF component
        const blob = await generatePDFBlob(project);

        // Create a URL for the blob
        const url = URL.createObjectURL(blob);

        // Open PDF in new tab
        const newWindow = window.open(url, "_blank");

        // Check if popup was blocked
        if (!newWindow) {
          console.warn("Pop-up blocked, unable to preview PDF.");
          toast({
            title: "Preview Blocked",
            description:
              "Pop-up was blocked. Please allow pop-ups for this site to preview PDFs.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "PDF Preview Opened",
            description: "The PDF preview has been opened in a new tab.",
            variant: "success",
          });

          // Cleanup the blob URL when window unloads
          newWindow.addEventListener("unload", () => URL.revokeObjectURL(url));
        }

        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      } catch (error) {
        console.error("Error generating PDF:", error);
        setError(
          error instanceof Error ? error.message : "Failed to generate PDF",
        );

        toast({
          title: "PDF Generation Error",
          description:
            "There was a problem generating the PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [generatePDFBlob],
  );

  // Handle download button click
  const handleDownloadClick = useCallback(() => {
    if (projectData?.data) {
      handleDownload(projectData.data);
    } else {
      setError("No project data available");
      toast({
        title: "Error",
        description: "No project data available. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectData, handleDownload]);

  // Handle preview button click
  const handlePreviewClick = useCallback(() => {
    if (projectData?.data) {
      handlePreview(projectData.data);
    } else {
      setError("No project data available");
      toast({
        title: "Error",
        description: "No project data available. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectData, handlePreview]);

  // Determine button state
  const isButtonDisabled =
    !selectedProject || isGeneratingPDF || isLoadingProjectDetails;

  return (
    <Card className="w-72 flex flex-col h-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <FileChartPie className="text-gray-500 h-5 w-5" />
          <span className="text-sm text-muted-foreground font-medium">PDF</span>
        </div>
        <CardTitle className="mt-4">Inventory Summary</CardTitle>
        <CardDescription>Inventory summary in PDF format</CardDescription>
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
            {isGeneratingPDF || isLoadingProjectDetails ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isGeneratingPDF ? "Genera..." : "Loading..."}
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
            onClick={handlePreviewClick}
            disabled={isButtonDisabled}
          >
            {isGeneratingPDF || isLoadingProjectDetails ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isGeneratingPDF ? "Genera..." : "Loading..."}
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
