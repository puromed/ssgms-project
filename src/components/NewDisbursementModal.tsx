import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewDisbursementModalProps {
  grantId: number;
  remainingBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewDisbursementModal({
  grantId,
  remainingBalance,
  onClose,
  onSuccess,
}: NewDisbursementModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const amount = parseFloat(formData.amount);

    if (amount > remainingBalance) {
      setError(`Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from('disbursements').insert([
        {
          grant_id: grantId,
          amount: amount,
          payment_date: formData.payment_date,
        },
      ]);

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      console.error('Error creating disbursement:', err);
      setError('Failed to create disbursement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">New Disbursement</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Remaining Balance:</span>{' '}
              {new Intl.NumberFormat('en-MY', {
                style: 'currency',
                currency: 'MYR',
                minimumFractionDigits: 2,
              }).format(remainingBalance)}
            </p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              required
              min="0.01"
              max={remainingBalance}
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="payment_date" className="block text-sm font-medium text-slate-700 mb-2">
              Payment Date
            </label>
            <input
              id="payment_date"
              type="date"
              required
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
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
              {loading ? 'Creating...' : 'Create Disbursement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
