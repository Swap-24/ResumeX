import React, { useState } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import EmployerStats from './Employer/EmployerStats';
import JobCard from './Employer/JobCard';
import CreateJobModal from './Employer/CreateJobModal';

const EmployerDashboard = ({ jobs, onCreateJob, onSelectJob, session }) => {
  const [showModal, setShowModal] = useState(false);

  // Compute stats
  const totalJobs = jobs.length;
  const totalApplicants = jobs.reduce((acc, job) => acc + (job.applicant_count || 0), 0);
  const overallAvgScore = totalJobs > 0 
    ? (jobs.reduce((acc, job) => acc + (job.average_score || 0), 0) / totalJobs).toFixed(1)
    : '0.0';

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/5' };
    if (score >= 50) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' };
    return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'shadow-rose-500/5' };
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Recruiter Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage jobs, track candidate matches, and review AI assessments.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-brand-500/20 hover:scale-102 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Create Job Posting
        </button>
      </div>

      {/* Stats Summary Cards */}
      <EmployerStats 
        totalJobs={totalJobs} 
        totalApplicants={totalApplicants} 
        overallAvgScore={overallAvgScore} 
      />

      {/* Listings Grid */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-xl text-white">Active Job Listings</h2>
        {jobs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-gray-400 border-dashed border-2 border-white/5">
            <Briefcase className="h-12 w-12 mx-auto text-gray-500 mb-4 stroke-1" />
            <p className="text-base font-semibold">No jobs posted yet</p>
            <p className="text-sm mt-1">Create your first job posting above to start receiving candidates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onSelect={() => onSelectJob(job)} 
                getScoreColor={getScoreColor} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showModal && (
        <CreateJobModal 
          onClose={() => setShowModal(false)} 
          onSubmit={onCreateJob} 
          session={session}
        />
      )}
    </div>
  );
};

export default EmployerDashboard;
