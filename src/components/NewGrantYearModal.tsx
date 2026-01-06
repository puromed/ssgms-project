import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface NewGrantYearModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewGrantYearModal({ onClose, onSuccess }: NewGrantYearModalProps) {
  const [yearValue, setYearValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(yearValue);
    if (isNaN(year) || year < 1900 || year > 2100) {
        toast.error('Please enter a valid year');
        return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('grant_years').insert([{ year_value: year }]);
      if (error) {
          if (error.code === '23505') { // unique violation
              throw new Error('This year already exists');
          }
          throw error;
      }

      toast.success('Grant year added');
      onSuccess();
    } catch (error) {
      console.error('Error adding grant year:', error);
      const message = error instanceof Error ? error.message : 'Failed to add grant year';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">New Grant Year</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="year_value" className="block text-sm font-medium text-slate-700 mb-2">
              Year
            </label>
            <input
              id="year_value"
              type="number"
              required
              min="1900"
              max="2100"
              value={yearValue}
              onChange={(e) => setYearValue(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="e.g. 2024"
            />
          </div>

          <div className="flex space-x-3 pt-2">
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
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
