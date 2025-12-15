import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Disbursement, Grant, GrantWithRelations } from '../lib/types';

interface DashboardStats {
  totalApproved: number;
  totalDisbursed: number;
  remainingBalance: number;
}

interface MonthlyDataPoint {
  [key: string]: string | number;
  month: string;
  budgetAdded: number;
  disbursed: number;
}

interface StatusSlice {
  [key: string]: string | number;
  name: string;
  value: number;
}

interface FundSourcePoint {
  [key: string]: string | number;
  name: string;
  amount: number;
}

interface TopRemainingPoint {
  [key: string]: string | number;
  project: string;
  remaining: number;
}

interface RecentDisbursementRow {
  id: number;
  amount: number;
  payment_date: string;
  grants?: { project_name: string } | Array<{ project_name: string }>;
}

type KpiGrantRow = Pick<Grant, 'id' | 'project_name' | 'amount_approved' | 'created_at'> & {
  fund_sources?: { source_name?: string };
};

type KpiDisbursementRow = Pick<Disbursement, 'grant_id' | 'amount' | 'payment_date'>;

const STATUS_ORDER: Array<'approved' | 'ongoing' | 'completed'> = ['approved', 'ongoing', 'completed'];
const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  approved: 'Approved',
  ongoing: 'Ongoing',
  completed: 'Completed',
};
const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  approved: '#059669',
  ongoing: '#f59e0b',
  completed: '#1e3a8a',
};

const FUND_SOURCE_COLORS = [
  '#1e3a8a',
  '#0ea5e9',
  '#059669',
  '#f59e0b',
  '#7c3aed',
  '#ef4444',
  '#14b8a6',
  '#e11d48',
  '#84cc16',
  '#f97316',
];

const TOP_REMAINING_COLORS = ['#1e3a8a', '#0ea5e9', '#7c3aed', '#059669', '#f59e0b'];

function makeColorMap(categories: string[], palette: string[]) {
  const colors = palette.length > 0 ? palette : ['#1e3a8a'];
  const unique = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

  const map = new Map<string, string>();
  unique.forEach((category, index) => {
    map.set(category, colors[index % colors.length]);
  });
  return map;
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-MY', { month: 'short' }).format(date);
}

function buildCalendarYearMonths(year: number) {
  const months: Array<{ key: string; label: string; budgetAdded: number; disbursed: number }> = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const d = new Date(year, monthIndex, 1);
    months.push({
      key: getMonthKey(d),
      label: getMonthLabel(d),
      budgetAdded: 0,
      disbursed: 0,
    });
  }

  return months;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApproved: 0,
    totalDisbursed: 0,
    remainingBalance: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusSlice[]>([]);
  const [fundSourceData, setFundSourceData] = useState<FundSourcePoint[]>([]);
  const [topRemainingData, setTopRemainingData] = useState<TopRemainingPoint[]>([]);
  const [recentGrants, setRecentGrants] = useState<GrantWithRelations[]>([]);
  const [recentDisbursements, setRecentDisbursements] = useState<RecentDisbursementRow[]>([]);
  const [chartGrants, setChartGrants] = useState<KpiGrantRow[]>([]);
  const [chartDisbursements, setChartDisbursements] = useState<KpiDisbursementRow[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fundSourceColorByName = useMemo(() => {
    return makeColorMap(
      fundSourceData.map((d) => String(d.name)),
      FUND_SOURCE_COLORS,
    );
  }, [fundSourceData]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const months = buildCalendarYearMonths(selectedYear);
    const monthsByKey = new Map(months.map((m) => [m.key, m]));

    for (const grant of chartGrants) {
      const createdAt = new Date(grant.created_at);
      const key = getMonthKey(createdAt);
      const bucket = monthsByKey.get(key);
      if (bucket) bucket.budgetAdded += grant.amount_approved;
    }

    for (const d of chartDisbursements) {
      const paymentDate = new Date(d.payment_date);
      const key = getMonthKey(paymentDate);
      const bucket = monthsByKey.get(key);
      if (bucket) bucket.disbursed += d.amount;
    }

    setMonthlyData(
      months.map((m) => ({ month: m.label, budgetAdded: m.budgetAdded, disbursed: m.disbursed })),
    );
  }, [chartDisbursements, chartGrants, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      const [kpiGrantsResponse, statusCountsResponse, recentGrantsResponse, recentDisbursementsResponse] =
        await Promise.all([
          supabase
            .from('grants')
            .select('id, project_name, amount_approved, created_at, fund_sources(source_name)')
            .in('status', ['approved', 'ongoing']),
          supabase.from('grants').select('status').in('status', ['approved', 'ongoing', 'completed']),
        supabase
          .from('grants')
          .select('*, fund_sources(*), grant_years(*)')
          .order('created_at', { ascending: false })
          .limit(5),
          supabase
            .from('disbursements')
            .select('id, amount, payment_date, grants(project_name)')
            .order('payment_date', { ascending: false })
            .limit(5),
        ]);

      const kpiGrants = (kpiGrantsResponse.data as KpiGrantRow[]) ?? [];
      const totalApproved = kpiGrants.reduce((sum, grant) => sum + grant.amount_approved, 0);

      const kpiGrantIds = kpiGrants.map((g) => g.id);
      const kpiDisbursementsResponse = kpiGrantIds.length
        ? await supabase
            .from('disbursements')
            .select('grant_id, amount, payment_date')
            .in('grant_id', kpiGrantIds)
        : { data: [] as KpiDisbursementRow[] };

      const disbursedByGrantId = new Map<number, number>();
      const kpiDisbursements = (kpiDisbursementsResponse.data as KpiDisbursementRow[] ?? []);
      for (const disbursement of kpiDisbursements) {
        disbursedByGrantId.set(
          disbursement.grant_id,
          (disbursedByGrantId.get(disbursement.grant_id) || 0) + disbursement.amount,
        );
      }

      const totalDisbursed = kpiDisbursements.reduce((sum, d) => sum + d.amount, 0);
      const remainingBalance = kpiGrants.reduce(
        (sum, grant) => sum + (grant.amount_approved - (disbursedByGrantId.get(grant.id) || 0)),
        0,
      );

      setStats({
        totalApproved,
        totalDisbursed,
        remainingBalance,
      });

      setChartGrants(kpiGrants);
      setChartDisbursements(kpiDisbursements);

      const years = new Set<number>();
      for (const grant of kpiGrants) years.add(new Date(grant.created_at).getFullYear());
      for (const d of kpiDisbursements) years.add(new Date(d.payment_date).getFullYear());
      years.add(new Date().getFullYear());

      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
      setSelectedYear((prev) => (sortedYears.includes(prev) ? prev : (sortedYears[0] ?? prev)));

      // Grants by status (approved/ongoing/completed)
      const statusCounts = new Map<string, number>();
      (statusCountsResponse.data as Array<Pick<Grant, 'status'>> | null)?.forEach((row) => {
        const status = (row.status || '').toLowerCase();
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      setStatusData(
        STATUS_ORDER.map((status) => ({
          name: STATUS_LABEL[status],
          value: statusCounts.get(status) || 0,
        })),
      );

      // Budget by fund source (approved+ongoing)
      const budgetBySource = new Map<string, number>();
      for (const grant of kpiGrants) {
        const source = grant.fund_sources?.source_name || 'Unknown';
        budgetBySource.set(source, (budgetBySource.get(source) || 0) + grant.amount_approved);
      }
      setFundSourceData(
        Array.from(budgetBySource.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
      );

      // Top 5 grants by remaining (approved+ongoing)
      setTopRemainingData(
        kpiGrants
          .map((grant) => ({
            project: grant.project_name,
            remaining: grant.amount_approved - (disbursedByGrantId.get(grant.id) || 0),
          }))
          .sort((a, b) => b.remaining - a.remaining)
          .slice(0, 5),
      );

      setRecentGrants(recentGrantsResponse.data || []);
      setRecentDisbursements((recentDisbursementsResponse.data as RecentDisbursementRow[]) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <Link
          to="/grants?status=approved,ongoing"
          aria-label="View approved and ongoing grants"
          className="block bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Budget (Approved + Ongoing)</h3>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalApproved)}</p>
        </Link>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Disbursed (Approved + Ongoing)</h3>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalDisbursed)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Remaining Balance (Approved + Ongoing)</h3>
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(stats.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Budget vs Disbursed</h2>
              <p className="text-sm text-slate-600">Calendar year (Approved + Ongoing)</p>
            </div>
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Year</span>
                <select
                  value={String(selectedYear)}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="budgetAdded"
                  name="Budget added"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="disbursed"
                  name="Disbursed"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No time-series data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Grants by Status</h2>
          <p className="text-sm text-slate-600 mb-6">Approved, Ongoing, Completed</p>
          {statusData.reduce((sum, s) => sum + s.value, 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {statusData.map((slice) => {
                    const key = slice.name.toLowerCase() as (typeof STATUS_ORDER)[number];
                    const fill = STATUS_COLORS[key] || '#1e3a8a';
                    return <Cell key={slice.name} fill={fill} />;
                  })}
                </Pie>
                <Tooltip
                  formatter={(value) => String(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No status data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Budget by Fund Source</h2>
          <p className="text-sm text-slate-600 mb-6">Approved + Ongoing</p>
          {fundSourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fundSourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" interval={0} tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="amount" name="Budget" radius={[8, 8, 0, 0]}>
                  {fundSourceData.map((entry) => (
                    <Cell
                      key={String(entry.name)}
                      fill={fundSourceColorByName.get(String(entry.name)) || FUND_SOURCE_COLORS[0]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No fund source data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Top 5 by Remaining</h2>
          <p className="text-sm text-slate-600 mb-6">Approved + Ongoing</p>
          {topRemainingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topRemainingData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="project" type="category" stroke="#64748b" width={150} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="remaining" name="Remaining" radius={[0, 8, 8, 0]}>
                  {topRemainingData.map((entry, index) => (
                    <Cell
                      key={String(entry.project)}
                      fill={TOP_REMAINING_COLORS[index % TOP_REMAINING_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No remaining balance data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                              : grant.status === 'ongoing'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Recent Disbursements</h2>
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
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-slate-500">No recent disbursements</p>
                    </td>
                  </tr>
                ) : (
                  recentDisbursements.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {(Array.isArray(d.grants) ? d.grants[0]?.project_name : d.grants?.project_name) ||
                          'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(d.payment_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
