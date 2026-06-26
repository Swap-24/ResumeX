import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Trash2, X } from 'lucide-react';
import JobSidebar from './JobDetails/JobSidebar';
import CandidateRow from './JobDetails/CandidateRow';
import BulkActionsBar from './JobDetails/BulkActionsBar';

const JobDetails = ({ job, candidates, onBack, onSelectCandidate, onBulkShortlist, onBulkReject, onDeleteJob }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Reset selected IDs when job changes
  useEffect(() => {
    setSelectedIds([]);
    setBulkMessage('');
  }, [job]);

  const handleSelectToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectTop = (count) => {
    const validCandidates = candidates
      .filter((c) => c.status === 'done')
      .slice(0, count)
      .map((c) => c.id);
    setSelectedIds(validCandidates);
  };

  const handleSelectAll = () => {
    setSelectedIds(candidates.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;
    if (action === 'shortlist') {
      onBulkShortlist(selectedIds, bulkMessage);
    } else {
      onBulkReject(selectedIds, bulkMessage);
    }
    setSelectedIds([]);
    setBulkMessage('');
  };

  const getBadgeStyle = (label) => {
    switch (label?.toLowerCase()) {
      case 'excellent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'strong':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
      case 'average':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'weak':
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/25';
    }
  };

  const getAppStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'shortlisted':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'rejected':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Back navigation & header info */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </button>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all duration-300 cursor-pointer text-xs font-semibold"
          >
            <Trash2 className="h-4 w-4" />
            Delete Listing
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-white/5 text-gray-300 rounded-full border border-white/5">
              {job.department || 'General'}
            </span>
            <h1 className="font-display font-extrabold text-3xl text-white tracking-tight mt-2">{job.title}</h1>
            <p className="text-gray-400 text-sm max-w-2xl">{job.location} &bull; {job.employment_type}</p>
          </div>

          <div className="flex items-center gap-6 bg-dark-card/50 border border-white/5 rounded-2xl p-4">
            <div className="text-center">
              <span className="block text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Applicants</span>
              <span className="text-xl font-extrabold text-white mt-1 block">{candidates.length}</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <span className="block text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Avg Match</span>
              <span className="text-xl font-extrabold text-brand-400 mt-1 block">{job.average_score}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Job Details Card */}
        <JobSidebar description={job.description} requirements={job.requirements} />

        {/* Candidate List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h2 className="font-display font-bold text-xl text-white">Candidate Rankings</h2>

            {/* Quick selectors */}
            {candidates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSelectTop(3)}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                >
                  Top 3
                </button>
                <button
                  onClick={() => handleSelectTop(5)}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                >
                  Top 5
                </button>
                <button
                  onClick={handleSelectAll}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                >
                  Select All
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-2.5 py-1.5 rounded-lg border border-brand-500/20 cursor-pointer"
                  >
                    Deselect
                  </button>
                )}
              </div>
            )}
          </div>

          {candidates.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 border-dashed border-2 border-white/5">
              <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4 stroke-1" />
              <p className="text-base font-semibold">No applicants yet</p>
              <p className="text-sm mt-1">Candidates applying on the Job Seeker portal will automatically appear here ranked in real-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate, idx) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  index={idx}
                  isSelected={selectedIds.includes(candidate.id)}
                  onSelectToggle={() => handleSelectToggle(candidate.id)}
                  onSelectCandidate={onSelectCandidate}
                  getBadgeStyle={getBadgeStyle}
                  getAppStatusStyle={getAppStatusStyle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          bulkMessage={bulkMessage}
          onChangeMessage={setBulkMessage}
          onReject={() => handleBulkAction('reject')}
          onShortlist={() => handleBulkAction('shortlist')}
        />
      )}

      {/* Confirmation Modal for Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-display font-extrabold text-lg text-white">Delete Job Listing?</h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300 text-sm leading-relaxed">
                Are you sure you want to delete <strong className="text-white">"{job.title}"</strong>? 
              </p>
              <p className="text-rose-400/90 text-xs bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                This action is permanent and will remove the job listing as well as all candidate applications linked to it.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-semibold text-white transition-all text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteJob(job.id);
                  setShowDeleteModal(false);
                  onBack();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-rose-500/25 hover:scale-102 text-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
