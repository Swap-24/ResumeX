import React from 'react';
import { Briefcase, User, Sparkles } from 'lucide-react';
import Hyperspeed from './Hyperspeed';
import { hyperspeedPresets } from './HyperSpeedPresets';

const LandingPage = ({ onSelectMode }) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background warp-tunnel animation */}
      <div className="absolute inset-x-0 top-0 bottom-0 z-0 -translate-y-8 h-[calc(100%+2rem)]">
        <Hyperspeed effectOptions={hyperspeedPresets.one} />
      </div>

      {/* Decorative center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Content Container */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2 animate-pulse">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-300">Next-Gen Resume Intelligence</span>
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl text-white tracking-tight leading-[1.1] max-w-2xl mx-auto">
            Matching Talent with <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-secondary bg-clip-text text-transparent">Precision</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Match, evaluate, and profile resumes instantly with our AI-driven scoring engine.
          </p>
        </div>

        {/* Choice Grid */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          {/* Candidate Button */}
          <button
            onClick={() => onSelectMode('candidate')}
            className="w-full sm:w-auto group relative px-6 py-3 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-white font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:border-brand-500/80 cursor-pointer flex items-center justify-center gap-2"
          >
            <User className="h-4 w-4 text-brand-300 group-hover:scale-110 transition-transform" />
            <span>Job Seeker Portal</span>
          </button>

          {/* Recruiter Button */}
          <button
            onClick={() => onSelectMode('employer')}
            className="w-full sm:w-auto group relative px-6 py-3 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-white font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:border-brand-500/80 cursor-pointer flex items-center justify-center gap-2"
          >
            <Briefcase className="h-4 w-4 text-brand-300 group-hover:scale-110 transition-transform" />
            <span>Employer Portal</span>
          </button>
        </div>
      </div>

      {/* Magic instruction text at the bottom right */}
      <div className="absolute bottom-6 right-6 z-10 text-white/50 text-[10px] uppercase tracking-widest font-mono select-none pointer-events-none animate-pulse-slow">
        click and hold to see magic
      </div>
    </div>
  );
};

export default LandingPage;
