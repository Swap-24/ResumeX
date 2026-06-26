import React from 'react';
import { Briefcase, User, LogOut } from 'lucide-react';

const Navbar = ({ role, displayName, isGuest, onLogout }) => {
  const isCompany = role === 'company';

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5">
      {/* Logo Branding */}
      <div className="flex items-center gap-2 select-none">
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

      {/* Right side: role badge + user info + logout */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
          isCompany
            ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
            : 'bg-white/5 border-white/10 text-gray-400'
        }`}>
          {isCompany ? <Briefcase className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
          {isCompany ? 'Employer' : isGuest ? 'Guest' : 'Job Seeker'}
        </div>

        {/* Display name */}
        {displayName && !isGuest && (
          <span className="hidden md:block text-sm text-gray-300 font-medium max-w-[160px] truncate">
            {displayName}
          </span>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          title={isGuest ? 'Back to login' : 'Sign out'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-gray-400 hover:text-rose-400 transition-all duration-200 text-xs font-medium cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isGuest ? 'Login' : 'Sign out'}</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
