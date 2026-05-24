import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { CenterWrapper } from "@/components/custom ui/center-page";
import ErrorCard from "@/components/custom ui/error-display";
import { Loader } from "@/components/custom ui/loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/store/auth";
import {
  ClientPartnerType,
  useClientPartners,
  useClientPartnerStore,
} from "@/store/client-partner";
import { formatZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";
import { companySchema } from "@/utils/zod-schema/client-partner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmployeesInfo } from "./cp-employee-info";
import { CPFotter } from "./cp-footer";
import { ClientPartnerInfo } from "./cp-info";

const DEFAULT_CP = {
  name: "",
  ownerName: "",
  email: "",
  phoneNo: "",
  address: "",
  notes: "",
  companyWebsite: "",
  employees: [],
};

const ClientPartnerDetails = () => {
  // Hooks
  const { setBreadcrumbs } = useBreadcrumb();
  const {
    useClientPartnerDetails,
    deleteClientPartnerMutation,
    updateClientPartnerMutation,
  } = useClientPartners();
  const { selectedClientPartnerId } = useClientPartnerStore();
  const { logout: handleLogout } = useAuth(true);
  const { id, pageno } = useParams<{ id: string; pageno: string }>();
  const pageNo = Number(pageno) || 1;
  const navigate = useNavigate();
  const cpId = id || selectedClientPartnerId;
  const dialog = useAlertDialog({
    alertType: "Info",
    iconName: "Star",
    title: "Action Required",
    description: "Are you sure?",
    actionLabel: "Confirm",
    cancelLabel: "Cancel",
  });

  // Data
  const { data, isLoading, error } = useClientPartnerDetails(cpId!);

  // States
  const [clientPatner, setClientPartner] =
    useState<ClientPartnerType>(DEFAULT_CP);
  const [editableClientPatner, setEditableClientPartner] =
    useState<ClientPartnerType>(DEFAULT_CP);
  const [isEditable, setIsEditable] = useState(false);

  // Event Handlers
  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(clientPatner) !== JSON.stringify(editableClientPatner)
    );
  }, [clientPatner, editableClientPatner]);

  const handleCancel = useCallback(() => {
    setEditableClientPartner({ ...clientPatner });
    setIsEditable(false);
  }, [clientPatner]);

  const handleDelete = useCallback(() => {
    dialog.show({
      config: {
        iconName: "Trash2",
        alertType: "Danger",
        title: "Delete Client Partner",
        description: `Are you sure you want to delete client partner ${clientPatner.name}?`,
        actionLabel: "Delete",
      },
      onAction: async () => {
        try {
          await deleteClientPartnerMutation.mutateAsync(clientPatner._id!);
          toast({
            title: "Success",
            description: "Client Partner deleted successfully",
          });
          navigate(`/panel/client-partners/1`);
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description:
              err.response?.data.error || "Failed to delete client partner",
            variant: "destructive",
          });
        }
      },
    });
  }, [clientPatner, deleteClientPartnerMutation, navigate, dialog]);

  const handleSave = useCallback(() => {
    dialog.show({
      config: {
        iconName: "CircleFadingArrowUp",
        alertType: "Warn",
        title: "Update Client Partner",
        description: `Are you sure you want to update client partner ${clientPatner.name}?`,
        actionLabel: "Update",
      },
      onAction: async () => {
        try {
          // Extract client data excluding _id and visits
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, cpId, employees, ...clientPartnerData } =
            editableClientPatner;

          const validation = companySchema.safeParse(clientPartnerData);

          if (!validation.success) {
            const errorMessages = formatZodErrors(validation.error.errors);

            toast({
              title: "Form Validation Error",
              description: `Please correct the following errors:\n${errorMessages}`,
              variant: "warning",
            });
            return;
          }

          // Call the update mutation
          await updateClientPartnerMutation.mutateAsync({
            id: _id!,
            ...clientPartnerData,
          });

          // Update original client with new data
          setClientPartner(editableClientPatner);
          setIsEditable(false);

          toast({
            title: "Success",
            description: "Client partner updated successfully",
            variant: "success",
          });
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description:
              err.response?.data.error || "Failed to update client partner",
            variant: "destructive",
          });
        }
      },
      onCancel: () => {
        handleCancel();
      },
    });
  }, [
    dialog,
    handleCancel,
    clientPatner,
    setClientPartner,
    editableClientPatner,
    updateClientPartnerMutation,
  ]);

  const handleEditToggle = useCallback(() => {
    if (isEditable) {
      // If in edit mode
      if (hasChanges) {
        // If there are changes, show confirmation dialog
        handleSave();
      } else {
        setIsEditable(false);
      }
    } else {
      // Enter edit mode
      setEditableClientPartner({ ...clientPatner });
      setIsEditable(true);
    }
  }, [isEditable, hasChanges, clientPatner, handleSave]);

  const handleInputChange = useCallback(
    (field: keyof ClientPartnerType, value: string) => {
      setEditableClientPartner((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // useEffects
  useEffect(() => {
    setBreadcrumbs([
      { label: "Channel Partner List", to: `/panel/client-partners/${pageNo}` },
      {
        label: "Channel Partner Details",
      },
    ]);
  }, [setBreadcrumbs, pageNo]);

  useEffect(() => {
    if (data) {
      setClientPartner(data);
      setEditableClientPartner(data);
    }
  }, [data]);

  // Error handling
  if (!cpId || error) {
    const { response, message } = (error as CustomAxiosError) || {};
    let errMsg = response?.data.error ?? message;

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
    <Card className="w-[90svw] [@media(min-width:900px)]:w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl mb-2 sm:text-2xl">
          {clientPatner.name}
        </CardTitle>

        <CardDescription>
          Channel partner details and employee's information
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-6">
          {/* Company Info */}
          <ClientPartnerInfo
            data={editableClientPatner}
            handleInputChange={handleInputChange}
            isEditable={isEditable}
          />

          {/* Employee Info */}
          <EmployeesInfo
            data={editableClientPatner}
            pageCursor={{ pageNo: pageNo, _id: cpId }}
          />

          {/* Controls */}
          <CPFotter
            cpId={cpId}
            isEditable={isEditable}
            handleDelete={handleDelete}
            handleUpdate={handleEditToggle}
            currentCP={clientPatner}
          />
        </div>
        <dialog.AlertDialog />
      </CardContent>
    </Card>
  );
};

export default ClientPartnerDetails;
