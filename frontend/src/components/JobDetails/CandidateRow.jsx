import React from 'react';
import { Download, ShieldAlert } from 'lucide-react';

const CandidateRow = ({
  candidate,
  index,
  isSelected,
  onSelectToggle,
  onSelectCandidate,
  getBadgeStyle,
  getAppStatusStyle
}) => {
  const scoreLabel =
    candidate.overall_score >= 81
      ? 'Excellent'
      : candidate.overall_score >= 66
      ? 'Strong'
      : candidate.overall_score >= 41
      ? 'Average'
      : 'Weak';

  const getGradientStyle = (score) => {
    if (score >= 81) {
      return {
        bg: 'bg-gradient-to-r from-emerald-500/[0.03] via-emerald-500/[0.01] to-transparent',
        border: 'border-emerald-500/10 hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.02)]'
      };
    }
    if (score >= 66) {
      return {
        bg: 'bg-gradient-to-r from-indigo-500/[0.03] via-indigo-500/[0.01] to-transparent',
        border: 'border-indigo-500/10 hover:border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.02)]'
      };
    }
    if (score >= 41) {
      return {
        bg: 'bg-gradient-to-r from-amber-500/[0.03] via-amber-500/[0.01] to-transparent',
        border: 'border-amber-500/10 hover:border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.02)]'
      };
    }
    return {
      bg: 'bg-gradient-to-r from-rose-500/[0.03] via-rose-500/[0.01] to-transparent',
      border: 'border-rose-500/10 hover:border-rose-500/30 shadow-[0_0_15px_rgba(239,68,110,0.02)]'
    };
  };

  const cardStyle = getGradientStyle(candidate.overall_score || 0);

  return (
    <div
      className={`glass-panel p-4 rounded-xl flex items-center justify-between border transition-all duration-300 hover:scale-[1.01] ${cardStyle.bg} ${cardStyle.border} ${
        isSelected ? 'ring-1 ring-brand-500/30' : ''
      }`}
    >
      {/* Checkbox and Rank info */}
      <div className="flex items-center gap-4">
        {candidate.status === 'done' ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelectToggle}
            className="h-4.5 w-4.5 rounded border-white/10 text-brand-600 bg-dark-bg focus:ring-brand-500 cursor-pointer"
          />
        ) : (
          <div className="w-4.5" />
        )}

        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-gray-500 text-sm w-5 text-center">
            #{index + 1}
          </span>
          <div>
            <h4 className="font-semibold text-white text-sm">{candidate.candidate_name}</h4>
            <span className="text-xs text-gray-400 block">{candidate.candidate_email}</span>
          </div>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center gap-6">
        {candidate.status === 'analyzing' ? (
          <span className="flex items-center gap-1.5 text-xs text-brand-400 font-medium animate-pulse-slow">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
            Analyzing...
          </span>
        ) : candidate.status === 'failed' ? (
          <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            Failed
          </span>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-white font-extrabold text-sm block">
                {candidate.overall_score}%
              </span>
              <span
                className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 mt-0.5 block rounded-full border ${getBadgeStyle(
                  scoreLabel
                )}`}
              >
                {scoreLabel}
              </span>
            </div>

            <div className="text-right">
              <span
                className={`text-[10px] capitalize font-bold px-2.5 py-1 block rounded-full border ${getAppStatusStyle(
                  candidate.application_status
                )}`}
              >
                {candidate.application_status}
              </span>
            </div>
          </div>
        )}

        {candidate.status === 'done' && (
          <div className="flex items-center gap-2">
            <a
              href={`http://localhost:8000/resumes/${candidate.id}/download`}
              target="_blank"
              rel="noreferrer"
              title="Download PDF Resume"
              className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={() => onSelectCandidate(candidate)}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/5 hover:bg-brand-500/10 px-3.5 py-2 rounded-lg border border-brand-500/10 hover:border-brand-500/20 transition-all cursor-pointer"
            >
              View Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateRow;
