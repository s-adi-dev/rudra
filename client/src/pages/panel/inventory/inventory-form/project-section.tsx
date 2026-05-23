// ProjectSection.tsx
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
import { ProjectType } from "@/store/inventory";
import { capitalizeWords } from "@/utils/func/strUtils";

interface ProjectSectionProps {
  project: ProjectType;
  onProjectChange: (
    field: keyof Omit<ProjectType, "wings">,
    value: string | Date,
  ) => void;
}

export const ProjectSection = ({
  project,
  onProjectChange,
}: ProjectSectionProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Project Information</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Name"
          Important
          ImportantSide="right"
        >
          <Input
            value={project.name}
            onChange={(e) =>
              onProjectChange("name", capitalizeWords(e.target.value))
            }
            placeholder="e.g. Rudra Palace"
          />
        </FormFieldWrapper>
        <FormFieldWrapper className="gap-3" LabelText="Legal Name">
          <Input
            value={project.legalName || ""}
            onChange={(e) =>
              onProjectChange("legalName", capitalizeWords(e.target.value))
            }
            placeholder="e.g. Rudra Real Estate Ltd."
          />
        </FormFieldWrapper>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project By"
          Important
          ImportantSide="right"
        >
          <Input
            value={project.by}
            onChange={(e) =>
              onProjectChange("by", capitalizeWords(e.target.value))
            }
            placeholder="e.g. Sai Kripa"
          />
        </FormFieldWrapper>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Location"
          Important
          ImportantSide="right"
        >
          <Input
            value={project.location}
            onChange={(e) => onProjectChange("location", e.target.value)}
            placeholder="123 Main Street, Anytown, State, 12345"
          />
        </FormFieldWrapper>

        <FormFieldWrapper className="gap-3 lg:w-[28rem]" LabelText="Email">
          <Input
            value={project?.email || ""}
            placeholder="Enter project email"
            onChange={(e) => onProjectChange("email", e.target.value)}
          />
        </FormFieldWrapper>
      </div>
      <FormFieldWrapper className="gap-3" LabelText="Description">
        <Textarea
          value={project.description}
          onChange={(e) => onProjectChange("description", e.target.value)}
          placeholder="Additional info about project..."
        />
      </FormFieldWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Start Date"
          Important
          ImportantSide="right"
        >
          <DatePickerV2
            className="sm:w-full"
            defaultDate={
              project.startDate ? new Date(project.startDate) : undefined
            }
            onDateChange={(e) => onProjectChange("startDate", e.toISOString())}
          />
        </FormFieldWrapper>
        <FormFieldWrapper className="gap-3" LabelText="Project Completion Date">
          <DatePickerV2
            className="sm:w-full"
            defaultDate={
              project.completionDate
                ? new Date(project.completionDate)
                : undefined
            }
            onDateChange={(e) =>
              onProjectChange("completionDate", e.toISOString())
            }
            toYear={new Date().getFullYear() + 10}
          />
        </FormFieldWrapper>
        <FormFieldWrapper
          className="gap-3"
          LabelText="Project Status"
          Important
          ImportantSide="right"
        >
          <Select
            value={project.status}
            onValueChange={(e) =>
              onProjectChange(
                "status",
                e as "planning" | "under-construction" | "completed",
              )
            }
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
          Important
          ImportantSide="right"
        >
          <div className="flex items-center gap-2">
            <Button
              className={`flex-grow ${
                project.commercialUnitPlacement == "projectLevel" &&
                "hover:bg-primary"
              }`}
              size="sm"
              variant={
                project.commercialUnitPlacement == "projectLevel"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                onProjectChange("commercialUnitPlacement", "projectLevel")
              }
            >
              Project
            </Button>
            <Button
              className={`flex-grow ${
                project.commercialUnitPlacement == "wingLevel" &&
                "hover:bg-primary"
              }`}
              size="sm"
              variant={
                project.commercialUnitPlacement == "wingLevel"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                onProjectChange("commercialUnitPlacement", "wingLevel")
              }
            >
              Wing
            </Button>
          </div>
        </FormFieldWrapper>
      </div>
    </div>
  );
};
