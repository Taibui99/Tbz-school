import {
  File,
  FileSpreadsheet,
  FileText,
  FileType,
  Image,
  Link2,
  Music,
  Presentation,
  Video,
} from "lucide-react";

const ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  ppt: Presentation,
  pptx: Presentation,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  image: Image,
  video: Video,
  audio: Music,
  text: FileType,
  url: Link2,
};

const TYPE_COLORS: Record<string, string> = {
  pdf: "text-red-600",
  doc: "text-sky-600",
  docx: "text-sky-600",
  ppt: "text-orange-600",
  pptx: "text-orange-600",
  xls: "text-emerald-600",
  xlsx: "text-emerald-600",
  image: "text-violet-600",
  video: "text-fuchsia-600",
  audio: "text-amber-600",
  text: "text-slate-600",
  url: "text-cyan-600",
};

const DEFAULT_COLOR = "text-slate-500";

export function TypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? File;
  const color = TYPE_COLORS[type] ?? DEFAULT_COLOR;
  return <Icon className={`${color} ${className ?? ""}`} aria-hidden="true" />;
}