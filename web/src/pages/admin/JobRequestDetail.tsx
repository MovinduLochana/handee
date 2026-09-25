import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { jobRequestApi } from "../../api/jobRequests";
import { BASE_URL } from "../../lib/api";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import { formatDateTime, formatMoney } from "../../components/booking/format";
import { getHttpStatus, retryUnlessClientError } from "../../components/booking/httpStatus";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

function photoSrc(url: string): string {
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function JobRequestDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["jobRequests", "detail", id],
    queryFn: () => jobRequestApi.getById(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
  });

  const backLink = (
    <Link to="/admin/job-requests" className="booking-back-link">
      <ArrowLeft size={16} /> Back to Job Requests
    </Link>
  );

  if (isLoading)
    return <div style={{ padding: "4rem", textAlign: "center" }}>Loading job request...</div>;

  if (isError && getHttpStatus(error) === 404)
    return (
      <div className="admin-page-container">
        {backLink}
        <div className="booking-state">Job request not found.</div>
      </div>
    );

  if (isError || !job)
    return (
      <div className="admin-page-container">
        {backLink}
        <LoadError title="Couldn't load this job request" error={error} onRetry={() => refetch()} />
      </div>
    );

  const budget =
    job.budgetMin === null && job.budgetMax === null
      ? "Not specified"
      : `${formatMoney(job.budgetMin)} – ${formatMoney(job.budgetMax)}`;

  return (
    <div className="admin-page-container animate-fade-up">
      {backLink}

      <header className="admin-header">
        <div>
          <div className="booking-title-row">
            <h1 className="admin-title">{job.categoryName}</h1>
            <BookingStatusBadge status={job.status} />
          </div>
          <p className="admin-subtitle booking-mono">Job request {job.id}</p>
        </div>
      </header>

      <div className="booking-detail-grid">
        <section className="booking-card">
          <h2>Request</h2>
          <dl className="booking-fields">
            <dt>Category</dt>
            <dd>{job.categoryName}</dd>
            <dt>Category ID</dt>
            <dd className="booking-mono">{job.serviceCategoryId}</dd>
            <dt>Location</dt>
            <dd>{job.location}</dd>
            <dt>Urgency</dt>
            <dd>
              <span className={`booking-urgency-${job.urgency.toLowerCase()}`}>{job.urgency}</span>
            </dd>
            <dt>Budget</dt>
            <dd>{budget}</dd>
            <dt>Status</dt>
            <dd>
              <BookingStatusBadge status={job.status} size="sm" />
            </dd>
          </dl>
        </section>

        <section className="booking-card">
          <h2>Customer & Timeline</h2>
          <dl className="booking-fields">
            <dt>Customer ID</dt>
            <dd className="booking-mono">{job.customerId}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(job.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(job.updatedAt, "Never")}</dd>
          </dl>
        </section>

        <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Description</h2>
          <p className="booking-description">{job.description}</p>
        </section>

        <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Photos ({job.photoUrls.length})</h2>
          {job.photoUrls.length === 0 ? (
            <p className="booking-description">No photos attached.</p>
          ) : (
            <div className="booking-photo-list">
              {job.photoUrls.map((url, i) => (
                <a key={url} href={photoSrc(url)} target="_blank" rel="noreferrer">
                  <img src={photoSrc(url)} alt={`Job photo ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
