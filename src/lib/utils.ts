export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export function getFundSourceBadgeClass(sourceName?: string) {
  const palette = [
    'bg-purple-100 text-purple-800',
    'bg-teal-100 text-teal-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-800',
    'bg-indigo-100 text-indigo-800',
    'bg-emerald-100 text-emerald-800',
  ];

  if (!sourceName) return 'bg-slate-100 text-slate-700';

  // simple deterministic hash from string to index
  let hash = 0;
  for (let i = 0; i < sourceName.length; i++) {
    hash = (hash << 5) - hash + sourceName.charCodeAt(i);
    hash |= 0; // convert to 32bit int
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}
