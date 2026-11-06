import { Calendar, CheckSquare, PenLine, Type } from "lucide-react";

export const annotationTools = [
  ["text", "Text", Type],
  ["checkbox", "Checkbox", CheckSquare],
  ["date", "Date", Calendar],
  ["signature", "Signature", PenLine],
] as const;

export const headerHeight = "3rem";
