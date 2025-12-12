import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Download, Edit2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, getFundSourceBadgeClass } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import type { GrantWithRelations, FundSource, GrantYear } from '../lib/types';
import NewGrantModal from '../components/NewGrantModal';
import EmptyState from '../components/EmptyState';
import TableSkeleton from '../components/TableSkeleton';

export default function Grants() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [grants, setGrants] = useState<GrantWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedFundSource, setSelectedFundSource] = useState<string>('');
  const [years, setYears] = useState<GrantYear[]>([]);
  const [fundSources, setFundSources] = useState<FundSource[]>([]);
  const [editingGrant, setEditingGrant] = useState<GrantWithRelations | null>(null);

  useEffect(() => {
    fetchGrants();
    fetchFilterOptions();
  }, []);

  const statusParam = (searchParams.get('status') || '').toLowerCase();
  const allowedStatuses = new Set(['approved', 'ongoing', 'completed']);
  const statusFilters = Array.from(
    new Set(
      statusParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => allowedStatuses.has(s)),
    ),
  );

  const clearStatusFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next);
  };

  const fetchGrants = async () => {
    try {
      const { data, error } = await supabase
        .from('grants')
        .select('*, fund_sources(*), grant_years(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrants(data || []);
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [yearsResponse, fundSourcesResponse] = await Promise.all([
        supabase.from('grant_years').select('*').order('year_value', { ascending: false }),
        supabase.from('fund_sources').select('*').order('source_name'),
      ]);

      if (yearsResponse.data) setYears(yearsResponse.data);
      if (fundSourcesResponse.data) setFundSources(fundSourcesResponse.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this grant?')) return;

    try {
      const { error } = await supabase.from('grants').delete().eq('id', id);
      if (error) throw error;
      setGrants(grants.filter((grant) => grant.id !== id));
      toast.success('Grant deleted successfully');
    } catch (error) {
      console.error('Error deleting grant:', error);
      toast.error('Failed to delete grant');
    }
  };

  const filteredGrants = grants.filter((grant) => {
    const matchesSearch = grant.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = !selectedYear || grant.year_id === parseInt(selectedYear);
    const matchesFundSource = !selectedFundSource || grant.fund_source_id === parseInt(selectedFundSource);
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(grant.status.toLowerCase());
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
    const headers = ['Project Name', 'Amount Approved (RM)', 'Year', 'Fund Source', 'Status'];
    const csvData = filteredGrants.map((grant) => [
      grant.project_name,
      grant.amount_approved.toFixed(2),
      grant.grant_years?.year_value || 'N/A',
      grant.fund_sources?.source_name || 'N/A',
      grant.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `grants_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
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
                Status: {statusFilters
                  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join(', ')}
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
                  ? 'Try adjusting your filters to see results.'
                  : 'Get started by creating your first grant application.'
              }
              action={
                !searchTerm &&
                !selectedYear &&
                !selectedFundSource && (
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
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
                    Last Updated
                  </th>
                  {profile?.role === 'admin' && (
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredGrants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {grant.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatCurrency(grant.amount_approved)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {grant.grant_years?.year_value || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFundSourceBadgeClass(
                          grant.fund_sources?.source_name,
                        )}`}>
                        {grant.fund_sources?.source_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                          grant.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20'
                            : grant.status === 'completed'
                            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20'
                            : grant.status === 'ongoing'
                            ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-600/20'
                            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20'
                        }`}
                      >
                        {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(grant.created_at)}
                    </td>
                    {profile?.role === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(grant)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit grant"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(grant.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete grant"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
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
    </div>
  );
}
