import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, getFundSourceBadgeClass } from '../lib/utils';
import type { FundSource, Grant } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import TableSkeleton from '../components/TableSkeleton';
import NewFundSourceModal from '../components/NewFundSourceModal';

type GrantRow = Pick<Grant, 'fund_source_id' | 'amount_approved'>;

interface GrantSourceRow {
  id: number;
  source_name: string;
  total_amount: number;
}

export default function GrantSources() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<GrantSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNewSourceModal, setShowNewSourceModal] = useState(false);

  useEffect(() => {
    fetchGrantSources();
  }, []);

  const fetchGrantSources = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [sourcesResponse, grantsResponse] = await Promise.all([
        supabase.from('fund_sources').select('*').order('source_name'),
        supabase.from('grants').select('fund_source_id, amount_approved'),
      ]);

      if (sourcesResponse.error) throw sourcesResponse.error;
      if (grantsResponse.error) throw grantsResponse.error;

      const sources = (sourcesResponse.data as FundSource[]) ?? [];
      const grants = (grantsResponse.data as GrantRow[]) ?? [];

      const totalBySourceId = new Map<number, number>();
      for (const grant of grants) {
        totalBySourceId.set(
          grant.fund_source_id,
          (totalBySourceId.get(grant.fund_source_id) || 0) + grant.amount_approved,
        );
      }

      setRows(
        sources
          .map((source) => ({
            id: source.id,
            source_name: source.source_name,
            total_amount: totalBySourceId.get(source.id) || 0,
          }))
          .sort((a, b) => b.total_amount - a.total_amount),
      );
    } catch (error) {
      console.error('Error fetching grant sources:', error);
      const message = error instanceof Error ? error.message : 'Failed to load grant sources';
      setErrorMessage(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Grant Sources</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Grant Sources</h1>
        {profile?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowNewSourceModal(true)}
            className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Source</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {errorMessage ? (
          <div className="p-8">
            <EmptyState
              title="Unable to load grant sources"
              description={errorMessage}
              action={
                <button
                  type="button"
                  onClick={fetchGrantSources}
                  className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No grant sources found"
              description="Add fund sources in your database to see them here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Total Grant Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFundSourceBadgeClass(
                          row.source_name,
                        )}`}
                      >
                        {row.source_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">
                      {formatCurrency(row.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewSourceModal && (
        <NewFundSourceModal
          onClose={() => setShowNewSourceModal(false)}
          onSuccess={() => {
            setShowNewSourceModal(false);
            fetchGrantSources();
          }}
        />
      )}
    </div>
  );
}
