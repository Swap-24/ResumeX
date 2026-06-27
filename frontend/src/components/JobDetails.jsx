import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Trash2, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobSidebar from './JobDetails/JobSidebar';
import CandidateRow from './JobDetails/CandidateRow';
import BulkActionsBar from './JobDetails/BulkActionsBar';
import WeightSidebar from './JobDetails/WeightSidebar';

const JobDetails = ({
  job,
  candidates,
  onBack,
  onSelectCandidate,
  onBulkShortlist,
  onBulkReject,
  onDeleteJob,
  onUpdateJob,
  onRetryAnalysis,
  sliders,
  setSliders,
  calculateDynamicScore,
}) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectRemainingModal, setShowRejectRemainingModal] = useState(false);
  const [scoreThreshold, setScoreThreshold] = useState('');
  const [rankThreshold, setRankThreshold] = useState('');

  // Reset selected IDs when job or tab changes
  useEffect(() => {
    setSelectedIds([]);
    setBulkMessage('');
    setScoreThreshold('');
    setRankThreshold('');
  }, [job, activeTab]);

  const handleSelectToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate dynamic candidates with overall score overridden
  const dynamicCandidates = candidates.map((c) => {
    if (c.status !== 'done') return c;
    const dynamicScore = calculateDynamicScore(c, sliders);
    return { ...c, overall_score: dynamicScore };
  });

  // Sort candidates dynamically: 'done' ones sorted by dynamic overall_score, others kept at bottom
  const sortedCandidates = [...dynamicCandidates].sort((a, b) => {
    if (a.status !== 'done' && b.status !== 'done') return 0;
    if (a.status !== 'done') return 1;
    if (b.status !== 'done') return -1;
    return b.overall_score - a.overall_score;
  });

  // Compute counts for tabs
  const pendingCount = sortedCandidates.filter(
    (c) => c.application_status !== 'shortlisted' && c.application_status !== 'rejected'
  ).length;
  const shortlistedCount = sortedCandidates.filter(
    (c) => c.application_status === 'shortlisted'
  ).length;
  const rejectedCount = sortedCandidates.filter(
    (c) => c.application_status === 'rejected'
  ).length;

  // Filter candidates based on active tab
  const tabCandidates = sortedCandidates.filter((c) => {
    if (activeTab === 'shortlisted') {
      return c.application_status === 'shortlisted';
    } else if (activeTab === 'rejected') {
      return c.application_status === 'rejected';
    } else {
      return c.application_status !== 'shortlisted' && c.application_status !== 'rejected';
    }
  });

  // Compute dynamic Average Match score
  const activeScores = dynamicCandidates
    .filter((c) => c.status === 'done')
    .map((c) => c.overall_score);
  const dynamicAverageScore = activeScores.length > 0
    ? Math.round(activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length)
    : 0;

  const handleScoreThresholdChange = (val) => {
    setScoreThreshold(val);
    setRankThreshold('');
    if (val === '') {
      setSelectedIds([]);
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const matching = tabCandidates
      .filter((c) => c.status === 'done' && c.overall_score >= num)
      .map((c) => c.id);
    setSelectedIds(matching);
  };

  const handleRankThresholdChange = (val) => {
    setRankThreshold(val);
    setScoreThreshold('');
    if (val === '') {
      setSelectedIds([]);
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const matching = tabCandidates
      .filter((c) => c.status === 'done')
      .slice(0, num)
      .map((c) => c.id);
    setSelectedIds(matching);
  };

  const handleSelectAll = () => {
    setSelectedIds(
      tabCandidates
        .filter((c) => c.status === 'done')
        .map((c) => c.id)
    );
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
    setScoreThreshold('');
    setRankThreshold('');
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
    setScoreThreshold('');
    setRankThreshold('');
  };

  const handleExportCSV = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const getSectionScore = (candidate, key) => {
        const sections = candidate.resume_sections || candidate.sections || [];
        const sec = sections.find(s => s.section_key === key);
        return sec ? sec.score : 'N/A';
      };

      const toCSVCell = (val) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const headers = [
        'Rank', 'Candidate Name', 'Email', 'Overall Match Score (%)', 'Status',
        'Work Experience Score', 'Projects Score', 'Skills Score', 'Education Score',
        'Certifications Score', 'Resume Quality Score', 'Trajectory Score',
        'Impact Quality Score', 'Inferred Intent Score',
      ];

      const rows = tabCandidates.map((c, idx) => [
        idx + 1,
        c.candidate_name,
        c.candidate_email,
        c.status === 'done' ? `${c.overall_score}%` : 'Pending',
        c.application_status === 'under_review' ? 'Applied' : (c.application_status || ''),
        getSectionScore(c, 'work_experience'),
        getSectionScore(c, 'projects'),
        getSectionScore(c, 'skills'),
        getSectionScore(c, 'education'),
        getSectionScore(c, 'certifications'),
        getSectionScore(c, 'resume_quality'),
        getSectionScore(c, 'trajectory'),
        getSectionScore(c, 'impact_quality'),
        getSectionScore(c, 'inferred_intent'),
      ]);

      // UTF-8 BOM so Excel reads it correctly
      const csvContent = '\ufeff' + [headers, ...rows]
        .map(row => row.map(toCSVCell).join(','))
        .join('\n');

      const safeName = (job.title || 'job').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_');
      const suggestedFileName = `${safeName}_${activeTab}_candidates.csv`;

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedFileName,
          types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      } else {
        await navigator.clipboard.writeText(csvContent);
        alert('CSV copied to clipboard! Paste into a .csv file to save.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('[ResumeX] CSV export error:', err);
      }
    }
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
              <span className="text-xl font-extrabold text-brand-400 mt-1 block">{dynamicAverageScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Job Details Card & Weight configuration */}
        <div className="space-y-6 h-fit">
          <JobSidebar job={job} onUpdateJob={onUpdateJob} />
          <WeightSidebar sliders={sliders} setSliders={setSliders} />
        </div>

        {/* Candidate List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h2 className="font-display font-bold text-xl text-white">Candidate Rankings</h2>

            {/* Quick selectors */}
            {candidates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Score &ge;</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreThreshold}
                    onChange={(e) => handleScoreThresholdChange(e.target.value)}
                    className="bg-transparent text-white w-9 focus:outline-none text-center font-semibold text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="--"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rank &le;</span>
                  <input
                    type="number"
                    min="1"
                    max={tabCandidates.length}
                    value={rankThreshold}
                    onChange={(e) => handleRankThresholdChange(e.target.value)}
                    className="bg-transparent text-white w-9 focus:outline-none text-center font-semibold text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="--"
                  />
                </div>
                <button
                  onClick={handleSelectAll}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={handleExportCSV}
                  className="text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-2.5 py-1.5 rounded-lg border border-brand-500/20 cursor-pointer font-semibold transition-all flex items-center gap-1.5"
                  title="Export current ranked candidates to CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 px-2.5 py-1.5 rounded-lg border border-brand-500/20 cursor-pointer"
                  >
                    Deselect
                  </button>
                )}
                {activeTab === 'pending' && pendingCount > 0 && (
                  <button
                    onClick={() => setShowRejectRemainingModal(true)}
                    className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1.5 rounded-lg border border-rose-500/20 cursor-pointer font-semibold transition-all animate-fade-in"
                  >
                    Reject Remaining
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
            <>
              {/* Tabs Navigation */}
              <div className="flex border-b border-white/10 gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all relative cursor-pointer flex items-center ${
                    activeTab === 'pending'
                      ? 'text-brand-400 font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Pending
                  <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold ${activeTab === 'pending' ? 'bg-brand-500/20 text-brand-300' : 'bg-white/5 text-gray-400'}`}>
                    {pendingCount}
                  </span>
                  {activeTab === 'pending' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('shortlisted')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all relative cursor-pointer flex items-center ${
                    activeTab === 'shortlisted'
                      ? 'text-brand-400 font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Shortlisted
                  <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold ${activeTab === 'shortlisted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'}`}>
                    {shortlistedCount}
                  </span>
                  {activeTab === 'shortlisted' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all relative cursor-pointer flex items-center ${
                    activeTab === 'rejected'
                      ? 'text-brand-400 font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Rejected
                  <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold ${activeTab === 'rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-gray-400'}`}>
                    {rejectedCount}
                  </span>
                  {activeTab === 'rejected' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                    />
                  )}
                </button>
              </div>

              {tabCandidates.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 border-dashed border-2 border-white/5 animate-fade-in">
                  <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4 stroke-1" />
                  <p className="text-base font-semibold">
                    {activeTab === 'pending' && "All caught up!"}
                    {activeTab === 'shortlisted' && "No shortlisted candidates yet"}
                    {activeTab === 'rejected' && "No rejected candidates yet"}
                  </p>
                  <p className="text-sm mt-1">
                    {activeTab === 'pending' && "All applicants for this job have been shortlisted or rejected."}
                    {activeTab === 'shortlisted' && "Shortlist candidates from the Pending tab to see them here."}
                    {activeTab === 'rejected' && "Rejected candidates will appear in this tab."}
                  </p>
                </div>
              ) : (
                <motion.div className="space-y-3" layout>
                  <AnimatePresence mode="popLayout">
                    {tabCandidates.map((candidate) => {
                      const overallIdx = sortedCandidates.findIndex(c => c.id === candidate.id);
                      return (
                        <motion.div
                          key={candidate.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 38,
                            mass: 0.8
                          }}
                        >
                          <CandidateRow
                            candidate={candidate}
                            index={overallIdx}
                            isSelected={selectedIds.includes(candidate.id)}
                            onSelectToggle={() => handleSelectToggle(candidate.id)}
                            onSelectCandidate={onSelectCandidate}
                            onRetryAnalysis={onRetryAnalysis}
                            getBadgeStyle={getBadgeStyle}
                            getAppStatusStyle={getAppStatusStyle}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
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
          defaultShortlistMessage={job.default_shortlist_message}
          defaultRejectionMessage={job.default_rejection_message}
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

      {/* Confirmation Modal for Reject Remaining */}
      {showRejectRemainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/10 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-display font-extrabold text-lg text-white">Reject Remaining Candidates?</h3>
              <button 
                onClick={() => setShowRejectRemainingModal(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300 text-sm leading-relaxed">
                Are you sure you want to reject all candidates for <strong className="text-white">"{job.title}"</strong> who have not been shortlisted yet?
              </p>
              <p className="text-rose-400/90 text-xs bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl font-medium leading-relaxed">
                This will reject all {candidates.filter(c => c.application_status !== 'shortlisted' && c.application_status !== 'rejected').length} remaining candidates. Shortlisted candidates will remain untouched.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectRemainingModal(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-semibold text-white transition-all text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const remainingIds = candidates
                    .filter(c => c.application_status !== 'shortlisted' && c.application_status !== 'rejected')
                    .map(c => c.id);
                  if (remainingIds.length > 0) {
                    onBulkReject(remainingIds, job.default_rejection_message || "Thank you for applying. We have decided to proceed with other candidates.");
                  }
                  setShowRejectRemainingModal(false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-rose-500/25 hover:scale-102 text-sm cursor-pointer"
              >
                Confirm Reject Remaining
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
