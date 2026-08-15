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

export function TypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? File;
  return <Icon className={className} aria-hidden="true" />;
}