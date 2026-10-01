import { useRef } from "react";
import { FileText, Download, Upload } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { CertificationDto } from "../../api/types";
import { getFullMediaUrl } from "../../lib/api";

interface DocumentCardProps {
  certification: CertificationDto;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onResubmit?: (file: File, type: string) => void;
  showActions?: boolean;
}

const typeLabels: Record<string, string> = {
  NIC: "National ID Card",
  TradeCertification: "Trade Certification",
  BusinessRegistration: "Business Registration",
  Other: "Other Document",
};

import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function DocumentCard({
  certification,
  onApprove,
  onReject,
  onResubmit,
  showActions = false,
}: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onResubmit?.(e.target.files[0], certification.type);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const uploadDate = new Date(certification.uploadedAt).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="document-card transition-shadow hover:shadow-md bg-card text-card-foreground border-border">
      <CardContent className="p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="document-card-icon h-10 w-10 shrink-0 flex items-center justify-center bg-muted text-muted-foreground border border-border">
          <FileText className="h-5 w-5" />
        </div>
        <div className="document-card-info flex-1 min-w-0">
          <div className="document-card-type text-sm font-semibold text-foreground">
            {typeLabels[certification.type] ?? certification.type}
          </div>
          <div className="document-card-filename truncate text-xs text-muted-foreground">
            {certification.originalFileName ?? "Unnamed file"}
          </div>
          <div className="document-card-meta text-[11px] text-muted-foreground mt-0.5">
            Uploaded {uploadDate}
          </div>
        </div>
        <div className="document-card-status shrink-0">
          <StatusBadge status={certification.reviewStatus} size="sm" />
        </div>
        <div className="document-card-actions flex items-center gap-2 shrink-0">
          {certification.fileUrl && (
            <a
              href={getFullMediaUrl(certification.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}
              title="View document"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          {showActions && certification.reviewStatus === "Pending" && (
            <>
              {onApprove && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  onClick={() => onApprove(certification.id)}
                  title="Approve"
                >
                  ✓
                </Button>
              )}
              {onReject && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onReject(certification.id)}
                  title="Reject"
                >
                  ✕
                </Button>
              )}
            </>
          )}
          {onResubmit && certification.reviewStatus === "Rejected" && (
            <>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={() => fileInputRef.current?.click()}
                title="Resubmit Document"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
