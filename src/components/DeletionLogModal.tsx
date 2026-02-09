import { X, RefreshCw } from "lucide-react";
import type { DeletionLog } from "../lib/types";

interface DeletionLogModalProps {
  title: string;
  logs: DeletionLog[];
  deletedByLookup: Record<string, string>;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function DeletionLogModal({
  title,
  logs,
  deletedByLookup,
  isLoading,
  error,
  onClose,
  onRefresh,
}: DeletionLogModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Recent deletion activity for grants.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading && (
            <p className="text-sm text-slate-500">Loading deletion logs...</p>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No deletion logs recorded yet.
            </div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Grant
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Deleted By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {log.entity_label || (log.metadata as { projectName?: string } | null)?.projectName || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-md">
                        {log.reason}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {log.deleted_by ? deletedByLookup[log.deleted_by] || "Unknown" : "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
