import { Tooltip } from "@/components/custom ui/tooltip-provider";
import { Button } from "@/components/ui/button";
import {
  GitPullRequestArrow,
  Save,
  SquarePen,
  Trash2,
  UserPlus2,
} from "lucide-react";
import { useState } from "react";
import EmployeeFormDialog from "./employee-form";
import CPManagementModal from "./cp-management-modal";
import { useAuth } from "@/store/auth";
import { hasPermission } from "@/hooks/use-role";
import { ClientPartnerType } from "@/store/client-partner";

interface CPFotterProps {
  cpId: string;
  isEditable: boolean;
  handleDelete: () => void;
  handleUpdate: () => void;
  currentCP?: ClientPartnerType;
}

export const CPFotter = ({
  cpId,
  isEditable,
  handleDelete,
  handleUpdate,
  currentCP,
}: CPFotterProps) => {
  const { combinedRole } = useAuth(true);
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  // Permissions
  const deleteCP = hasPermission(
    combinedRole,
    "ClientPartner",
    "delete-client-partner",
  );
  const updateCP = hasPermission(
    combinedRole,
    "ClientPartner",
    "update-client-partner",
  );
  const mergeCP = hasPermission(combinedRole, "ClientPartner", "merge-cp");
  const addEmployee = hasPermission(
    combinedRole,
    "ClientPartner",
    "create-cp-employee",
  );
  const mergeEmployee = hasPermission(
    combinedRole,
    "ClientPartner",
    "merge-cp-employee",
  );

  const transferEmployee = hasPermission(
    combinedRole,
    "ClientPartner",
    "transfer-cp-employee",
  );

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {(mergeCP || mergeEmployee || transferEmployee) && currentCP && (
          <Tooltip content="Manage Client Partner">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              size="icon"
              onClick={() => setMergeModalOpen(true)}
            >
              <GitPullRequestArrow />
            </Button>
          </Tooltip>
        )}
        {deleteCP && (
          <Tooltip content="Delete Client Partner">
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 />
            </Button>
          </Tooltip>
        )}

        {updateCP && (
          <Tooltip
            content={isEditable ? "Save Client Partner" : "Edit Client Partner"}
          >
            <Button
              className={`text-white ${
                isEditable
                  ? "bg-green-700 hover:bg-green-600"
                  : "bg-blue-700 hover:bg-blue-600"
              }`}
              size="icon"
              onClick={handleUpdate}
            >
              {isEditable ? <Save /> : <SquarePen />}
            </Button>
          </Tooltip>
        )}

        {addEmployee && (
          <>
            <Tooltip content="Add Employee">
              <Button
                size="icon"
                className="text-white bg-yellow-600 hover:bg-yellow-500"
                onClick={() => setEmployeeFormOpen(true)}
              >
                <UserPlus2 strokeWidth={2} />
              </Button>
            </Tooltip>
            <EmployeeFormDialog
              cpId={cpId}
              isOpen={employeeFormOpen}
              onOpenChange={setEmployeeFormOpen}
              mode="add"
            />
          </>
        )}
      </div>

      {/* Merge Modal */}
      {currentCP && (
        <CPManagementModal
          isOpen={mergeModalOpen}
          onOpenChange={setMergeModalOpen}
          currentCP={currentCP}
        />
      )}
    </>
  );
};
