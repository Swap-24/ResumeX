import React from 'react';
import { Briefcase, Users, Percent } from 'lucide-react';

const EmployerStats = ({ totalJobs, totalApplicants, overallAvgScore }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden">
        <div className="radial-glow absolute inset-0 opacity-50 pointer-events-none" />
        <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Jobs</span>
          <span className="text-2xl font-extrabold text-white mt-0.5 block">{totalJobs}</span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden">
        <div className="radial-glow absolute inset-0 opacity-50 pointer-events-none" />
        <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Candidates</span>
          <span className="text-2xl font-extrabold text-white mt-0.5 block">{totalApplicants}</span>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden">
        <div className="radial-glow absolute inset-0 opacity-50 pointer-events-none" />
        <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
          <Percent className="h-6 w-6" />
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Avg Match Rate</span>
          <span className="text-2xl font-extrabold text-white mt-0.5 block">{overallAvgScore}%</span>
        </div>
      </div>
    </div>
  );
};

export default EmployerStats;
