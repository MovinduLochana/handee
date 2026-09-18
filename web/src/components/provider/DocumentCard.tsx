import { FileText, Download } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { CertificationDto } from "../../api/types";
import "./DocumentCard.css";

interface DocumentCardProps {
  certification: CertificationDto;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}

const typeLabels: Record<string, string> = {
  NIC: "National ID Card",
  TradeCertification: "Trade Certification",
  BusinessRegistration: "Business Registration",
  Other: "Other Document",
};

export default function DocumentCard({
  certification,
  onApprove,
  onReject,
  showActions = false,
}: DocumentCardProps) {
  const uploadDate = new Date(certification.uploadedAt).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="document-card hover-lift">
      <div className="document-card-icon">
        <FileText size={24} />
      </div>
      <div className="document-card-info">
        <div className="document-card-type">
          {typeLabels[certification.type] ?? certification.type}
        </div>
        <div className="document-card-filename truncate">
          {certification.originalFileName ?? "Unnamed file"}
        </div>
        <div className="document-card-meta">Uploaded {uploadDate}</div>
      </div>
      <div className="document-card-status">
        <StatusBadge status={certification.reviewStatus} size="sm" />
      </div>
      <div className="document-card-actions">
        {certification.fileUrl && (
          <a
            href={
              certification.fileUrl.startsWith("http")
                ? certification.fileUrl
                : `http://localhost:5057${certification.fileUrl}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="document-action-btn"
            title="View document"
          >
            <Download size={16} />
          </a>
        )}
        {showActions && certification.reviewStatus === "Pending" && (
          <>
            {onApprove && (
              <button
                className="document-action-btn action-approve"
                onClick={() => onApprove(certification.id)}
                title="Approve"
              >
                ✓
              </button>
            )}
            {onReject && (
              <button
                className="document-action-btn action-reject"
                onClick={() => onReject(certification.id)}
                title="Reject"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
