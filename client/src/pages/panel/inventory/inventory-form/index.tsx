import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  FloorType,
  ProjectType,
  useInventory,
  WingType,
} from "@/store/inventory";
import { formatZodMessagesOnly } from "@/utils/func/zodUtils";
import { projectSchema } from "@/utils/zod-schema/inventory";
import { Box } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProjectSection } from "./project-section";
import { WingSection } from "./wing-section";

import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { AvailabilityPDF } from "@/pdf-templates/inventory-chart";
import { InventoryCategoryType, useCategories } from "@/store/category";
import { CustomAxiosError } from "@/utils/types/axios";
import { pdf } from "@react-pdf/renderer";
import { CommercialSection } from "./commercial-section";

const DEFAULT_PROJECT: ProjectType = {
  name: "",
  by: "",
  location: "",
  email: "",
  description: "",
  startDate: new Date().toISOString(),
  status: "planning",
  commercialUnitPlacement: "projectLevel",
  wings: [],
  projectStage: 0,
};

const InventoryForm = () => {
  const { createProjectMutation } = useInventory();
  const { setBreadcrumbs } = useBreadcrumb();
  const [project, setProject] = useState<ProjectType>(DEFAULT_PROJECT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  useEffect(() => {
    setBreadcrumbs([
      { label: "Inventory", to: "/panel/inventory/1" },
      { label: "Form" },
    ]);
  }, [setBreadcrumbs]);

  function handleProjectInputChange(
    field: keyof Omit<ProjectType, "wings">,
    value: string | Date,
  ) {
    setProject({ ...project, [field]: value });
  }

  const handleWingsChange = (wings: WingType[]) => {
    setProject({ ...project, wings });
  };

  const handleCommercialFloorsChange = (commercialFloors: FloorType[]) => {
    setProject({ ...project, commercialFloors: commercialFloors });
  };

  // Function to generate PDF and display in new tab
  const generateAndShowPDF = async (validatedProject: ProjectType) => {
    try {
      setIsGeneratingPDF(true);

      // Create a blob from the PDF component
      const blob = await pdf(
        <AvailabilityPDF
          project={validatedProject}
          categories={sortedCategories}
        />,
      ).toBlob();

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);

      // Open PDF in new tab
      window.open(url, "_blank");

      toast({
        title: "PDF Generated Successfully",
        description: "The availability chart PDF has been opened in a new tab.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Error",
        description:
          "There was a problem generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const processProject = (project: unknown) => {
    const validation = projectSchema.safeParse(project);
    if (!validation.success) {
      toast({
        title: "Form Submission Error",
        description: formatZodMessagesOnly(validation.error.errors),
        variant: "warning",
      });
      return null;
    }

    // Apply business logic based on commercialUnitPlacement
    const validatedProject = validation.data as ProjectType;

    if (validatedProject.commercialUnitPlacement === "projectLevel") {
      // If commercial units are at project level, remove any commercialFloors from wings
      validatedProject.wings = validatedProject.wings.map((wing) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { commercialFloors, ...wingWithoutCommercialFloors } = wing;
        return wingWithoutCommercialFloors;
      });
    } else if (validatedProject.commercialUnitPlacement === "wingLevel") {
      // If commercial units are at wing level, remove commercialFloors from project
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { commercialFloors, ...projectWithoutCommercialFloors } =
        validatedProject;
      return projectWithoutCommercialFloors;
    }

    return validatedProject;
  };

  const handlePreview = async () => {
    const validatedData = processProject(project);
    if (!validatedData) return;

    // Generate PDF with validated data
    await generateAndShowPDF(validatedData);
  };

  const handleSubmit = async () => {
    const validatedData = processProject(project);
    if (!validatedData) return;

    try {
      setIsSubmitting(true);

      // Submitting logic
      await createProjectMutation.mutateAsync(validatedData);

      toast({
        title: "Success",
        description: "Project created successfully",
        variant: "success",
      });

      setProject(DEFAULT_PROJECT);
    } catch (error) {
      const Err = error as CustomAxiosError;
      if (Err.response?.data.error) {
        toast({
          title: "Error occurred",
          description: `Failed to create project. ${Err.response?.data.error}`,
          variant: "destructive",
        });
      } else
        toast({
          title: "Error occurred",
          description: "Failed to create project. Please try again.",
          variant: "destructive",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-[90svw] lg:w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Box className="h-5 w-5" />
          Inventory Form
        </CardTitle>
        <CardDescription>
          Enter the basic details of the real estate project
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Project Information Section */}
          <ProjectSection
            project={project}
            onProjectChange={handleProjectInputChange}
          />

          {project.commercialUnitPlacement == "projectLevel" && (
            <CommercialSection
              commercialFloors={project.commercialFloors}
              onCommercialFloorsChange={handleCommercialFloorsChange}
            />
          )}

          {/* Wings Section */}
          <WingSection
            wings={project.wings || []}
            onWingsChange={handleWingsChange}
            showCommercialFloors={
              project.commercialUnitPlacement == "wingLevel"
            }
          />
        </div>
      </CardContent>
      <CardFooter className="flex-col sm:flex-row sm:justify-end gap-3 sm:gap-2">
        <Button
          className="w-full sm:w-auto flex justify-center items-center gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Save Project Information"}
        </Button>
        <Button
          className="w-full sm:w-auto flex justify-center items-center gap-2"
          onClick={handlePreview}
          disabled={isGeneratingPDF || isLoadingCategories}
        >
          {isGeneratingPDF ? "Generating PDF..." : "Preview Layout"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InventoryForm;
