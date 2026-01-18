import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, FileDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../lib/utils";
import type { GrantWithRelations, Disbursement } from "../lib/types";
import NewDisbursementModal from "../components/NewDisbursementModal";
import TableSkeleton from "../components/TableSkeleton";
import { exportDisbursementsToPDF } from "../lib/pdfExport";

export default function Disbursements() {
  const { profile } = useAuth();
  const [grants, setGrants] = useState<GrantWithRelations[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<number | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchGrants();
  }, []);

  useEffect(() => {
    if (selectedGrant) {
      fetchDisbursements(selectedGrant);
    }
  }, [selectedGrant]);

  const fetchGrants = async () => {
    try {
      const { data, error } = await supabase
        .from("grants")
        .select("*, fund_sources(*), grant_years(*)")
        .order("project_name");

      if (error) throw error;
      setGrants((data as GrantWithRelations[]) || []);
      if (data && data.length > 0) {
        setSelectedGrant((data as GrantWithRelations[])[0].id);
      }
    } catch (error) {
      console.error("Error fetching grants:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisbursements = async (grantId: number) => {
    try {
      const { data, error } = await supabase
        .from("disbursements")
        .select("*")
        .eq("grant_id", grantId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setDisbursements((data as Disbursement[]) || []);
    } catch (error) {
      console.error("Error fetching disbursements:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this disbursement?")) return;

    try {
      const { error } = await supabase
        .from("disbursements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setDisbursements(disbursements.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting disbursement:", error);
      alert("Failed to delete disbursement");
    }
  };

  const selectedGrantData = grants.find((g) => g.id === selectedGrant);
  const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const remainingBalance = selectedGrantData
    ? selectedGrantData.amount_approved - totalDisbursed
    : 0;

  const handleDisbursementCreated = () => {
    if (selectedGrant) {
      fetchDisbursements(selectedGrant);
    }
    setShowModal(false);
  };

  const handleExportPDF = () => {
    if (!selectedGrantData || !profile?.email) return;

    exportDisbursementsToPDF({
      grant: selectedGrantData,
      disbursements,
      totalDisbursed,
      remainingBalance,
      exportedBy: profile.email
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <TableSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">
            No grants available. Create a grant first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              disabled={disbursements.length === 0}
              className="flex items-center space-x-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-5 h-5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Disbursement</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <label
          htmlFor="grant-select"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Select Grant
        </label>
        <div className="relative">
          <select
            id="grant-select"
            value={selectedGrant || ""}
            onChange={(e) => setSelectedGrant(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent appearance-none bg-white"
          >
            {grants.map((grant) => (
              <option key={grant.id} value={grant.id}>
                {grant.project_name} - {formatCurrency(grant.amount_approved)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>

        {selectedGrantData && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Total Approved</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(selectedGrantData.amount_approved)}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Total Disbursed</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalDisbursed)}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Remaining Balance</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(remainingBalance)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Disbursement History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                {profile?.role === "super_admin" && (
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {disbursements.length === 0 ? (
                <tr>
                  <td
                    colSpan={profile?.role === "admin" ? 3 : 2}
                    className="px-6 py-12 text-center"
                  >
                    <p className="text-slate-500">
                      No disbursements found for this grant
                    </p>
                  </td>
                </tr>
              ) : (
                disbursements.map((disbursement) => (
                  <tr
                    key={disbursement.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(disbursement.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(disbursement.amount)}
                    </td>
                    {profile?.role === "super_admin" && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(disbursement.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete disbursement"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedGrant && (
        <NewDisbursementModal
          grantId={selectedGrant}
          remainingBalance={remainingBalance}
          onClose={() => setShowModal(false)}
          onSuccess={handleDisbursementCreated}
        />
      )}
    </div>
  );
}
