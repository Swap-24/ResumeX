import React from 'react';
import { Briefcase, User } from 'lucide-react';

const Navbar = ({ userMode, setUserMode }) => {
  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5">
      {/* Logo Branding */}
      <div 
        onClick={() => setUserMode('landing')}
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all select-none"
      >
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <span className="font-display font-extrabold text-2xl text-white">R</span>
        </div>
        <div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Resume<span className="bg-gradient-to-r from-brand-500 to-indigo-400 bg-clip-text text-transparent">X</span>
          </span>
          <span className="block text-[10px] text-gray-400 font-medium tracking-widest uppercase">
            AI Screening
          </span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="relative p-1 bg-dark-bg border border-white/5 rounded-xl flex items-center gap-1">
        {/* Background slider pill */}
        {userMode !== 'landing' && (
          <div
            className={`absolute top-1 bottom-1 w-[150px] bg-brand-600 rounded-lg transition-all duration-300 ease-out shadow-lg shadow-brand-500/25 ${userMode === 'candidate' ? 'left-[158px]' : 'left-1'
              }`}
          />
        )}

        {/* Employer Tab */}
        <button
          onClick={() => setUserMode('employer')}
          className={`relative z-10 w-[150px] py-2 flex items-center justify-center gap-2 font-display text-sm font-semibold rounded-lg transition-colors duration-300 ${userMode === 'employer' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
        >
          <Briefcase className="h-4 w-4" />
          Employer Portal
        </button>

        {/* Candidate Tab */}
        <button
          onClick={() => setUserMode('candidate')}
          className={`relative z-10 w-[150px] py-2 flex items-center justify-center gap-2 font-display text-sm font-semibold rounded-lg transition-colors duration-300 ${userMode === 'candidate' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
        >
          <User className="h-4 w-4" />
          Job Seeker
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
