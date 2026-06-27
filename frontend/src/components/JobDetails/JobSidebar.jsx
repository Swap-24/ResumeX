import React, { useState, useEffect } from 'react';
import { Settings, Check, X, FileEdit } from 'lucide-react';

const JobSidebar = ({ job, onUpdateJob }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [shortlistMsg, setShortlistMsg] = useState('');
  const [rejectionMsg, setRejectionMsg] = useState('');

  // Sync state when job details change
  useEffect(() => {
    setShortlistMsg(job.default_shortlist_message || '');
    setRejectionMsg(job.default_rejection_message || '');
  }, [job]);

  const handleSave = () => {
    onUpdateJob(job.id, {
      default_shortlist_message: shortlistMsg.trim() || null,
      default_rejection_message: rejectionMsg.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setShortlistMsg(job.default_shortlist_message || '');
    setRejectionMsg(job.default_rejection_message || '');
    setIsEditing(false);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl h-fit space-y-6 border border-white/5 shadow-xl bg-dark-card/30">
      <div>
        <h3 className="font-display font-bold text-base text-white">Job Description</h3>
        <p className="text-gray-300 text-xs mt-2.5 leading-relaxed whitespace-pre-wrap">{job.description}</p>
      </div>
      
      <div className="border-t border-white/5 pt-5">
        <h3 className="font-display font-bold text-base text-white">Key Requirements</h3>
        <p className="text-gray-300 text-xs mt-2.5 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
      </div>

      <div className="border-t border-white/5 pt-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-1.5">
            <Settings className="h-4.5 w-4.5 text-brand-400" />
            Decision Templates
          </h3>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider cursor-pointer bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/15 hover:border-brand-500/25 transition-all"
            >
              <FileEdit className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3.5 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shortlist Message</label>
              <textarea
                rows={3}
                value={shortlistMsg}
                onChange={(e) => setShortlistMsg(e.target.value)}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs leading-relaxed"
                placeholder="Message template for shortlisted candidates..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rejection Message</label>
              <textarea
                rows={3}
                value={rejectionMsg}
                onChange={(e) => setRejectionMsg(e.target.value)}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs leading-relaxed"
                placeholder="Message template for rejected candidates..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-1.5">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg font-semibold text-white transition-all text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition-all shadow-md text-xs cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl space-y-1">
              <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Shortlist Template</h4>
              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
                {job.default_shortlist_message || <span className="text-gray-500 italic">No template set. Will default to empty.</span>}
              </p>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl space-y-1">
              <h4 className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">Rejection Template</h4>
              <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
                {job.default_rejection_message || <span className="text-gray-500 italic">No template set. Will default to empty.</span>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobSidebar;
