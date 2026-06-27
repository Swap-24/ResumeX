import React from 'react';
import { Award, MessageSquare, X, Check } from 'lucide-react';

const BulkActionsBar = ({
  selectedCount,
  bulkMessage,
  onChangeMessage,
  onReject,
  onShortlist,
  defaultShortlistMessage,
  defaultRejectionMessage,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50 glass-panel rounded-2xl border border-brand-500/30 p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up bg-dark-card/90">
      <div className="space-y-1 text-center md:text-left">
        <h4 className="font-display font-bold text-sm text-white flex items-center gap-2 justify-center md:justify-start">
          <Award className="h-4 w-4 text-brand-400" />
          Bulk Action Checklist ({selectedCount} Selected)
        </h4>
        <p className="text-xs text-gray-400">Perform a bulk shortlist or reject on chosen candidates.</p>
      </div>

      <div className="flex-1 w-full max-w-md space-y-1.5">
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={bulkMessage}
            onChange={(e) => onChangeMessage(e.target.value)}
            className="w-full bg-dark-bg/60 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs"
            placeholder="Attach optional message (e.g. interview links or feedback)"
          />
        </div>
        {(defaultShortlistMessage || defaultRejectionMessage) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Use templates:</span>
            {defaultShortlistMessage && (
              <button
                type="button"
                onClick={() => onChangeMessage(defaultShortlistMessage)}
                className="text-[9px] bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20 transition-all cursor-pointer font-medium"
              >
                Shortlist
              </button>
            )}
            {defaultRejectionMessage && (
              <button
                type="button"
                onClick={() => onChangeMessage(defaultRejectionMessage)}
                className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 transition-all cursor-pointer font-medium"
              >
                Rejection
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-center">
        <button
          onClick={onReject}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          Reject Selected
        </button>
        <button
          onClick={onShortlist}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Shortlist Selected
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
