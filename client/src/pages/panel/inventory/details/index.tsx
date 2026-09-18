import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { CenterWrapper } from "@/components/custom ui/center-page";
import ErrorCard from "@/components/custom ui/error-display";
import { Loader } from "@/components/custom ui/loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/store/auth";
import { hasPermission } from "@/hooks/use-role";
import {
  commercialUnitPlacementType,
  FloorType,
  projectStatus,
  ProjectType,
  useInventory,
} from "@/store/inventory";
import { CustomAxiosError } from "@/utils/types/axios";
import { isEqual } from "lodash";
import { Box, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BankDetailsDisplay } from "./bank-details-display";
import ProjectDetailsFooter from "./footer";
import { ProjectInfo } from "./project-info";
import { WingInfo } from "./wing-info";
import { AddFloorDialog } from "./add-floor-dialog";

function ProjectCommercialFloors({ floors }: { floors: FloorType[] }) {
  if (!floors.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No commercial floors added yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2">Floor</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Units</th>
            <th className="px-3 py-2">Area</th>
          </tr>
        </thead>
        <tbody>
          {floors.map((floor) => (
            <tr
              key={floor._id || floor.displayNumber}
              className="border-b last:border-0"
            >
              <td className="px-3 py-2">{floor.displayNumber}</td>
              <td className="px-3 py-2 capitalize">{floor.type}</td>
              <td className="px-3 py-2">{floor.units.length}</td>
              <td className="px-3 py-2">
                {floor.showArea ? "Shown" : "Hidden"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InventoryDetails() {
  // Hooks
  const { setBreadcrumbs } = useBreadcrumb();
  const { useProjectDetails, updateProjectMutation, deleteProjectMutation } =
    useInventory();
  const { logout: handleLogout } = useAuth(true);
  const { combinedRole } = useAuth(true);
  const canCreateFloor = hasPermission(
    combinedRole,
    "Inventory",
    "create-floor",
  );
  const { id, pageno } = useParams<{ id: string; pageno: string }>();
  const pageNo = Number(pageno) || 1;
  const navigate = useNavigate();
  const dialog = useAlertDialog({
    iconName: "CircleFadingArrowUp",
    title: "Update Project",
    description: "Are you sure you want to update this project",
    alertType: "Warn",
    actionLabel: "Confirm",
    cancelLabel: "Cancel",
  });
  const { data, isLoading, error } = useProjectDetails(id!);

  // Initialize state with proper default values
  const [isEditable, setIsEditable] = useState(false);
  const [originalProject, setOriginalProject] = useState<
    ProjectType | undefined
  >(undefined);
  const [editableProject, setEditableProject] = useState<
    ProjectType | undefined
  >(undefined);
  const [isAddProjectFloorOpen, setIsAddProjectFloorOpen] = useState(false);

  function handleProjectChange(
    field: keyof Omit<ProjectType, "_id" | "wings" | "commercialFloors">,
    value: Date | string | projectStatus | commercialUnitPlacementType,
  ) {
    if (!editableProject) return;
    const updatedProject = {
      ...editableProject,
      [field]: value,
    };
    setEditableProject(updatedProject);
  }

  async function handleUpdateProject() {
    if (!isEqual(originalProject, editableProject)) {
      dialog.show({
        config: {
          actionLabel: "Update",
        },
        onAction: () => {
          try {
            if (originalProject?._id) {
              updateProjectMutation.mutateAsync({
                projectId: originalProject?._id,
                ...editableProject,
              });

              toast({
                title: "Updated Project",
                description: "updated project details",
                variant: "success",
              });
            }
          } catch (error) {
            console.log(error);
            const err = error as CustomAxiosError;
            toast({
              title: "Error Occurred",
              description:
                err.response?.data.error ||
                err.message ||
                "unkown error occurred while updating project details",
              variant: "destructive",
            });
          }
        },
        onCancel: () => {
          setEditableProject(originalProject);
          setIsEditable(false);
        },
      });
    }
  }

  async function handleDeleteProject() {
    dialog.show({
      config: {
        iconName: "Trash",
        title: "Delete Project",
        description: `Are you sure you want to delete the project "${originalProject?.name}"?`,
        alertType: "Danger",
        actionLabel: "Delete",
      },
      onAction: async () => {
        try {
          if (originalProject?._id) {
            await deleteProjectMutation.mutateAsync(originalProject?._id);
            navigate("/panel/inventory/1");
            toast({
              title: "Project Deleted",
              description: "The project was successfully deleted.",
            });
          }
        } catch (error) {
          console.log(error);
          const err = error as CustomAxiosError;
          toast({
            title: "Error Occurred",
            description:
              err.response?.data.error ||
              err.message ||
              "unkown error occurred while deleting project",
            variant: "destructive",
          });
        }
      },
    });
  }

  function handleEditToggle() {
    if (isEditable == true) handleUpdateProject();
    setIsEditable(!isEditable);
  }

  // useEffects
  useEffect(() => {
    setBreadcrumbs([
      { label: "Inventory", to: `/panel/inventory/${pageNo}` },
      {
        label: "Details",
      },
    ]);
  }, [setBreadcrumbs, pageNo]);

  useEffect(() => {
    if (data?.data) {
      setEditableProject(data.data);
      setOriginalProject(data.data);
    }
  }, [data?.data]);

  if (!id || error) {
    const { response, message } = (error as CustomAxiosError) || {};
    let errMsg = response?.data?.error ?? message;
    if (errMsg === "Access denied. No token provided") {
      errMsg = "Access denied. No token provided please login again";
    } else if (errMsg === "Network Error") {
      errMsg =
        "Connection issue detected. Please check your internet or try again later.";
    }
    return (
      <CenterWrapper className="px-2 gap-2 text-center">
        <ErrorCard
          title="Error occurred"
          description={errMsg || "An unknown error occurred"}
          btnTitle="Go to Login"
          onAction={handleLogout}
        />
      </CenterWrapper>
    );
  }

  if (isLoading) {
    return (
      <CenterWrapper>
        <Loader />
      </CenterWrapper>
    );
  }

  return (
    <Card className="w-[90svw] lg:w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Box className="h-5 w-5" />
          {originalProject?.name}
        </CardTitle>
        <CardDescription>
          {`Inventory overview for the ${originalProject?.name || "selected"} project`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProjectInfo
          project={editableProject}
          onProjectChange={handleProjectChange}
          isEditable={isEditable}
        />

        <WingInfo
          projectId={editableProject?._id || id}
          wings={editableProject?.wings || []}
        />

        {editableProject?.commercialUnitPlacement === "projectLevel" && (
          <div className="mt-6 border-t pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium">
                  Project commercial floors
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add commercial inventory that is not assigned to a wing.
                </p>
              </div>
              {canCreateFloor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddProjectFloorOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add floor
                </Button>
              )}
            </div>
            <ProjectCommercialFloors
              floors={editableProject.commercialFloors || []}
            />
            {canCreateFloor && (
              <AddFloorDialog
                projectId={editableProject._id || id}
                open={isAddProjectFloorOpen}
                onOpenChange={setIsAddProjectFloorOpen}
              />
            )}
          </div>
        )}

        {editableProject?.bank && (
          <div className="mt-6">
            <BankDetailsDisplay
              holderName={editableProject.bank.holderName}
              accountNumber={editableProject.bank.accountNumber}
              name={editableProject.bank.name}
              branch={editableProject.bank.branch}
              ifscCode={editableProject.bank.ifscCode}
              accountType={editableProject.bank.accountType}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <ProjectDetailsFooter
          isEditable={isEditable}
          hasBank={!!editableProject?.bank}
          bankDetails={editableProject?.bank}
          handleEditToggle={handleEditToggle}
          projectId={editableProject?._id}
          handleDeleteProject={handleDeleteProject}
        />
      </CardFooter>
      <dialog.AlertDialog />
    </Card>
  );
}
