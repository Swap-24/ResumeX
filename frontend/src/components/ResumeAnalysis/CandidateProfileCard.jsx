import React from 'react';
import { User, Mail, Download } from 'lucide-react';

const CandidateProfileCard = ({ candidate, scoreInfo }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none radial-glow" />

      {/* Profile Summary */}
      <div className="text-center space-y-3 relative z-10">
        <div className="h-16 w-16 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 mx-auto border border-brand-500/20 shadow-lg">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-xl text-white tracking-tight">
            {candidate.candidate_name}
          </h2>
          <span className="text-xs text-gray-400 flex items-center gap-1.5 justify-center mt-1">
            <Mail className="h-3.5 w-3.5" />
            {candidate.candidate_email}
          </span>
        </div>
        
        {/* Overall Score Speedometer Meter */}
        <div className="py-4 relative flex flex-col items-center justify-center">
          <svg className="w-48 h-28" viewBox="0 0 160 100">
            <defs>
              <linearGradient id="speedometer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="needle-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5"/>
              </filter>
            </defs>
            {/* Background Arch Track */}
            <path
              d="M 15 90 A 65 65 0 0 1 145 90"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Colored Arch Track */}
            <path
              d="M 15 90 A 65 65 0 0 1 145 90"
              fill="none"
              stroke="url(#speedometer-gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="204.2"
              strokeDashoffset={204.2 * (1 - (candidate.overall_score || 0) / 100)}
              className="transition-all duration-1000 ease-out"
            />
            {/* Needle */}
            <line
              x1="80"
              y1="90"
              x2={80 + 52 * Math.cos(Math.PI + ((candidate.overall_score || 0) / 100) * Math.PI)}
              y2={90 + 52 * Math.sin(Math.PI + ((candidate.overall_score || 0) / 100) * Math.PI)}
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#needle-shadow)"
              className="transition-all duration-1000 ease-out origin-[80px_90px]"
            />
            {/* Center Cap Pin */}
            <circle cx="80" cy="90" r="7" fill="#ffffff" />
            <circle cx="80" cy="90" r="3.5" fill="#121622" />
          </svg>
          <div className="text-center mt-2">
            <span className="text-2xl font-extrabold text-white block">
              {candidate.overall_score}%
            </span>
            <span className={`inline-block text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 mt-1 rounded border ${scoreInfo.style}`}>
              {scoreInfo.text}
            </span>
          </div>
        </div>

        {/* Status & Download Resume */}
        <div className="flex flex-col gap-2 pt-2">
          <span className="text-xs font-semibold text-gray-400">
            Current Status: <span className="text-white capitalize">{candidate.application_status}</span>
          </span>
          <a
            href={`http://localhost:8000/resumes/${candidate.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/5 hover:bg-brand-500/10 px-4 py-2.5 rounded-xl border border-brand-500/10 hover:border-brand-500/20 transition-all font-semibold cursor-pointer w-full"
          >
            <Download className="h-4 w-4" />
            Download PDF Resume
          </a>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileCard;
