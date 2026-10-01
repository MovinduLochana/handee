import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Briefcase,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { adminApi } from "../../api/admin";
import type { AdminUserResult } from "../../api/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ALL" | "Customer" | "Provider" | "Admin">(
    "ALL",
  );
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [statusConfirmUser, setStatusConfirmUser] = useState<AdminUserResult | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: adminApi.getUsers,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminApi.setUserStatus(id, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setStatusConfirmUser(null);
    },
  });

  // Calculate high-level KPIs
  const stats = useMemo(() => {
    let customers = 0;
    let providers = 0;
    let admins = 0;
    let active = 0;
    let inactive = 0;

    users.forEach((u) => {
      if (u.roles.includes("Admin")) admins++;
      if (u.roles.includes("Provider")) providers++;
      if (
        u.roles.includes("Customer") ||
        (!u.roles.includes("Admin") && !u.roles.includes("Provider"))
      ) {
        customers++;
      }
      if (u.isActive) active++;
      else inactive++;
    });

    return {
      total: users.length,
      customers,
      providers,
      admins,
      active,
      inactive,
    };
  }, [users]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (selectedRole !== "ALL") {
        if (selectedRole === "Customer") {
          const isCustomer =
            user.roles.includes("Customer") ||
            (!user.roles.includes("Admin") && !user.roles.includes("Provider"));
          if (!isCustomer) return false;
        } else if (!user.roles.includes(selectedRole)) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus === "ACTIVE" && !user.isActive) return false;
      if (selectedStatus === "INACTIVE" && user.isActive) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = user.fullName.toLowerCase().includes(query);
        const matchesEmail = user.email?.toLowerCase().includes(query) ?? false;
        const matchesPhone = user.phoneNumber?.toLowerCase().includes(query) ?? false;
        const matchesId = user.id.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) return false;
      }

      return true;
    });
  }, [users, selectedRole, selectedStatus, searchTerm]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "default";
      case "Provider":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getVerificationBadge = (status: string, roles: string[]) => {
    if (!roles.includes("Provider")) return null;

    switch (status) {
      case "Verified":
        return (
          <Badge
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-none text-xs"
          >
            <CheckCircle2 className="w-3 h-3" /> Verified
          </Badge>
        );
      case "InReview":
        return (
          <Badge variant="secondary" className="gap-1 rounded-none text-xs">
            In Review
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="destructive" className="gap-1 rounded-none text-xs">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      case "Pending":
      default:
        return (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 gap-1 rounded-none text-xs"
          >
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Registered Users</h1>
          <p className="text-sm text-muted-foreground">
            Complete platform directory for Customers, Providers, and Administrators.
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Total Users
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} active · {stats.inactive} suspended
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Customers
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Clients & Service Requesters</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Providers
              <Briefcase className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.providers}</div>
            <p className="text-xs text-muted-foreground mt-1">Trade Experts & Technicians</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Administrators
              <Shield className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.admins}</div>
            <p className="text-xs text-muted-foreground mt-1">Governance & Staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-none border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-border">
                <Button
                  type="button"
                  variant={selectedRole === "ALL" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedRole("ALL")}
                  className="rounded-none text-xs h-8 px-3"
                >
                  All ({stats.total})
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "Customer" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedRole("Customer")}
                  className="rounded-none text-xs h-8 px-3"
                >
                  Customers ({stats.customers})
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "Provider" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedRole("Provider")}
                  className="rounded-none text-xs h-8 px-3"
                >
                  Providers ({stats.providers})
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "Admin" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedRole("Admin")}
                  className="rounded-none text-xs h-8 px-3"
                >
                  Admins ({stats.admins})
                </Button>
              </div>

              <select
                aria-label="Filter by status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="h-8 rounded-none border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Suspended / Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="rounded-none border-border">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading registered users...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p>Failed to load registered users.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="font-medium text-foreground">No users found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search criteria or role filters.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[300px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Provider Verification</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const initials =
                  user.fullName
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "U";

                const isProvider = user.roles.includes("Provider");

                return (
                  <TableRow key={user.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-none border border-border">
                          <AvatarFallback className="rounded-none bg-muted text-foreground font-semibold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email || "No email"}
                          </p>
                          {user.phoneNumber && (
                            <p className="text-[11px] text-muted-foreground">{user.phoneNumber}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={getRoleBadgeVariant(r)}
                              className="rounded-none text-[11px] px-2 py-0.5"
                            >
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="rounded-none text-[11px]">
                            Customer
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {user.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 rounded-none text-xs gap-1 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="rounded-none text-xs gap-1 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                          Suspended
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {isProvider ? (
                        <div className="flex items-center gap-2">
                          {getVerificationBadge(user.providerVerificationStatus, user.roles)}
                          <Link
                            to={`/admin/verifications/${user.id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon",
                              className: "h-6 w-6 text-muted-foreground hover:text-foreground",
                            })}
                            title="View Verification Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-LK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant={user.isActive ? "outline" : "default"}
                        size="sm"
                        className="text-xs h-7 rounded-none"
                        onClick={() => setStatusConfirmUser(user)}
                      >
                        {user.isActive ? "Suspend" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Confirmation Dialog for Status Change */}
      <Dialog
        open={!!statusConfirmUser}
        onOpenChange={(open) => !open && setStatusConfirmUser(null)}
      >
        <DialogContent className="rounded-none border-border">
          <DialogHeader>
            <DialogTitle>
              {statusConfirmUser?.isActive ? "Suspend User Account" : "Activate User Account"}
            </DialogTitle>
            <DialogDescription>
              {statusConfirmUser?.isActive
                ? `Are you sure you want to suspend access for ${statusConfirmUser?.fullName}? They will be blocked from logging into the platform.`
                : `Are you sure you want to reactivate access for ${statusConfirmUser?.fullName}? They will regain full access to their account.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setStatusConfirmUser(null)}
              disabled={toggleStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={statusConfirmUser?.isActive ? "destructive" : "default"}
              className="rounded-none"
              onClick={() => {
                if (statusConfirmUser) {
                  toggleStatusMutation.mutate({
                    id: statusConfirmUser.id,
                    isActive: !statusConfirmUser.isActive,
                  });
                }
              }}
              disabled={toggleStatusMutation.isPending}
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : statusConfirmUser?.isActive
                  ? "Confirm Suspension"
                  : "Confirm Activation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
