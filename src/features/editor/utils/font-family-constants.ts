export interface FontOption {
  label: string;
  value: string;
}

export const FONT_FAMILY_OPTIONS: FontOption[] = [
  { label: "Default (DM Sans)", value: "" },

  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },

  { label: "DM Sans", value: "'DM Sans Variable', sans-serif" },
  { label: "Inter", value: "'Inter Variable', sans-serif" },
  { label: "Roboto", value: "'Roboto Variable', sans-serif" },

  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },

  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];