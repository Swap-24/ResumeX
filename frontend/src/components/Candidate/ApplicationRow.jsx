import React, { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const ApplicationRow = ({ app }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'shortlisted':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          text: 'Shortlisted',
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          info: 'Congratulations! The recruiter has shortlisted your profile for the next round.'
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-4 w-4 text-rose-400" />,
          text: 'Rejected',
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          info: 'Thank you for your time. The recruiter has decided not to proceed with your application.'
        };
      case 'applied':
      default:
        return {
          icon: <Clock className="h-4 w-4 text-blue-400" />,
          text: 'Applied',
          style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          info: 'Review in progress. Your resume is being processed and ranked by our systems.'
        };
    }
  };

  const badgeInfo = getStatusBadge(app.application_status);
  const messageCount = app.messages?.length || 0;

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-white text-sm">
            {app.jobs?.title || 'Job Listing'}
          </h4>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(app.submitted_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeInfo.style}`}>
          {badgeInfo.icon}
          {badgeInfo.text}
        </div>
      </div>

      {/* Status Info Text */}
      <p className="text-[11px] text-gray-400 italic bg-white/[0.01] px-3 py-2 rounded-lg border border-white/5">
        {badgeInfo.info}
      </p>

      {/* Message History dropdown */}
      {messageCount > 0 && (
        <div className="border-t border-white/5 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide Employer Messages ({messageCount})
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                View Employer Messages ({messageCount})
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto pr-1 animate-fade-in">
              {app.messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className="bg-brand-500/[0.02] border border-brand-500/10 rounded-xl p-3 text-[11px] space-y-1.5"
                >
                  <div className="flex justify-between items-center text-gray-400 font-medium">
                    <span>Recruiter Message</span>
                    <span>{new Date(msg.sent_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.message_body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationRow;
