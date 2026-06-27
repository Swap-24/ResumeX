import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EmployerDashboard from './components/EmployerDashboard';
import JobDetails from './components/JobDetails';
import ResumeAnalysis from './components/ResumeAnalysis';
import CandidatePortal from './components/CandidatePortal';
import AuthPage from './components/Auth/AuthPage';
import { supabase } from './lib/supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

// Helper — returns axios headers with JWT if session exists
const authHeaders = (session) =>
  session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

const DEFAULT_WEIGHTS = {
  work_experience: 0.20,
  projects: 0.20,
  skills: 0.15,
  education: 0.08,
  certifications: 0.05,
  resume_quality: 0.05,
  trajectory: 0.10,
  impact_quality: 0.09,
  inferred_intent: 0.05,
  overall_fit: 0.03,
};

const getMappedWeight = (key, val) => {
  const percent = val / 100;
  switch (key) {
    case 'work_experience': return 0.02 + (percent * 0.48);
    case 'projects':        return 0.02 + (percent * 0.48);
    case 'skills':          return 0.02 + (percent * 0.38);
    case 'education':       return 0.01 + (percent * 0.24);
    case 'certifications':  return 0.01 + (percent * 0.19);
    default:                return DEFAULT_WEIGHTS[key] || 0.05;
  }
};

const calculateDynamicScore = (candidate, slidersState) => {
  if (!candidate || candidate.status !== 'done') return 0;
  const sections = candidate.resume_sections || candidate.sections || [];
  if (!sections.length) return candidate.overall_score || 0;
  
  let totalWeightedScore = 0;
  let totalWeight = 0;

  sections.forEach(sec => {
    const key = sec.section_key;
    const score = sec.score || 0;
    const weight = slidersState[key] !== undefined 
      ? getMappedWeight(key, slidersState[key])
      : (DEFAULT_WEIGHTS[key] || 0.05);

    totalWeightedScore += score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
};

const App = () => {
  // Auth state
  const [session, setSession] = useState(undefined); // undefined = loading, null = guest/logged-out, object = authenticated
  const [userMeta, setUserMeta] = useState(null);    // { role, display_name, email }

  // Weight sliders state
  const [sliders, setSliders] = useState({
    work_experience: 50,
    projects: 50,
    skills: 50,
    education: 50,
    certifications: 50,
  });

  // App navigation state
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateApps, setCandidateApps] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null); // { message, type } ('success' | 'error' | 'info')

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // ----- Auth bootstrap -----
  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession) {
        const meta = existingSession.user?.user_metadata || {};
        setSession(existingSession);
        setUserMeta({
          role: meta.role || 'candidate',
          display_name: meta.display_name || existingSession.user?.email || '',
          email: existingSession.user?.email || '',
        });
      } else {
        setSession(null); // not logged in
      }
    });

    // Listen for auth changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        const meta = newSession.user?.user_metadata || {};
        setSession(newSession);
        setUserMeta({
          role: meta.role || 'candidate',
          display_name: meta.display_name || newSession.user?.email || '',
          email: newSession.user?.email || '',
        });
      } else {
        setSession(null);
        setUserMeta(null);
        setJobs([]);
        setSelectedJob(null);
        setCandidates([]);
        setSelectedCandidate(null);
        setCandidateApps([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ----- Jobs -----
  const fetchJobs = async (shouldRefreshSelected = true) => {
    try {
      const currentSession = (await supabase.auth.getSession()).data.session;
      const currentMeta = currentSession?.user?.user_metadata || {};
      const role = currentMeta.role || userMeta?.role;

      let url = `${API_BASE_URL}/jobs/`;
      const headers = authHeaders(currentSession);

      // Companies always fetch only their own jobs
      if (role === 'company') {
        url += '?mine=true';
      }

      const response = await axios.get(url, { headers });
      setJobs(response.data || []);

      if (shouldRefreshSelected && selectedJob) {
        const updatedJob = (response.data || []).find(j => j.id === selectedJob.id);
        if (updatedJob) setSelectedJob(updatedJob);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  useEffect(() => {
    // Only fetch jobs once auth is resolved (session is not undefined)
    if (session !== undefined && userMeta) {
      fetchJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userMeta?.role]);

  // Log analysis failures to browser console for debugging
  useEffect(() => {
    candidates.forEach((c) => {
      if (c.status === 'failed' && c.overall_summary) {
        console.error(
          `[ResumeX Error] Analysis failed for candidate "${c.candidate_name}" (${c.candidate_email}). Reason:`,
          c.overall_summary
        );
      }
    });
  }, [candidates]);

  // ----- Candidate auto-polling -----
  useEffect(() => {
    const hasAnalyzing = candidates.some(c => c.status === 'analyzing');
    if (!selectedJob || !hasAnalyzing) return;
    const timer = setInterval(() => fetchCandidates(selectedJob.id, false), 4000);
    return () => clearInterval(timer);
  }, [candidates, selectedJob]);

  // ----- Candidates -----
  const fetchCandidates = async (jobId, shouldRefreshSelected = true) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/resumes`, {
        headers: authHeaders(session),
      });
      setCandidates(response.data || []);
      if (shouldRefreshSelected && selectedCandidate) {
        const updated = (response.data || []).find(c => c.id === selectedCandidate.id);
        if (updated) {
          const detailRes = await axios.get(`${API_BASE_URL}/resumes/${selectedCandidate.id}`, {
            headers: authHeaders(session),
          });
          setSelectedCandidate(detailRes.data);
        }
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  // ----- Employer handlers -----
  const handleCreateJob = async (jobData) => {
    try {
      const payload = { ...jobData, application_deadline: jobData.application_deadline || null };
      await axios.post(`${API_BASE_URL}/jobs/`, payload, { headers: authHeaders(session) });
      fetchJobs();
      showToast('Job listing created successfully!', 'success');
    } catch (error) {
      console.error('Error creating job:', error);
      showToast('Failed to create job listing. Please check inputs.', 'error');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, { headers: authHeaders(session) });
      fetchJobs();
      showToast('Job listing deleted successfully.', 'info');
    } catch (error) {
      console.error('Error deleting job:', error);
      showToast('Failed to delete job listing.', 'error');
    }
  };

  const handleUpdateJob = async (jobId, updatedFields) => {
    try {
      const existingJob = jobs.find((j) => j.id === jobId);
      if (!existingJob) return;

      const payload = {
        title: existingJob.title,
        description: existingJob.description,
        requirements: existingJob.requirements,
        location: existingJob.location,
        employment_type: existingJob.employment_type,
        department: existingJob.department,
        application_deadline: existingJob.application_deadline,
        default_shortlist_message: existingJob.default_shortlist_message,
        default_rejection_message: existingJob.default_rejection_message,
        ...updatedFields,
      };

      const response = await axios.put(`${API_BASE_URL}/jobs/${jobId}`, payload, {
        headers: authHeaders(session),
      });

      // Update local state
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, ...response.data } : j))
      );
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev) => ({ ...prev, ...response.data }));
      }
      showToast('Default templates updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating job:', error);
      showToast('Failed to update templates.', 'error');
    }
  };

  const handleRetryAnalysis = async (candidateId) => {
    try {
      await axios.post(`${API_BASE_URL}/resumes/${candidateId}/retry`, {}, {
        headers: authHeaders(session),
      });
      showToast('Resume analysis retry scheduled!', 'success');
      if (selectedJob) {
        fetchCandidates(selectedJob.id, false);
      }
    } catch (error) {
      console.error('Error retrying resume analysis:', error);
      showToast('Failed to schedule analysis retry.', 'error');
    }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setSliders({
      work_experience: 50,
      projects: 50,
      skills: 50,
      education: 50,
      certifications: 50,
    });
    fetchCandidates(job.id);
  };

  const handleBackToDashboard = () => {
    setSelectedJob(null);
    setCandidates([]);
    setSliders({
      work_experience: 50,
      projects: 50,
      skills: 50,
      education: 50,
      certifications: 50,
    });
    fetchJobs(false);
  };

  const handleSelectCandidate = async (candidate) => {
    try {
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidate.id}`, {
        headers: authHeaders(session),
      });
      setSelectedCandidate(detailRes.data);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
    }
  };

  const handleBackToJobDetails = () => {
    setSelectedCandidate(null);
    if (selectedJob) fetchCandidates(selectedJob.id, false);
  };

  const handleBulkShortlist = async (resumeIds, message) => {
    try {
      await axios.post(
        `${API_BASE_URL}/resumes/bulk-shortlist`,
        { resume_ids: resumeIds, message: message || null },
        { headers: authHeaders(session) }
      );
      if (selectedJob) fetchCandidates(selectedJob.id);
      fetchJobs();
      showToast(`${resumeIds.length > 1 ? 'Candidates' : 'Candidate'} shortlisted successfully!`, 'success');
    } catch (error) {
      console.error('Error during bulk shortlist:', error);
      showToast('Failed to shortlist candidates.', 'error');
    }
  };

  const handleBulkReject = async (resumeIds, message) => {
    try {
      await axios.post(
        `${API_BASE_URL}/resumes/bulk-reject`,
        { resume_ids: resumeIds, message: message || null },
        { headers: authHeaders(session) }
      );
      if (selectedJob) fetchCandidates(selectedJob.id);
      fetchJobs();
      showToast(`${resumeIds.length > 1 ? 'Candidates' : 'Candidate'} rejected successfully!`, 'info');
    } catch (error) {
      console.error('Error during bulk reject:', error);
      showToast('Failed to reject candidates.', 'error');
    }
  };

  const handleUpdateStatus = async (candidateId, status, message) => {
    try {
      if (status === 'shortlisted') await handleBulkShortlist([candidateId], message);
      else if (status === 'rejected') await handleBulkReject([candidateId], message);
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidateId}`, {
        headers: authHeaders(session),
      });
      setSelectedCandidate(detailRes.data);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSendMessage = async (candidateId, message) => {
    try {
      await axios.post(
        `${API_BASE_URL}/resumes/${candidateId}/message`,
        { message },
        { headers: authHeaders(session) }
      );
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidateId}`, {
        headers: authHeaders(session),
      });
      setSelectedCandidate(detailRes.data);
      showToast('Message sent successfully!', 'success');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // ----- Candidate portal handlers -----
  const handleApply = async (jobId, name, email, file, callback) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('candidate_name', name);
      formData.append('candidate_email', email);
      formData.append('file', file);

      await axios.post(`${API_BASE_URL}/jobs/${jobId}/resumes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Application submitted! Your resume is being processed and ranked in the background.');
      if (callback) callback();
      // Refresh applications if we know the email
      if (email) fetchApplications(email);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Make sure the file is a PDF and valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchApplications = async (email) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/candidates/${email}/applications`);
      setCandidateApps(response.data || []);
    } catch (error) {
      console.error('Error fetching candidate applications:', error);
    }
  };

  // ----- Auth handlers -----
  const handleLogin = (newSession, meta) => {
    if (newSession) {
      // Real authenticated session
      setSession(newSession);
      setUserMeta({
        role: meta?.role || 'candidate',
        display_name: meta?.display_name || meta?.email || '',
        email: meta?.email || newSession.user?.email || '',
      });
    } else {
      // Guest mode
      setSession(null);
      setUserMeta({ role: 'candidate', display_name: 'Guest', email: '' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserMeta(null);
  };

  // ----- Render -----

  // Still checking session on mount
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated and not in guest mode
  if (session === null && !userMeta) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const role = userMeta?.role || 'candidate';
  const isCompany = role === 'company';
  const isGuest = !session && userMeta?.role === 'candidate';

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col font-sans">
      <Navbar
        role={role}
        displayName={userMeta?.display_name || ''}
        isGuest={isGuest}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full">
        {isCompany ? (
          selectedCandidate ? (
            <ResumeAnalysis
              candidate={selectedCandidate ? {
                ...selectedCandidate,
                overall_score: calculateDynamicScore(selectedCandidate, sliders)
              } : null}
              onBack={handleBackToJobDetails}
              onUpdateStatus={handleUpdateStatus}
              onSendMessage={handleSendMessage}
              defaultShortlistMessage={selectedJob?.default_shortlist_message}
              defaultRejectionMessage={selectedJob?.default_rejection_message}
            />
          ) : selectedJob ? (
            <JobDetails
              job={selectedJob}
              candidates={candidates}
              onBack={handleBackToDashboard}
              onSelectCandidate={handleSelectCandidate}
              onBulkShortlist={handleBulkShortlist}
              onBulkReject={handleBulkReject}
              onDeleteJob={handleDeleteJob}
              onUpdateJob={handleUpdateJob}
              onRetryAnalysis={handleRetryAnalysis}
              sliders={sliders}
              setSliders={setSliders}
              calculateDynamicScore={calculateDynamicScore}
            />
          ) : (
            <EmployerDashboard
              jobs={jobs}
              onCreateJob={handleCreateJob}
              onSelectJob={handleSelectJob}
              session={session}
            />
          )
        ) : (
          <CandidatePortal
            jobs={jobs}
            onApply={handleApply}
            fetchApplications={fetchApplications}
            candidateApps={candidateApps}
            setCandidateApps={setCandidateApps}
            isSubmitting={isSubmitting}
            user={session ? { email: userMeta?.email, display_name: userMeta?.display_name } : null}
            isGuest={isGuest}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-in select-none">
          <div className={`glass-panel px-5 py-3.5 rounded-xl border flex items-center gap-3 shadow-2xl backdrop-blur-md ${
            toast.type === 'error' 
              ? 'border-rose-500/25 bg-rose-500/10 text-rose-300 shadow-rose-500/5' 
              : toast.type === 'info' 
              ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-300 shadow-indigo-500/5'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/5'
          }`}>
            <span className="h-2 w-2 rounded-full animate-pulse bg-current" />
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;