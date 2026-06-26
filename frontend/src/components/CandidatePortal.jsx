import React, { useState, useEffect } from 'react';
import { Search, FileText, SlidersHorizontal, Briefcase, MapPin, Building2 } from 'lucide-react';
import ApplyForm from './Candidate/ApplyForm';
import LookupForm from './Candidate/LookupForm';
import ApplicationRow from './Candidate/ApplicationRow';
import DotField from './Candidate/DotField';
import BorderGlow from './BorderGlow';
import SearchableDropdown from './Candidate/SearchableDropdown';

const getRemainingTime = (deadlineStr) => {
  if (!deadlineStr) return null;
  try {
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

    const diffTime = target.getTime() - today.getTime();
    if (diffTime < 0) return 'Expired';
    if (diffTime === 0) return 'Deadline today';

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days left`;
  } catch {
    return null;
  }
};

const formatDeadline = (deadlineStr) => {
  try {
    const d = new Date(deadlineStr);
    const formattedDate = isNaN(d.getTime()) ? deadlineStr : d.toLocaleDateString();
    const remaining = getRemainingTime(deadlineStr);
    return remaining ? `${formattedDate} (${remaining})` : formattedDate;
  } catch {
    return deadlineStr;
  }
};

/**
 * CandidatePortal
 *
 * Props:
 *  - jobs: all active job listings
 *  - onApply / fetchApplications / candidateApps / setCandidateApps / isSubmitting: data handlers
 *  - user: { email, display_name } if logged in, null if guest
 *  - isGuest: true if no auth session
 */
const CandidatePortal = ({
  jobs,
  onApply,
  fetchApplications,
  candidateApps,
  setCandidateApps,
  isSubmitting,
  user,
  isGuest,
}) => {
  const [lookupEmail, setLookupEmail] = useState('');
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [activeView, setActiveView] = useState('jobs'); // 'jobs' | 'apply'
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  const [filters, setFilters] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: '',
  });

  // ---- Auth-aware effects ----

  // When a logged-in user arrives, auto-fetch their applications immediately
  useEffect(() => {
    if (user?.email) {
      fetchApplications(user.email);
      setHasLookedUp(true);
    }
  }, [user?.email]);

  // Derive the set of job IDs the user has already applied to
  // so we can filter them out of the listings
  const appliedJobIds = new Set(candidateApps.map((app) => app.job_id));

  // For logged-in candidates: hide jobs they've already applied to
  const visibleJobs = user ? jobs.filter((job) => !appliedJobIds.has(job.id)) : jobs;

  // ---- Filters ----
  const uniqueDepartments = Array.from(new Set(visibleJobs.map((j) => j.department || 'General'))).sort();
  const uniqueLocations = Array.from(new Set(visibleJobs.map((j) => j.location || 'Remote'))).sort();
  const uniqueEmploymentTypes = Array.from(new Set(visibleJobs.map((j) => j.employment_type || 'Full-time'))).sort();

  const filteredJobs = visibleJobs.filter((job) => {
    const matchesTitle = !filters.title || job.title.toLowerCase().includes(filters.title.toLowerCase());
    const matchesDepartment = !filters.department || (job.department || 'General') === filters.department;
    const matchesLocation = !filters.location || (job.location || 'Remote') === filters.location;
    const matchesEmploymentType = !filters.employmentType || (job.employment_type || 'Full-time') === filters.employmentType;
    return matchesTitle && matchesDepartment && matchesLocation && matchesEmploymentType;
  });

  const isAnyFilterActive = filters.title || filters.department || filters.location || filters.employmentType;

  const handleResetFilters = () =>
    setFilters({ title: '', department: '', location: '', employmentType: '' });

  // ---- Apply handler ----
  const handleApply = (jobId, name, email, file, onSuccess) => {
    onApply(jobId, name, email, file, () => {
      onSuccess();
      // Update lookup state
      setLookupEmail(email);
      setHasLookedUp(true);
      // Return to jobs view
      setActiveView('jobs');
      setSelectedJob(null);
      // If logged in, refresh their applications (removes job from listing automatically
      // because appliedJobIds will include this jobId after the next fetch)
      if (user?.email) {
        fetchApplications(user.email);
      } else {
        fetchApplications(email);
      }
    });
  };

  // ---- Guest lookup ----
  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    fetchApplications(lookupEmail);
    setHasLookedUp(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full pt-8 pb-20 px-6 md:px-8 select-none">
      {/* Background DotField */}
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
            {/* Header */}
            <div className="border-b border-white/5 pb-6">
              <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                Job Seeker Portal
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {user
                  ? `Welcome back, ${user.display_name}. Browse open roles and track your applications.`
                  : 'Browse open roles and track your application status in real-time.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left: Job Listings */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="font-display font-bold text-xl text-white">Open Positions</h2>
                  {isAnyFilterActive && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline cursor-pointer self-start sm:self-auto"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {jobs.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border-dashed border-2 border-white/5">
                    No active positions available right now. Please check back later!
                  </div>
                ) : visibleJobs.length === 0 && user ? (
                  // Logged-in candidate has applied to all available jobs
                  <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border-dashed border-2 border-white/5">
                    <FileText className="h-10 w-10 mx-auto text-gray-600 mb-3 stroke-1" />
                    <p className="font-semibold text-sm text-gray-400">You've applied to all available positions!</p>
                    <p className="text-xs text-gray-500 mt-1">Check back later for new openings.</p>
                  </div>
                ) : (
                  <>
                    {/* Filters */}
                    <div className="relative z-20 glass-panel p-4 rounded-2xl border border-white/5 bg-dark-card/30 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-500" />
                        </span>
                        <input
                          type="text"
                          value={filters.title}
                          onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                          placeholder="Search job title..."
                          className="w-full bg-dark-bg/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs transition-all duration-300 focus:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                        />
                      </div>
                      <SearchableDropdown label="Department" options={uniqueDepartments} value={filters.department} onChange={(val) => setFilters({ ...filters, department: val })} placeholder="All Departments" icon={SlidersHorizontal} />
                      <SearchableDropdown label="Location" options={uniqueLocations} value={filters.location} onChange={(val) => setFilters({ ...filters, location: val })} placeholder="All Locations" icon={MapPin} />
                      <SearchableDropdown label="Employment Type" options={uniqueEmploymentTypes} value={filters.employmentType} onChange={(val) => setFilters({ ...filters, employmentType: val })} placeholder="All Employment Types" icon={Briefcase} />
                    </div>

                    {/* Job Cards */}
                    {filteredJobs.length === 0 ? (
                      <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border-dashed border-2 border-white/5">
                        <SlidersHorizontal className="h-10 w-10 mx-auto text-gray-600 mb-3 stroke-1" />
                        <p className="font-semibold text-sm text-gray-400">No positions match your search criteria</p>
                        <button onClick={handleResetFilters} className="mt-3 px-4 py-2 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredJobs.map((job) => {
                          const isExpanded = expandedJobId === job.id;
                          return (
                            <BorderGlow
                              key={job.id}
                              edgeSensitivity={30}
                              glowColor="262 80 60"
                              backgroundColor={isExpanded ? '#161026' : '#151c2c'}
                              borderRadius={16}
                              glowRadius={40}
                              glowIntensity={1.0}
                              coneSpread={25}
                              animated
                              colors={['#c084fc', '#f472b6', '#38bdf8']}
                              scaleOnHover={!isExpanded}
                              className={`w-full transition-all duration-300 overflow-hidden border ${
                                isExpanded
                                  ? 'border-brand-500/40 shadow-[0_0_20px_rgba(139,92,246,0.05)]'
                                  : 'border-white/5 hover:border-white/10'
                              }`}
                            >
                              {/* Header */}
                              <div
                                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                                className="p-5 flex items-center justify-between cursor-pointer select-none"
                              >
                                <div className="space-y-1 min-w-0 flex-1 pr-4">
                                  <h3 className="font-display font-bold text-base md:text-lg text-white transition-colors">
                                    {job.title}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                    <span className="font-semibold text-brand-400">{job.department || 'General'}</span>
                                    <span className="text-gray-600">&bull;</span>
                                    <span>{job.location || 'Remote'}</span>
                                    <span className="text-gray-600">&bull;</span>
                                    <span>{job.employment_type || 'Full-time'}</span>
                                    {/* Company name badge */}
                                    {job.company_name && (
                                      <>
                                        <span className="text-gray-600">&bull;</span>
                                        <span className="flex items-center gap-1 text-gray-300">
                                          <Building2 className="h-3 w-3 text-gray-500" />
                                          {job.company_name}
                                        </span>
                                      </>
                                    )}
                                    {job.application_deadline && (
                                      <>
                                        <span className="text-gray-600">&bull;</span>
                                        <span className="text-rose-400 font-medium">
                                          Deadline: {formatDeadline(job.application_deadline)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-gray-400 select-none flex-shrink-0">
                                  {isExpanded ? (
                                    <span className="text-brand-400 font-bold text-xl">&minus;</span>
                                  ) : (
                                    <span className="text-gray-400 font-bold text-xl">&#43;</span>
                                  )}
                                </div>
                              </div>

                              {/* Expanded body */}
                              <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                  <div className="px-5 pb-5 pt-4 border-t border-white/5 space-y-4">
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
                                          Apply before:{' '}
                                          <strong className="text-gray-300">
                                            {formatDeadline(job.application_deadline)}
                                          </strong>
                                        </span>
                                      )}
                                      <div className="flex items-center gap-3 ml-auto">
                                        <button
                                          onClick={() => {
                                            setSelectedJob(job);
                                            setActiveView('apply');
                                          }}
                                          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/10 transition-all duration-300 hover:scale-102 cursor-pointer"
                                        >
                                          Apply Now &rarr;
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </BorderGlow>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Application Tracker */}
              <div className="space-y-4">
                <h2 className="font-display font-bold text-xl text-white">
                  {user ? 'My Applications' : 'Track Application'}
                </h2>
                <div className="glass-panel p-6 rounded-2xl space-y-6 flex flex-col bg-dark-card/45 border-white/5">
                  {user ? (
                    // Logged-in: just show header, no email form
                    <div>
                      <h3 className="font-display font-bold text-base text-white">Your Applications</h3>
                      <p className="text-gray-400 text-xs mt-1">
                        All applications tied to <span className="text-brand-300">{user.email}</span>
                      </p>
                    </div>
                  ) : (
                    // Guest: show email lookup form
                    <>
                      <div>
                        <h3 className="font-display font-bold text-base text-white">Track Your Status</h3>
                        <p className="text-gray-400 text-xs mt-1">
                          Look up applications you registered using your email address.
                        </p>
                      </div>
                      <LookupForm
                        lookupEmail={lookupEmail}
                        onChangeEmail={setLookupEmail}
                        onLookup={handleLookupSubmit}
                      />
                    </>
                  )}

                  {/* Application list */}
                  <div className="flex-1 space-y-4 min-h-[220px]">
                    {user ? (
                      // Logged-in candidate
                      candidateApps.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                          <FileText className="h-8 w-8 text-gray-600 mb-2 stroke-1" />
                          <p>No applications yet. Apply to a job to get started!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Your Applications ({candidateApps.length})
                          </h4>
                          {candidateApps.map((app) => (
                            <ApplicationRow key={app.id} app={app} />
                          ))}
                        </div>
                      )
                    ) : (
                      // Guest
                      !hasLookedUp ? (
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
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Applications ({candidateApps.length})
                          </h4>
                          {candidateApps.map((app) => (
                            <ApplicationRow key={app.id} app={app} />
                          ))}
                        </div>
                      )
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
              userEmail={user?.email || ''}
              userName={user?.display_name || ''}
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
