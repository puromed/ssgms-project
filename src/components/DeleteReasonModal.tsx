import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteReasonModalProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export default function DeleteReasonModal({
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isSubmitting = false,
  onCancel,
  onConfirm,
}: DeleteReasonModalProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {description && (
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (!isValid) return;
            onConfirm(trimmedReason);
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for deletion
            </label>
            <textarea
              ref={inputRef}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Provide a short reason for this deletion"
              disabled={isSubmitting}
              required
            />
            {touched && !isValid && (
              <p className="text-xs text-red-600 mt-2">
                Please provide a reason before deleting.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
