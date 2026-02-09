import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Download, Edit2, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import {
  formatCurrency,
  getFundSourceBadgeClass,
} from "../lib/utils";
import { logDeletion } from "../lib/deletionAudit";
import { numClass } from "../lib/ui";
import { useAuth } from "../contexts/AuthContext";
import type { DeletionLog, GrantWithRelations, FundSource, GrantYear } from "../lib/types";
import NewGrantModal from "../components/NewGrantModal";
import EmptyState from "../components/EmptyState";
import TableSkeleton from "../components/TableSkeleton";
import DeleteReasonModal from "../components/DeleteReasonModal";
import DeletionLogModal from "../components/DeletionLogModal";

const MAX_PROJECT_NAME = 24;
const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const sliceLength = Math.max(0, maxLength - 3);
  return `${value.slice(0, sliceLength)}...`;
}

export default function Grants() {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [grants, setGrants] = useState<GrantWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedFundSource, setSelectedFundSource] = useState<string>("");
  const [years, setYears] = useState<GrantYear[]>([]);
  const [fundSources, setFundSources] = useState<FundSource[]>([]);
  const [editingGrant, setEditingGrant] = useState<GrantWithRelations | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<GrantWithRelations | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletionLogs, setShowDeletionLogs] = useState(false);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);
  const [deletionLogsLoading, setDeletionLogsLoading] = useState(false);
  const [deletionLogsError, setDeletionLogsError] = useState<string | null>(null);
  const [deletedByLookup, setDeletedByLookup] = useState<
    Record<string, string>
  >({});
  const [updatedByLookup, setUpdatedByLookup] = useState<
    Record<string, string>
  >({});
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchGrants();
    fetchFilterOptions();
  }, []);

  const statusParam = (searchParams.get("status") || "").toLowerCase();
  const allowedStatuses = new Set(["approved", "ongoing", "completed"]);
  const statusFilters = Array.from(
    new Set(
      statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => allowedStatuses.has(s)),
    ),
  );

  const clearStatusFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    setSearchParams(next);
  };

  const syncUpdatedByProfiles = async (rows: GrantWithRelations[]) => {
    const updatedByIds = Array.from(
      new Set(
        rows
          .map((grant) => grant.user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (updatedByIds.length === 0) {
      setUpdatedByLookup({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", updatedByIds);

      if (error) throw error;
      const lookup =
        data?.reduce<Record<string, string>>((acc, profileRow) => {
          const displayName =
            profileRow.email || profileRow.full_name || "Unknown";
          acc[profileRow.id] = displayName;
          return acc;
        }, {}) || {};
      setUpdatedByLookup(lookup);
    } catch (error) {
      console.error("Error fetching updated by profiles:", error);
    }
  };

  const syncDeletedByProfiles = async (rows: DeletionLog[]) => {
    const deletedByIds = Array.from(
      new Set(
        rows
          .map((log) => log.deleted_by)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (deletedByIds.length === 0) {
      setDeletedByLookup({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", deletedByIds);

      if (error) throw error;
      const lookup =
        data?.reduce<Record<string, string>>((acc, profileRow) => {
          const displayName =
            profileRow.full_name || profileRow.email || "Unknown";
          acc[profileRow.id] = displayName;
          return acc;
        }, {}) || {};
      setDeletedByLookup(lookup);
    } catch (error) {
      console.error("Error fetching deleted by profiles:", error);
    }
  };

  const fetchGrants = async () => {
    try {
      const { data, error } = await supabase
        .from("grants")
        .select("*, fund_sources(*), grant_years(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = data || [];
      setGrants(rows);
      syncUpdatedByProfiles(rows);
    } catch (error) {
      console.error("Error fetching grants:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletionLogs = async () => {
    setDeletionLogsLoading(true);
    setDeletionLogsError(null);

    try {
      const { data, error } = await supabase
        .from("deletion_logs")
        .select("*")
        .eq("entity_type", "grant")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = data || [];
      setDeletionLogs(rows);
      syncDeletedByProfiles(rows);
    } catch (error) {
      console.error("Error fetching deletion logs:", error);
      setDeletionLogsError("Failed to load deletion logs.");
    } finally {
      setDeletionLogsLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [yearsResponse, fundSourcesResponse] = await Promise.all([
        supabase
          .from("grant_years")
          .select("*")
          .order("year_value", { ascending: false }),
        supabase.from("fund_sources").select("*").order("source_name"),
      ]);

      if (yearsResponse.data) setYears(yearsResponse.data);
      if (fundSourcesResponse.data) setFundSources(fundSourcesResponse.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  const handleConfirmDelete = async (reason: string) => {
    const target = deleteTarget;
    if (!target) return;
    setIsDeleting(true);
    const actorId = user?.id ?? profile?.id ?? null;

    try {
      const { error } = await supabase.from("grants").delete().eq("id", target.id);
      if (error) throw error;

      setGrants((prev) => prev.filter((grant) => grant.id !== target.id));

      const logged = await logDeletion({
        entityType: "grant",
        entityId: target.id,
        entityLabel: target.project_name,
        reason,
        deletedBy: actorId,
        metadata: {
          projectName: target.project_name,
          amountApproved: target.amount_approved,
          fundSource: target.fund_sources?.source_name ?? null,
          year: target.grant_years?.year_value ?? null,
          status: target.status,
        },
      });

      toast.success("Grant deleted successfully");
      if (!logged) {
        toast("Deletion reason could not be recorded. Check audit log setup.", {
          icon: "!",
        });
      }
    } catch (error) {
      console.error("Error deleting grant:", error);
      toast.error("Failed to delete grant");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (
    grant: GrantWithRelations,
    nextStatus: string,
  ) => {
    if (grant.status === nextStatus) return;
    setStatusUpdating(grant.id);

    const updates: {
      status: string;
      user_id?: string;
    } = { status: nextStatus };

    const actorId = user?.id ?? profile?.id;
    if (actorId) {
      updates.user_id = actorId;
    }

    try {
      const { error } = await supabase
        .from("grants")
        .update(updates)
        .eq("id", grant.id);
      if (error) throw error;

      setGrants((prev) =>
        prev.map((row) => (row.id === grant.id ? { ...row, ...updates } : row)),
      );

      if (updates.user_id && profile) {
        const displayName = profile.full_name || profile.email || "Unknown";
        setUpdatedByLookup((prev) => ({
          ...prev,
          [updates.user_id as string]: displayName,
        }));
      }

      toast.success("Grant status updated");
    } catch (error) {
      console.error("Error updating grant status:", error);
      toast.error("Failed to update grant status");
    } finally {
      setStatusUpdating(null);
    }
  };

  const filteredGrants = grants.filter((grant) => {
    const matchesSearch = grant.project_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesYear =
      !selectedYear || grant.year_id === parseInt(selectedYear);
    const matchesFundSource =
      !selectedFundSource ||
      grant.fund_source_id === parseInt(selectedFundSource);
    const matchesStatus =
      statusFilters.length === 0 ||
      statusFilters.includes(grant.status.toLowerCase());
    return matchesSearch && matchesYear && matchesFundSource && matchesStatus;
  });

  const handleGrantCreated = () => {
    fetchGrants();
    setShowModal(false);
    setEditingGrant(null);
  };

  const handleEdit = (grant: GrantWithRelations) => {
    setEditingGrant(grant);
    setShowModal(true);
  };

  const exportToCSV = () => {
    const headers = [
      "Project Name",
      "Amount Approved (RM)",
      "Year",
      "Fund Source",
      "Status",
    ];
    const csvData = filteredGrants.map((grant) => [
      grant.project_name,
      grant.amount_approved.toFixed(2),
      grant.grant_years?.year_value || "N/A",
      grant.fund_sources?.source_name || "N/A",
      grant.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `grants_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Grants</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Grants</h1>
          {statusFilters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20">
                Status:{" "}
                {statusFilters
                  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(", ")}
              </span>
              <button
                type="button"
                onClick={clearStatusFilter}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
          {(profile?.role === "admin" || profile?.role === "super_admin") && (
            <button
              onClick={() => {
                setShowDeletionLogs(true);
                fetchDeletionLogs();
              }}
              className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Deletion Log</span>
            </button>
          )}
          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <button
              onClick={() => {
                setEditingGrant(null);
                setShowModal(true);
              }}
              className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Grant</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search grants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year_value}
                </option>
              ))}
            </select>
            <select
              value={selectedFundSource}
              onChange={(e) => setSelectedFundSource(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">All Fund Sources</option>
              {fundSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.source_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Empty State Logic */}
        {filteredGrants.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No grants found"
              description={
                searchTerm || selectedYear || selectedFundSource
                  ? "Try adjusting your filters to see results."
                  : "Get started by creating your first grant application."
              }
              action={
                !searchTerm &&
                !selectedYear &&
                !selectedFundSource &&
                (profile?.role === 'admin' || profile?.role === 'super_admin') && (
                  <button
                    onClick={() => {
                      setEditingGrant(null);
                      setShowModal(true);
                    }}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Create First Grant
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Amount Approved
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Fund Source
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Last Updated By
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Document
                  </th>
                  {(profile?.role === "admin" || profile?.role === "super_admin") && (
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredGrants.map((grant) => (
                  <tr
                    key={grant.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium text-slate-900"
                      title={grant.project_name}
                    >
                      {truncateLabel(grant.project_name, MAX_PROJECT_NAME)}
                    </td>
                    <td className={`px-6 py-4 text-sm text-slate-600 ${numClass}`}>
                      {formatCurrency(grant.amount_approved)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {grant.grant_years?.year_value || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFundSourceBadgeClass(
                          grant.fund_sources?.source_name,
                        )}`}
                      >
                        {grant.fund_sources?.source_name || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {profile?.role !== "user" ? (
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${grant.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20"
                            : grant.status === "completed"
                              ? "bg-blue-100 text-blue-800 ring-1 ring-blue-600/20"
                              : grant.status === "ongoing"
                                ? "bg-orange-100 text-orange-800 ring-1 ring-orange-600/20"
                                : "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20"
                            }`}
                        >
                          {grant.status.charAt(0).toUpperCase() +
                            grant.status.slice(1)}
                        </span>
                      ) : (
                        <select
                          value={grant.status}
                          onChange={(e) =>
                            handleStatusChange(grant, e.target.value)
                          }
                          disabled={statusUpdating === grant.id}
                          className="w-full min-w-[140px] px-3 py-2 text-xs font-semibold border border-slate-300 rounded-full bg-white focus:ring-2 focus:ring-blue-900 focus:border-transparent disabled:opacity-60"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {grant.user_id
                        ? updatedByLookup[grant.user_id] || "Unknown"
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {grant.document_url ? (
                        <a
                          href={grant.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-emerald-600 hover:text-emerald-800 transition-colors"
                          title="View document"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    {(profile?.role === "admin" || profile?.role === "super_admin") && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(grant)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit grant"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {profile?.role === "super_admin" && (
                            <button
                              onClick={() => setDeleteTarget(grant)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete grant"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NewGrantModal
          onClose={() => {
            setShowModal(false);
            setEditingGrant(null);
          }}
          onSuccess={handleGrantCreated}
          editingGrant={editingGrant}
        />
      )}

      {deleteTarget && (
        <DeleteReasonModal
          title="Delete grant?"
          description={`Provide a reason for deleting "${deleteTarget.project_name}". This action cannot be undone.`}
          confirmLabel="Delete Grant"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          isSubmitting={isDeleting}
        />
      )}

      {showDeletionLogs && (
        <DeletionLogModal
          title="Grant Deletion Log"
          logs={deletionLogs}
          entityType="grant"
          deletedByLookup={deletedByLookup}
          isLoading={deletionLogsLoading}
          error={deletionLogsError}
          onClose={() => setShowDeletionLogs(false)}
          onRefresh={fetchDeletionLogs}
        />
      )}
    </div>
  );
}
