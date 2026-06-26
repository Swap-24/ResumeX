import React, { useState, useRef, useEffect } from 'react';
import { Search, FileText, SlidersHorizontal, Briefcase, MapPin } from 'lucide-react';
import ApplyForm from './Candidate/ApplyForm';
import LookupForm from './Candidate/LookupForm';
import ApplicationRow from './Candidate/ApplicationRow';
import DotField from './Candidate/DotField';
import BorderGlow from './BorderGlow';

const getRemainingTime = (deadlineStr) => {
  if (!deadlineStr) return null;
  try {
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    
    const diffTime = target.getTime() - today.getTime();
    if (diffTime < 0) {
      return "Expired";
    }
    if (diffTime === 0) {
      return "Deadline today";
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return "Tomorrow";
    }
    return `${diffDays} days left`;
  } catch (err) {
    return null;
  }
};

const SearchableDropdown = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`w-full bg-dark-bg/40 border rounded-xl pl-9 pr-8 py-2 text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer select-none ${
          isOpen 
            ? 'border-brand-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] text-white' 
            : 'border-white/10 text-gray-300 hover:border-brand-500/50 hover:bg-brand-500/[0.02]'
        }`}
      >
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {Icon && <Icon className={`h-4 w-4 transition-colors duration-300 ${isOpen ? 'text-brand-400' : 'text-gray-500'}`} />}
        </span>
        <span className="truncate">
          {value || placeholder}
        </span>
        <span className={`text-[10px] text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-400' : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full glass-panel border border-brand-500/30 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(139,92,246,0.1)] overflow-hidden bg-dark-card/95 backdrop-blur-md animate-fade-in">
          <div className="p-2 border-b border-white/5 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-500" />
            </span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full bg-dark-bg/60 border border-white/10 focus:border-brand-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-500/20 scrollbar-track-transparent">
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-xs cursor-pointer select-none transition-all ${
                !value 
                  ? 'bg-brand-500/20 text-brand-400 font-bold border-l-2 border-brand-500' 
                  : 'text-gray-300 hover:bg-brand-500/10 hover:text-white'
              }`}
            >
              All {label}s
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500 italic text-center">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer select-none transition-all truncate ${
                    value === opt 
                      ? 'bg-brand-500/20 text-brand-400 font-bold border-l-2 border-brand-500' 
                      : 'text-gray-300 hover:bg-brand-500/10 hover:text-white'
                  }`}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CandidatePortal = ({ jobs, onApply, fetchApplications, candidateApps, isSubmitting }) => {
  const [lookupEmail, setLookupEmail] = useState('');
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [activeView, setActiveView] = useState('jobs'); // 'jobs' | 'apply'
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  const [filters, setFilters] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: ''
  });

  // Extract unique departments, locations, and employment types for dynamic filtering
  const uniqueDepartments = Array.from(new Set(jobs.map(j => j.department || 'General'))).sort();
  const uniqueLocations = Array.from(new Set(jobs.map(j => j.location || 'Remote'))).sort();
  const uniqueEmploymentTypes = Array.from(new Set(jobs.map(j => j.employment_type || 'Full-time'))).sort();

  // Filter positions based on filters state
  const filteredJobs = jobs.filter(job => {
    const matchesTitle = !filters.title || job.title.toLowerCase().includes(filters.title.toLowerCase());
    const matchesDepartment = !filters.department || (job.department || 'General') === filters.department;
    const matchesLocation = !filters.location || (job.location || 'Remote') === filters.location;
    const matchesEmploymentType = !filters.employmentType || (job.employment_type || 'Full-time') === filters.employmentType;
    return matchesTitle && matchesDepartment && matchesLocation && matchesEmploymentType;
  });

  const isAnyFilterActive = filters.title || filters.department || filters.location || filters.employmentType;

  const handleResetFilters = () => {
    setFilters({
      title: '',
      department: '',
      location: '',
      employmentType: ''
    });
  };

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
    <div className="relative min-h-[calc(100vh-80px)] w-full pt-8 pb-20 px-6 md:px-8 select-none">
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
                ) : (
                  <>
                    {/* Filters Control Panel */}
                    <div className="relative z-20 glass-panel p-4 rounded-2xl border border-white/5 bg-dark-card/30 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      {/* Job Title Filter */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-500" />
                        </span>
                        <input
                          type="text"
                          value={filters.title}
                          onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                          placeholder="Search job title..."
                          className="w-full bg-dark-bg/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs transition-all duration-300 focus:shadow-[0_0_12px_rgba(139,92,246,0.3)] focus:border-brand-500"
                        />
                      </div>

                      {/* Department Filter */}
                      <SearchableDropdown
                        label="Department"
                        options={uniqueDepartments}
                        value={filters.department}
                        onChange={(val) => setFilters({ ...filters, department: val })}
                        placeholder="All Departments"
                        icon={SlidersHorizontal}
                      />

                      {/* Location Filter */}
                      <SearchableDropdown
                        label="Location"
                        options={uniqueLocations}
                        value={filters.location}
                        onChange={(val) => setFilters({ ...filters, location: val })}
                        placeholder="All Locations"
                        icon={MapPin}
                      />

                      {/* Employment Type Filter */}
                      <SearchableDropdown
                        label="Employment Type"
                        options={uniqueEmploymentTypes}
                        value={filters.employmentType}
                        onChange={(val) => setFilters({ ...filters, employmentType: val })}
                        placeholder="All Employment Types"
                        icon={Briefcase}
                      />
                    </div>

                    {/* Positions List */}
                    {filteredJobs.length === 0 ? (
                      <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border-dashed border-2 border-white/5">
                        <SlidersHorizontal className="h-10 w-10 mx-auto text-gray-600 mb-3 stroke-1" />
                        <p className="font-semibold text-sm text-gray-400">No positions match your search criteria</p>
                        <button
                          onClick={handleResetFilters}
                          className="mt-3 px-4 py-2 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
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
                          backgroundColor={isExpanded ? "#161026" : "#151c2c"}
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
                                          const formattedDate = isNaN(d.getTime()) ? job.application_deadline : d.toLocaleDateString();
                                          const remaining = getRemainingTime(job.application_deadline);
                                          return remaining ? `${formattedDate} (${remaining})` : formattedDate;
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
                                      Apply before: <strong className="text-gray-300">{(() => {
                                        try {
                                          const d = new Date(job.application_deadline);
                                          const formattedDate = isNaN(d.getTime()) ? job.application_deadline : d.toLocaleDateString();
                                          const remaining = getRemainingTime(job.application_deadline);
                                          return remaining ? `${formattedDate} (${remaining})` : formattedDate;
                                        } catch (err) {
                                          return job.application_deadline;
                                        }
                                      })()}</strong>
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
