import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface NewFundSourceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewFundSourceModal({ onClose, onSuccess }: NewFundSourceModalProps) {
  const [sourceName, setSourceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sourceName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('fund_sources').insert([{ source_name: name }]);
      if (error) throw error;

      toast.success('Grant source added');
      onSuccess();
    } catch (error) {
      console.error('Error adding grant source:', error);
      const message = error instanceof Error ? error.message : 'Failed to add grant source';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">New Grant Source</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="source_name" className="block text-sm font-medium text-slate-700 mb-2">
              Source name
            </label>
            <input
              id="source_name"
              type="text"
              required
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="e.g. State Budget"
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
