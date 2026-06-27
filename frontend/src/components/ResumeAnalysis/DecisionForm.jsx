import React, { useState } from 'react';
import { Send } from 'lucide-react';

const DecisionForm = ({
  onSubmitAction,
  onSendOnlyMessage,
  defaultShortlistMessage,
  defaultRejectionMessage,
}) => {
  const [individualMessage, setIndividualMessage] = useState('');

  const handleAction = (status) => {
    onSubmitAction(status, individualMessage);
    setIndividualMessage('');
  };

  const handleSendOnly = (e) => {
    e.preventDefault();
    if (!individualMessage.trim()) return;
    onSendOnlyMessage(individualMessage);
    setIndividualMessage('');
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Candidate Decision & Message</h3>
      
      <form onSubmit={handleSendOnly} className="space-y-4">
        <textarea
          rows={4}
          value={individualMessage}
          onChange={(e) => setIndividualMessage(e.target.value)}
          className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs leading-relaxed"
          placeholder="Type response message here... (Required for sending messages, optional for shortlist/reject decisions)"
        />

        {(defaultShortlistMessage || defaultRejectionMessage) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Use templates:</span>
            {defaultShortlistMessage && (
              <button
                type="button"
                onClick={() => setIndividualMessage(defaultShortlistMessage)}
                className="text-[10px] bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-2.5 py-1 rounded border border-brand-500/20 transition-all cursor-pointer font-medium"
              >
                Shortlist
              </button>
            )}
            {defaultRejectionMessage && (
              <button
                type="button"
                onClick={() => setIndividualMessage(defaultRejectionMessage)}
                className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded border border-rose-500/20 transition-all cursor-pointer font-medium"
              >
                Rejection
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleAction('rejected')}
            className="px-4 py-2.5 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleAction('shortlisted')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            Shortlist
          </button>
        </div>

        <button
          type="submit"
          disabled={!individualMessage.trim()}
          className="w-full py-2.5 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 font-semibold rounded-xl text-xs border border-white/5 transition-all cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          Send Message Only
        </button>
      </form>
    </div>
  );
};

export default DecisionForm;
