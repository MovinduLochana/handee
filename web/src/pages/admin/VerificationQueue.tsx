import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, AlertOctagon, CheckCircle, Eye, Search } from "lucide-react";
import { adminApi } from "../../api/admin";
import { serviceCategoryApi } from "../../api/serviceCategories";
import StatusBadge from "../../components/provider/StatusBadge";
import type { VerificationStatus } from "../../api/types";
import { getFullMediaUrl } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function VerificationQueue() {
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "All">("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    status: "All" as VerificationStatus | "All",
    searchTerm: "",
    skill: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const { data: queueData, isLoading: isLoadingQueue } = useQuery({
    queryKey: ["verificationQueue", appliedFilters],
    queryFn: () =>
      adminApi.getVerificationQueue({
        status: appliedFilters.status === "All" ? undefined : appliedFilters.status,
        searchTerm: appliedFilters.searchTerm || undefined,
        serviceCategoryId: appliedFilters.skill || undefined,
        page: 1,
        pageSize: 50,
      }),
  });

  const handleSearch = () => {
    setAppliedFilters({ status: statusFilter, searchTerm, skill: skillFilter });
  };

  const handleKpiClick = (status: VerificationStatus) => {
    setStatusFilter(status);
    setAppliedFilters((prev) => ({ ...prev, status }));
  };

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["verificationSummary"],
    queryFn: () => adminApi.getVerificationSummary(),
  });

  const items = queueData?.items || [];

  const kpis = {
    pending: summaryData?.Pending || 0,
    inReview: summaryData?.InReview || 0,
    verified: summaryData?.Verified || 0,
    rejected: summaryData?.Rejected || 0,
  };

  const isLoading = isLoadingQueue || isLoadingSummary;

  if (isLoading)
    return <div className="p-12 text-center text-muted-foreground text-sm">Loading queue...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Verification Queue</h1>
        <p className="text-muted-foreground text-sm">Review and process provider applications.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button type="button" className="text-left group" onClick={() => handleKpiClick("Pending")}>
          <Card className="hover:border-amber-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{kpis.pending}</div>
                <div className="text-xs text-muted-foreground">Pending Review</div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          className="text-left group"
          onClick={() => handleKpiClick("InReview")}
        >
          <Card className="hover:border-blue-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{kpis.inReview}</div>
                <div className="text-xs text-muted-foreground">Currently In Review</div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          className="text-left group"
          onClick={() => handleKpiClick("Verified")}
        >
          <Card className="hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{kpis.verified}</div>
                <div className="text-xs text-muted-foreground">Total Verified</div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          className="text-left group"
          onClick={() => handleKpiClick("Rejected")}
        >
          <Card className="hover:border-destructive/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{kpis.rejected}</div>
                <div className="text-xs text-muted-foreground">Total Rejected</div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Search Provider</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="pl-9 h-9 text-xs"
              placeholder="Name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        <div className="w-full sm:w-48 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status</label>
          <select
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="InReview">In Review</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="w-full sm:w-48 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Service Category</label>
          <select
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleSearch} className="h-9 gap-1.5 text-xs">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center p-12 text-muted-foreground text-sm">
                    No providers found matching this filter.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {provider.profilePictureUrl && (
                            <AvatarImage
                              src={getFullMediaUrl(provider.profilePictureUrl)}
                              alt={provider.fullName}
                            />
                          )}
                          <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                            {provider.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {provider.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {provider.serviceAreaDisplayName || "No location set"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {provider.serviceCategories.slice(0, 2).map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground"
                          >
                            {s.name}
                          </span>
                        ))}
                        {provider.serviceCategories.length > 2 && (
                          <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground">
                            +{provider.serviceCategories.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(provider.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={provider.verificationStatus} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/verifications/${provider.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
