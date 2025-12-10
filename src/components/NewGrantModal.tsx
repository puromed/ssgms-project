import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { FundSource, GrantYear, GrantWithRelations } from '../lib/types';

interface NewGrantModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editingGrant?: GrantWithRelations | null;
}

export default function NewGrantModal({ onClose, onSuccess, editingGrant }: NewGrantModalProps) {
  const [fundSources, setFundSources] = useState<FundSource[]>([]);
  const [grantYears, setGrantYears] = useState<GrantYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    amount_approved: '',
    status: 'approved',
    year_id: '',
    fund_source_id: '',
  });

  useEffect(() => {
    fetchDropdownData();
    if (editingGrant) {
      setFormData({
        project_name: editingGrant.project_name,
        amount_approved: editingGrant.amount_approved.toString(),
        status: editingGrant.status,
        year_id: editingGrant.year_id.toString(),
        fund_source_id: editingGrant.fund_source_id.toString(),
      });
    }
  }, [editingGrant]);

  const fetchDropdownData = async () => {
    try {
      const [fundSourcesResponse, grantYearsResponse] = await Promise.all([
        supabase.from('fund_sources').select('*').order('source_name'),
        supabase.from('grant_years').select('*').order('year_value', { ascending: false }),
      ]);

      if (fundSourcesResponse.data) setFundSources(fundSourcesResponse.data);
      if (grantYearsResponse.data) setGrantYears(grantYearsResponse.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const grantData = {
        project_name: formData.project_name,
        amount_approved: parseFloat(formData.amount_approved),
        status: formData.status,
        year_id: parseInt(formData.year_id),
        fund_source_id: parseInt(formData.fund_source_id),
      };

      let error;
      if (editingGrant) {
        const result = await supabase
          .from('grants')
          .update(grantData as any)
          .eq('id', editingGrant.id);
        error = result.error;
      } else {
        const result = await supabase.from('grants').insert([grantData] as any);
        error = result.error;
      }

      if (error) throw error;
      toast.success(editingGrant ? 'Grant updated successfully' : 'Grant created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving grant:', error);
      toast.error(`Failed to ${editingGrant ? 'update' : 'create'} grant: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{editingGrant ? 'Edit Grant' : 'New Grant'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="project_name" className="block text-sm font-medium text-slate-700 mb-2">
              Project Name
            </label>
            <input
              id="project_name"
              type="text"
              required
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label
              htmlFor="amount_approved"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Amount Approved
            </label>
            <input
              id="amount_approved"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.amount_approved}
              onChange={(e) => setFormData({ ...formData, amount_approved: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="year_id" className="block text-sm font-medium text-slate-700 mb-2">
              Grant Year
            </label>
            <select
              id="year_id"
              required
              value={formData.year_id}
              onChange={(e) => setFormData({ ...formData, year_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">Select a year</option>
              {grantYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year_value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="fund_source_id"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Fund Source
            </label>
            <select
              id="fund_source_id"
              required
              value={formData.fund_source_id}
              onChange={(e) => setFormData({ ...formData, fund_source_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="">Select a fund source</option>
              {fundSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.source_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              id="status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            >
              <option value="approved">Approved</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (editingGrant ? 'Updating...' : 'Creating...') : (editingGrant ? 'Update Grant' : 'Create Grant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
