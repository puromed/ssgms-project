import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import type { GrantWithRelations, Grant, Disbursement } from '../lib/types';

interface DashboardStats {
  totalApproved: number;
  totalDisbursed: number;
  remainingBalance: number;
}

interface YearData {
  year: number;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApproved: 0,
    totalDisbursed: 0,
    remainingBalance: 0,
  });
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [recentGrants, setRecentGrants] = useState<GrantWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [grantsResponse, disbursementsResponse, yearCountResponse, recentGrantsResponse] = await Promise.all([
        supabase.from('grants').select('amount_approved'),
        supabase.from('disbursements').select('amount'),
        supabase
          .from('grants')
          .select('*, grant_years(year_value)')
          .order('year_id'),
        supabase
          .from('grants')
          .select('*, fund_sources(*), grant_years(*)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const totalApproved =
        (grantsResponse.data as Pick<Grant, 'amount_approved'>[] ?? []).reduce(
          (sum, grant) => sum + grant.amount_approved,
          0
        );
      const totalDisbursed =
        (disbursementsResponse.data as Pick<Disbursement, 'amount'>[] ?? []).reduce(
          (sum, disbursement) => sum + disbursement.amount,
          0
        );

      setStats({
        totalApproved,
        totalDisbursed,
        remainingBalance: totalApproved - totalDisbursed,
      });

      const yearCounts = new Map<number, number>();
      yearCountResponse.data?.forEach((grant: any) => {
        const year = grant.grant_years?.year_value;
        if (year) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        }
      });

      const chartData = Array.from(yearCounts.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

      setYearData(chartData);
      setRecentGrants(recentGrantsResponse.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Grants Approved</h3>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalApproved)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Disbursed</h3>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalDisbursed)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Remaining Balance</h3>
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(stats.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Grants by Year</h2>
        {yearData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p>No grant data available</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Recent Grants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentGrants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <p className="text-slate-500">No recent grants</p>
                  </td>
                </tr>
              ) : (
                recentGrants.map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {grant.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatCurrency(grant.amount_approved)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          grant.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : grant.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
