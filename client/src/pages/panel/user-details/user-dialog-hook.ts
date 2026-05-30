import { useAlertDialog } from "@/components/custom ui/alertDialog";
import { useToast } from "@/hooks/use-toast";
import {
  useSoftDeleteUser,
  useRestoreUser,
  useResetPassword,
  useUpdateUser,
} from "@/store/users";
import { userType } from "@/store/users";
import { FullUserSchema } from "@/utils/zod-schema/user";
import { formatZodErrors } from "@/utils/func/zodUtils";
import { CustomAxiosError } from "@/utils/types/axios";

interface UseUserDialogsProps {
  userId: string;
  userData: Partial<userType>;
  originalData: Partial<userType>;
  username: string;
  currentUserId?: string;
  isEditable: boolean;
  setEditable: (value: boolean) => void;
  setUserData: React.Dispatch<React.SetStateAction<Partial<userType>>>;
  setTempPass: (password: string) => void;
  setIsCredentialsOpen: (isOpen: boolean) => void;
  hasChanges: () => boolean;
}

export const useUserDialogs = ({
  userId,
  userData,
  originalData,
  username,
  currentUserId,
  isEditable,
  setEditable,
  setUserData,
  setTempPass,
  setIsCredentialsOpen,
  hasChanges,
}: UseUserDialogsProps) => {
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const softDeleteUser = useSoftDeleteUser();
  const restoreUser = useRestoreUser();
  const resetPassword = useResetPassword();

  const dialog = useAlertDialog({
    alertType: "Info",
    iconName: "Star",
    title: "Action Required",
    description: "Are you sure?",
    actionLabel: "Confirm",
    cancelLabel: "Cancel",
  });

  const handleUpdate = async () => {
    if (!isEditable) {
      setEditable(true);
      return;
    }

    if (!hasChanges()) {
      setEditable(false);
      return;
    }

    const validation = FullUserSchema.safeParse(userData);
    if (!validation.success) {
      toast({
        title: "Form Validation Error",
        description: `Please correct the following errors:\n${formatZodErrors(validation.error.errors)}`,
        variant: "warning",
      });
      return;
    }

    dialog.show({
      config: {
        iconName: "Save",
        alertType: "Success",
        title: "Update User",
        description: `Are you sure you want to update ${username}?`,
        actionLabel: "Update",
      },
      onAction: async () => {
        try {
          if (originalData.isLocked === userData.isLocked) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isLocked, ...updatedUserData } = userData;
            await updateUser.mutateAsync({ userId, updates: updatedUserData });
          } else {
            await updateUser.mutateAsync({ userId, updates: userData });
          }

          toast({
            title: "Success",
            description: "User updated successfully",
            variant: "success",
          });
          console.log(userData);
          setEditable(false);
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description: err.response?.data.error || "Failed to update user",
            variant: "destructive",
          });
        }
      },
      onCancel: () => {
        setUserData(originalData);
        setEditable(false);
      },
    });
  };

  const handleDelete = () => {
    dialog.show({
      config: {
        iconName: "Trash2",
        alertType: "Danger",
        title: "Soft Delete User",
        description: `Are you sure you want to soft delete ${username}? This action can be reversed.`,
        actionLabel: "Soft Delete",
      },
      onAction: async () => {
        try {
          await softDeleteUser.mutateAsync(userId);
          toast({
            title: "Success",
            description: "User soft deleted successfully",
            variant: "success",
          });
          setUserData((prev: Partial<userType>) => ({
            ...prev,
            isDeleted: true,
          }));
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description:
              err.response?.data.error || "Failed to soft delete user",
            variant: "destructive",
          });
        }
      },
    });
  };

  const handleRestore = () => {
    dialog.show({
      config: {
        iconName: "RotateCcw",
        alertType: "Success",
        title: "Restore User",
        description: `Are you sure you want to restore ${username}?`,
        actionLabel: "Restore",
      },
      onAction: async () => {
        try {
          await restoreUser.mutateAsync(userId);
          toast({
            title: "Success",
            description: "User restored successfully",
            variant: "success",
          });
          setUserData((prev: Partial<userType>) => ({
            ...prev,
            isDeleted: false,
          }));
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description: err.response?.data.error || "Failed to restore user",
            variant: "destructive",
          });
        }
      },
    });
  };

  const handleResetPassword = () => {
    dialog.show({
      config: {
        iconName: "KeyRound",
        alertType: "Warn",
        title: "Reset Password",
        description: `Are you sure you want to reset password for ${username}?`,
        actionLabel: "Reset",
      },
      onAction: async () => {
        try {
          const result = await resetPassword.mutateAsync(userId);

          toast({
            title: "Success",
            description: "User password reset successfully",
            variant: "success",
          });

          setTempPass(result.password);
          setIsCredentialsOpen(true);
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error",
            description: err.response?.data.error || "Failed to reset password",
            variant: "destructive",
          });
        }
      },
    });
  };

  const handleLock = () => {
    if (currentUserId === userId) {
      toast({
        title: "User Cannot be locked",
        description: "You cannot lock yourself",
        variant: "warning",
      });
      return;
    }

    const isLocked = userData.isLocked;
    dialog.show({
      config: {
        iconName: !isLocked ? "Lock" : "LockOpen",
        alertType: !isLocked ? "Danger" : "Success",
        title: !isLocked ? "Lock User" : "Unlock User",
        description: `Are you sure you want to ${
          !isLocked ? "restrict access for" : "restore access to"
        } this user: ${username}?`,
        actionLabel: `${!isLocked ? "Lock" : "Unlock"} user`,
      },
      onAction: async () => {
        try {
          await updateUser.mutateAsync({
            userId,
            updates: { isLocked: !isLocked },
          });
          toast({
            title: `User ${isLocked ? "Unlocked" : "Locked"}`,
            description: `User ${username} ${isLocked ? "unlocked" : "locked"} successfully`,
            variant: "default",
          });
          setUserData((prev: Partial<userType>) => ({
            ...prev,
            isLocked: !isLocked,
          }));
        } catch (error) {
          const err = error as CustomAxiosError;
          toast({
            title: "Error occurred",
            description:
              err.response?.data.error ||
              "Failed to lock user. Please try again.",
            variant: "destructive",
          });
        }
      },
    });
  };

  return {
    dialog,
    handleUpdate,
    handleDelete,
    handleRestore,
    handleResetPassword,
    handleLock,
  };
};
