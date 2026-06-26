import React from 'react';
import { MapPin, Briefcase, Users, Calendar } from 'lucide-react';

const JobCard = ({ job, onSelect, getScoreColor }) => {
  const scoreStyle = getScoreColor(job.average_score);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString();
    } catch (err) {
      return null;
    }
  };

  const formattedDeadline = formatDate(job.application_deadline);

  return (
    <div
      onClick={onSelect}
      className={`glass-panel glass-panel-hover p-6 rounded-2xl cursor-pointer flex flex-col justify-between h-[230px] border shadow-xl relative overflow-hidden ${scoreStyle.glow}`}
    >
      {/* Subtle color glow backings for card corner */}
      <div className={`absolute top-0 right-0 h-24 w-24 opacity-10 blur-xl rounded-full ${
        job.average_score >= 80 ? 'bg-emerald-500' : job.average_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
      }`} />
      
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-white/5 text-gray-300 rounded-full border border-white/5">
            {job.department || 'General'}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${scoreStyle.bg} ${scoreStyle.text} ${scoreStyle.border}`}>
            Match: {job.average_score}%
          </span>
        </div>

        <div>
          <h3 className="font-display font-bold text-lg text-white line-clamp-1">
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-500" />
              {job.location || 'Remote'}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-gray-500" />
              {job.employment_type || 'Full-time'}
            </span>
            {formattedDeadline && (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <Calendar className="h-3.5 w-3.5 text-rose-400" />
                {formattedDeadline}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Users className="h-4 w-4 text-brand-400" />
          {job.applicant_count || 0} applicants
        </span>
        <span className="text-xs text-brand-400 font-semibold flex items-center gap-1 hover:underline">
          View Ranking &rarr;
        </span>
      </div>
    </div>
  );
};

export default JobCard;
