import {
  ClipboardCheck,
  Crop,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";

type WorkflowStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    title: "Capture",
    description: "Select the exact area of your screen that you want to keep.",
    icon: Crop,
  },
  {
    number: "02",
    title: "Refine",
    description:
      "Review your screenshot, crop it, and highlight important details.",
    icon: PencilRuler,
  },
  {
    number: "03",
    title: "Export",
    description:
      "Save your image or copy it to the clipboard when it is ready.",
    icon: ClipboardCheck,
  },
];
