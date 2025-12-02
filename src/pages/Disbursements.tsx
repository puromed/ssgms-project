import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { GrantWithRelations, Disbursement } from '../lib/types';
import NewDisbursementModal from '../components/NewDisbursementModal';

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
        .from('grants')
        .select('*, fund_sources(*), grant_years(*)')
        .order('project_name');

      if (error) throw error;
      setGrants(data || []);
      if (data && data.length > 0) {
        setSelectedGrant(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisbursements = async (grantId: number) => {
    try {
      const { data, error } = await supabase
        .from('disbursements')
        .select('*')
        .eq('grant_id', grantId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setDisbursements(data || []);
    } catch (error) {
      console.error('Error fetching disbursements:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this disbursement?')) return;

    try {
      const { error } = await supabase.from('disbursements').delete().eq('id', id);
      if (error) throw error;
      setDisbursements(disbursements.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Error deleting disbursement:', error);
      alert('Failed to delete disbursement');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  const generateOfferLetter = () => {
    if (!selectedGrantData) return;

    const letterContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Grant Offer Letter</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            body {
              font-family: 'Inter', sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #1e3a8a;
              padding-bottom: 20px;
            }
            .logo {
              font-size: 28px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 8px;
            }
            .subtitle {
              color: #64748b;
              font-size: 14px;
            }
            .date {
              text-align: right;
              margin-bottom: 30px;
              color: #64748b;
            }
            .content {
              margin-bottom: 40px;
            }
            .project-name {
              font-size: 24px;
              font-weight: 700;
              color: #1e3a8a;
              margin: 20px 0;
            }
            .amount {
              font-size: 32px;
              font-weight: 800;
              color: #059669;
              margin: 20px 0;
            }
            .details-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #64748b;
            }
            .detail-value {
              font-weight: 600;
              color: #1e293b;
            }
            .signature-section {
              margin-top: 60px;
            }
            .signature-line {
              border-top: 2px solid #1e293b;
              width: 250px;
              margin-top: 60px;
            }
            .signature-name {
              margin-top: 8px;
              font-weight: 600;
            }
            .signature-title {
              color: #64748b;
              font-size: 14px;
            }
            .print-button {
              background: #1e3a8a;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin: 20px 0;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .print-button:hover {
              background: #1e40af;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Print Letter</button>

          <div class="header">
            <div class="logo">SSGMS</div>
            <div class="subtitle">State Grant Management System</div>
          </div>

          <div class="date">
            Date: ${new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <div class="content">
            <h1>Grant Offer Letter</h1>

            <div class="project-name">
              ${selectedGrantData.project_name}
            </div>

            <p>Dear Project Team,</p>

            <p>We are pleased to inform you that your grant application has been <strong>approved</strong>.</p>

            <div class="details-box">
              <div class="detail-row">
                <span class="detail-label">Approved Amount:</span>
                <span class="detail-value amount">${formatCurrency(selectedGrantData.amount_approved)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fund Source:</span>
                <span class="detail-value">${selectedGrantData.fund_sources?.name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Grant Year:</span>
                <span class="detail-value">${selectedGrantData.grant_years?.year || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${selectedGrantData.status}</span>
              </div>
            </div>

            <p>This grant from <strong>${selectedGrantData.fund_sources?.name || 'N/A'}</strong> has been allocated to support your project objectives. We trust that these funds will be utilized effectively to achieve the intended outcomes.</p>

            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Funds must be used in accordance with the approved project proposal</li>
              <li>Regular progress reports are required as per the grant agreement</li>
              <li>All expenditures must be properly documented and submitted for verification</li>
              <li>Any changes to the project scope must be approved in writing</li>
            </ul>

            <p>Please contact our office if you have any questions regarding this grant or the disbursement process.</p>

            <p>Congratulations on receiving this grant, and we look forward to the successful implementation of your project.</p>
          </div>

          <div class="signature-section">
            <p>Sincerely,</p>
            <div class="signature-line"></div>
            <div class="signature-name">Grant Management Office</div>
            <div class="signature-title">State Grant Management System</div>
          </div>
        </body>
      </html>
    `;

    const letterWindow = window.open('', '_blank');
    if (letterWindow) {
      letterWindow.document.write(letterContent);
      letterWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        <div className="bg-white rounded-xl p-8 shadow-sm animate-pulse">
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No grants available. Create a grant first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Disbursements</h1>
        <div className="flex gap-3">
          <button
            onClick={generateOfferLetter}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            <span>Print Offer Letter</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Disbursement</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <label htmlFor="grant-select" className="block text-sm font-medium text-slate-700 mb-2">
          Select Grant
        </label>
        <div className="relative">
          <select
            id="grant-select"
            value={selectedGrant || ''}
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
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDisbursed)}</p>
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
          <h2 className="text-lg font-semibold text-slate-900">Disbursement History</h2>
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
                {profile?.role === 'admin' && (
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {disbursements.length === 0 ? (
                <tr>
                  <td colSpan={profile?.role === 'admin' ? 3 : 2} className="px-6 py-12 text-center">
                    <p className="text-slate-500">No disbursements found for this grant</p>
                  </td>
                </tr>
              ) : (
                disbursements.map((disbursement) => (
                  <tr key={disbursement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(disbursement.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(disbursement.amount)}
                    </td>
                    {profile?.role === 'admin' && (
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
