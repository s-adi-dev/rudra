import { DatePickerV2 } from "@/components/custom ui/date-time-pickers";
import { FormFieldWrapper } from "@/components/custom ui/form-field-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  commercialUnitPlacementType,
  projectStatus,
  ProjectType,
} from "@/store/inventory";

interface ProjectInfoProps {
  isEditable: boolean;
  project: ProjectType | undefined;
  onProjectChange: (
    field: keyof Omit<ProjectType, "_id" | "wings" | "commercialFloors">,
    value: Date | string | projectStatus | commercialUnitPlacementType,
  ) => void;
}

export const ProjectInfo = ({
  isEditable,
  project,
  onProjectChange,
}: ProjectInfoProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Project Information</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Name"
          Important={isEditable}
          ImportantSide="right"
        >
          <Input
            value={project?.name || ""}
            placeholder={isEditable ? "Enter project name" : "N/A"}
            disabled={!isEditable}
            onChange={(e) => onProjectChange("name", e.target.value)}
          />
        </FormFieldWrapper>
        <FormFieldWrapper className="gap-3" LabelText="Legal Name">
          <Input
            value={project?.legalName || ""}
            placeholder={isEditable ? "Enter legal name" : "N/A"}
            disabled={!isEditable}
            onChange={(e) => onProjectChange("legalName", e.target.value)}
          />
        </FormFieldWrapper>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project By"
          Important={isEditable}
          ImportantSide="right"
        >
          <Input
            value={project?.by || ""}
            placeholder={isEditable ? "Enter project by" : "N/A"}
            disabled={!isEditable}
            onChange={(e) => onProjectChange("by", e.target.value)}
          />
        </FormFieldWrapper>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <FormFieldWrapper
          className="gap-3 flex-grow"
          LabelText="Location"
          Important={isEditable}
          ImportantSide="right"
        >
          <Input
            value={project?.location || ""}
            placeholder={isEditable ? "Enter project location" : "N/A"}
            disabled={!isEditable}
            onChange={(e) => onProjectChange("location", e.target.value)}
          />
        </FormFieldWrapper>
        <FormFieldWrapper className="gap-3 lg:w-[28rem]" LabelText="Email">
          <Input
            value={project?.email || ""}
            placeholder={isEditable ? "Enter project email" : "N/A"}
            disabled={!isEditable}
            onChange={(e) => onProjectChange("email", e.target.value)}
          />
        </FormFieldWrapper>
      </div>
      <FormFieldWrapper className="gap-3" LabelText="Description">
        <Textarea
          value={project?.description || ""}
          placeholder={isEditable ? "Additional info about project..." : "N/A"}
          disabled={!isEditable}
          onChange={(e) => onProjectChange("description", e.target.value)}
        />
      </FormFieldWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-2">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Start Date"
          Important={isEditable}
          ImportantSide="right"
        >
          <DatePickerV2
            className="sm:w-full"
            defaultDate={
              project?.startDate ? new Date(project.startDate) : undefined
            }
            disabled={!isEditable}
            onDateChange={(e) => onProjectChange("startDate", e)}
          />
        </FormFieldWrapper>
        <FormFieldWrapper className="gap-3" LabelText="Project Completion Date">
          <DatePickerV2
            className="sm:w-full"
            defaultDate={
              project?.completionDate
                ? new Date(project.completionDate)
                : undefined
            }
            disabled={!isEditable}
            onDateChange={(e) => onProjectChange("completionDate", e)}
            toYear={new Date().getFullYear() + 10}
          />
        </FormFieldWrapper>
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Status"
          Important={isEditable}
          ImportantSide="right"
        >
          <Select
            value={project?.status || ""}
            onValueChange={(e) => onProjectChange("status", e)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="under-construction">
                  Under Construction
                </SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormFieldWrapper>
        <FormFieldWrapper
          className="gap-3"
          LabelText="Commercial Unit Placement"
          ImportantSide="right"
        >
          <div className="flex items-center gap-2">
            <Button
              className={`flex-grow ${
                project?.commercialUnitPlacement === "projectLevel" &&
                "hover:bg-primary"
              }`}
              variant={
                project?.commercialUnitPlacement === "projectLevel"
                  ? "default"
                  : "outline"
              }
              disabled
              onClick={() =>
                onProjectChange("commercialUnitPlacement", "projectLevel")
              }
            >
              Project
            </Button>
            <Button
              className={`flex-grow ${
                project?.commercialUnitPlacement === "wingLevel" &&
                "hover:bg-primary"
              }`}
              variant={
                project?.commercialUnitPlacement === "wingLevel"
                  ? "default"
                  : "outline"
              }
              disabled
              onClick={() =>
                onProjectChange("commercialUnitPlacement", "wingLevel")
              }
            >
              Wing
            </Button>
          </div>
        </FormFieldWrapper>
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Stage"
          Important={isEditable}
          ImportantSide="right"
        >
          <Input
            onChange={(e) => onProjectChange("projectStage", e.target.value)}
            value={project?.projectStage || 0}
            disabled={!isEditable}
          />
        </FormFieldWrapper>
      </div>
    </div>
  );
};
