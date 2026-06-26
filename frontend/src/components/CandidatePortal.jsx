import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import ApplyForm from './Candidate/ApplyForm';
import LookupForm from './Candidate/LookupForm';
import ApplicationRow from './Candidate/ApplicationRow';
import DotField from './Candidate/DotField';

const CandidatePortal = ({ jobs, onApply, fetchApplications, candidateApps, isSubmitting }) => {
  const [lookupEmail, setLookupEmail] = useState('');
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [activeView, setActiveView] = useState('jobs'); // 'jobs' | 'apply'
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  const handleApply = (jobId, name, email, file, onSuccess) => {
    onApply(jobId, name, email, file, () => {
      onSuccess();
      setLookupEmail(email);
      fetchApplications(email);
      setHasLookedUp(true);
      setActiveView('jobs');
      setSelectedJob(null);
    });
  };

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    fetchApplications(lookupEmail);
    setHasLookedUp(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full py-8 px-6 md:px-8 select-none">
      {/* Background Interactive DotField Canvas */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {activeView === 'jobs' ? (
          <>
            {/* Title Header */}
            <div className="border-b border-white/5 pb-6">
              <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Job Seeker Portal</h1>
              <p className="text-gray-400 text-sm mt-1">Browse open roles and track your application status in real-time.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Job Listings List */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="font-display font-bold text-xl text-white">Open Positions</h2>
                {jobs.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border-dashed border-2 border-white/5">
                    No active positions available right now. Please check back later!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => {
                      const isExpanded = expandedJobId === job.id;
                      return (
                        <div
                          key={job.id}
                          className={`glass-panel rounded-2xl border transition-all duration-300 overflow-hidden ${
                            isExpanded 
                              ? 'border-brand-500/40 bg-brand-500/[0.02] shadow-[0_0_20px_rgba(139,92,246,0.05)]' 
                              : 'border-white/5 bg-dark-card/45 hover:border-white/10 hover:bg-dark-card/60'
                          }`}
                        >
                          {/* Clickable Header Bar */}
                          <div
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="p-5 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="space-y-1">
                              <h3 className="font-display font-bold text-base md:text-lg text-white transition-colors">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                <span className="font-semibold text-brand-400">{job.department || 'General'}</span>
                                <span className="text-gray-600">&bull;</span>
                                <span>{job.location || 'Remote'}</span>
                                <span className="text-gray-600">&bull;</span>
                                <span>{job.employment_type || 'Full-time'}</span>
                                {job.application_deadline && (
                                  <>
                                    <span className="text-gray-600">&bull;</span>
                                    <span className="text-rose-400 font-medium">
                                      Deadline: {(() => {
                                        try {
                                          const d = new Date(job.application_deadline);
                                          return isNaN(d.getTime()) ? job.application_deadline : d.toLocaleDateString();
                                        } catch (err) {
                                          return job.application_deadline;
                                        }
                                      })()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-400 select-none">
                              {isExpanded ? (
                                <span className="text-brand-400 font-bold text-xl">&minus;</span>
                              ) : (
                                <span className="text-gray-400 font-bold text-xl">&#43;</span>
                              )}
                            </div>
                          </div>

                          {/* Expanded Body Content */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4 animate-slide-down">
                              {job.description && (
                                <div className="space-y-1">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Description</h4>
                                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
                                </div>
                              )}
                              
                              {job.requirements && (
                                <div className="space-y-1">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Key Requirements</h4>
                                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{job.requirements}</p>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-3">
                                {job.application_deadline && (
                                  <span className="text-xs text-gray-400">
                                    Apply before: <strong className="text-gray-300">{(() => {
                                      try {
                                        const d = new Date(job.application_deadline);
                                        return isNaN(d.getTime()) ? job.application_deadline : d.toLocaleDateString();
                                      } catch (err) {
                                        return job.application_deadline;
                                      }
                                    })()}</strong>
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setActiveView('apply');
                                  }}
                                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/10 transition-all duration-300 hover:scale-102 cursor-pointer ml-auto"
                                >
                                  Apply Now &rarr;
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Application Status Tracker */}
              <div className="space-y-4">
                <h2 className="font-display font-bold text-xl text-white">Track Application</h2>
                <div className="glass-panel p-6 rounded-2xl space-y-6 flex flex-col bg-dark-card/45 border-white/5">
                  <div>
                    <h3 className="font-display font-bold text-base text-white">Track Your Status</h3>
                    <p className="text-gray-400 text-xs mt-1">Look up applications you registered using your email address.</p>
                  </div>

                  <LookupForm
                    lookupEmail={lookupEmail}
                    onChangeEmail={setLookupEmail}
                    onLookup={handleLookupSubmit}
                  />

                  {/* Registration List */}
                  <div className="flex-1 space-y-4 min-h-[220px]">
                    {!hasLookedUp ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                        <Search className="h-8 w-8 text-gray-600 mb-2 stroke-1" />
                        <p>Enter your email above to fetch active job applications.</p>
                      </div>
                    ) : candidateApps.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                        <FileText className="h-8 w-8 text-gray-600 mb-2 stroke-1" />
                        <p>No active registrations found for this email.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Applications ({candidateApps.length})</h4>
                        {candidateApps.map((app) => (
                          <ApplicationRow key={app.id} app={app} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-4">
            <ApplyForm
              selectedJob={selectedJob}
              onApply={handleApply}
              isSubmitting={isSubmitting}
              onCancel={() => {
                setSelectedJob(null);
                setActiveView('jobs');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePortal;
