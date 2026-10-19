import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AccountSectionProps {
  onDeleteAccountAndData?: () => Promise<void>;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ onDeleteAccountAndData }) => {
  const [showModal, setShowModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (confirmInput.trim().toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    try {
      if (onDeleteAccountAndData) {
        await onDeleteAccountAndData();
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setIsDeleting(false);
      setShowModal(false);
      setConfirmInput('');
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight text-rose-600 dark:text-rose-400">
          Account & Database Management
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Permanently delete your account profile and purge all associated calendar events, tasks, targets, and tag settings from the database.
      </p>

      <button
        type="button"
        onClick={() => {
          setConfirmInput('');
          setShowModal(true);
        }}
        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete Account & Data</span>
      </button>

      {/* Delete Account Modal with 'DELETE' text verification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/90 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Account & Wipe Database?</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
              <p className="font-semibold">
                This will permanently delete your account and remove all data:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300 text-[11.5px]">
                <li>All calendar events, time blocks, and recurring schedules</li>
                <li>All tasks, subtasks, checklists, and task groups</li>
                <li>All targets, goals, progress metrics, and timeline records</li>
                <li>All custom tags, colors, and priority settings</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <span className="font-sans text-rose-600 dark:text-rose-400 font-bold tracking-wider">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-sans focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowModal(false);
                  setConfirmInput('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toLowerCase() !== 'delete' || isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
