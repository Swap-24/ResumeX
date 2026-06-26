import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Briefcase, User, Sparkles, Eye, EyeOff, ArrowRight, Loader2, X } from 'lucide-react';
import Hyperspeed from '../Hyperspeed';
import { hyperspeedPresets } from '../HyperSpeedPresets';

const ROLES = [
  {
    id: 'candidate',
    label: 'Job Seeker',
    description: 'Browse open roles, apply, and track your applications.',
    icon: User,
  },
  {
    id: 'company',
    label: 'Company / Recruiter',
    description: 'Post jobs, review AI-ranked candidates, and make decisions.',
    icon: Briefcase,
  },
];

const AuthPage = ({ onLogin }) => {
  const [authType, setAuthType] = useState(null); // null = landing page, 'candidate' = candidate portal auth, 'company' = employer portal auth
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [role, setRole] = useState('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter your name / company name.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              display_name: displayName.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          // Auto-confirmed (email confirmation disabled in Supabase)
          onLogin(data.session, { role, display_name: displayName.trim(), email });
        } else {
          setSuccessMsg('Account created! Check your email to confirm, then log in.');
          setMode('login');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (data.session) {
          onLogin(data.session, data.user?.user_metadata || {});
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      {/* Hyperspeed background */}
      <div className="absolute inset-x-0 top-0 bottom-0 z-0 -translate-y-8 h-[calc(100%+2rem)]">
        <Hyperspeed effectOptions={hyperspeedPresets.one} />
      </div>

      {/* Center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {authType === null ? (
        /* Landing Page View */
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
              onClick={() => {
                setAuthType('candidate');
                setRole('candidate');
                setError('');
                setSuccessMsg('');
              }}
              className="w-full sm:w-auto group relative px-6 py-3 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-white font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:border-brand-500/80 cursor-pointer flex items-center justify-center gap-2"
            >
              <User className="h-4 w-4 text-brand-300 group-hover:scale-110 transition-transform" />
              <span>Job Seeker Portal</span>
            </button>

            {/* Recruiter Button */}
            <button
              onClick={() => {
                setAuthType('company');
                setRole('company');
                setError('');
                setSuccessMsg('');
              }}
              className="w-full sm:w-auto group relative px-6 py-3 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-white font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:border-brand-500/80 cursor-pointer flex items-center justify-center gap-2"
            >
              <Briefcase className="h-4 w-4 text-brand-300 group-hover:scale-110 transition-transform" />
              <span>Employer Portal</span>
            </button>
          </div>
        </div>
      ) : (
        /* Modal Dialogue Box Overlay */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-md my-8">
            {/* Logo */}
            <div className="text-center mb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-300">
                  {authType === 'candidate' ? 'Job Seeker Portal' : 'Employer Portal'}
                </span>
              </div>
              <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                Resume<span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-secondary bg-clip-text text-transparent">X</span>
              </h1>
              <p className="text-gray-400 text-xs">
                {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>

            {/* Card Content */}
            <div className="relative glass-panel rounded-2xl border border-white/10 p-6 md:p-8 space-y-6 backdrop-blur-xl bg-dark-card/60 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setAuthType(null);
                  setError('');
                  setSuccessMsg('');
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Role Selector (signup only) */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                          role === id
                            ? 'border-brand-500 bg-brand-500/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                            : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-gray-300'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${role === id ? 'text-brand-400' : 'text-gray-500'}`} />
                        <span className="text-[11px] font-semibold leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Display name (signup only) */}
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {role === 'company' ? 'Company Name' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={role === 'company' ? 'Acme Corp' : 'Jane Doe'}
                      className="w-full bg-dark-bg/60 border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none text-sm transition-colors"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-dark-bg/60 border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none text-sm transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-dark-bg/60 border border-white/10 focus:border-brand-500 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none text-sm transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error / success */}
                {error && (
                  <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                    {successMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-brand-500/20 text-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle mode */}
              <div className="text-center text-xs text-gray-500">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                      className="text-brand-400 hover:text-brand-300 font-semibold transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                      className="text-brand-400 hover:text-brand-300 font-semibold transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              {/* Guest access note */}
              {role === 'candidate' && (
                <div className="border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => onLogin(null, { role: 'candidate', display_name: 'Guest', email: '' })}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium rounded-xl border border-white/5 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    Continue as Guest (Job Seeker)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Magic text */}
      <div className="absolute bottom-6 right-6 z-10 text-white/50 text-[10px] uppercase tracking-widest font-mono select-none pointer-events-none animate-pulse-slow">
        click and hold to see magic
      </div>
    </div>
  );
};

export default AuthPage;
