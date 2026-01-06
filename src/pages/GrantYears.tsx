import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { GrantYear } from '../lib/types';
import EmptyState from '../components/EmptyState';
import TableSkeleton from '../components/TableSkeleton';
import NewGrantYearModal from '../components/NewGrantYearModal';

export default function GrantYears() {
  const [years, setYears] = useState<GrantYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNewYearModal, setShowNewYearModal] = useState(false);

  useEffect(() => {
    fetchGrantYears();
  }, []);

  const fetchGrantYears = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('grant_years')
        .select('*')
        .order('year_value', { ascending: false });

      if (error) throw error;
      setYears(data || []);
    } catch (error) {
      console.error('Error fetching grant years:', error);
      const message = error instanceof Error ? error.message : 'Failed to load grant years';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, yearValue: number) => {
      if (!confirm(`Are you sure you want to delete the year ${yearValue}? This might fail if grants are associated with it.`)) {
          return;
      }

      try {
          const { error } = await supabase.from('grant_years').delete().eq('id', id);
          if (error) throw error;

          toast.success('Grant year deleted');
          setYears(prev => prev.filter(y => y.id !== id));
      } catch (error) {
          console.error('Error deleting grant year:', error);
          toast.error('Failed to delete grant year. It might be in use.');
      }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Grant Years</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Grant Years</h1>
        <button
          type="button"
          onClick={() => setShowNewYearModal(true)}
          className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Year</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {errorMessage ? (
          <div className="p-8">
            <EmptyState
              title="Unable to load grant years"
              description={errorMessage}
              action={
                <button
                  type="button"
                  onClick={fetchGrantYears}
                  className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : years.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No grant years found"
              description="Add fiscal years to your database to start tracking grants."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {years.map((year) => (
                  <tr key={year.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">{year.year_value}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(year.id, year.year_value)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete grant year"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewYearModal && (
        <NewGrantYearModal
          onClose={() => setShowNewYearModal(false)}
          onSuccess={() => {
            setShowNewYearModal(false);
            fetchGrantYears();
          }}
        />
      )}
    </div>
  );
}
