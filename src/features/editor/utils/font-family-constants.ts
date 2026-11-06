export interface FontOption {
  label: string;
  value: string;
}

export const FONT_FAMILY_OPTIONS: FontOption[] = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "System Sans", value: "system-ui, sans-serif" },
  {
    label: "Handwriting",
    value: "'Brush Script MT', 'Segoe Script', cursive",
  },
];
