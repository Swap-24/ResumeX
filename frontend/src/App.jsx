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

const App = () => {
  // Auth state
  const [session, setSession] = useState(undefined); // undefined = loading, null = guest/logged-out, object = authenticated
  const [userMeta, setUserMeta] = useState(null);    // { role, display_name, email }

  // App navigation state
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateApps, setCandidateApps] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job listing. Please check input values.');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, { headers: authHeaders(session) });
      fetchJobs();
      alert('Job listing deleted successfully.');
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job listing. Please try again.');
    }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    fetchCandidates(job.id);
  };

  const handleBackToDashboard = () => {
    setSelectedJob(null);
    setCandidates([]);
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
    } catch (error) {
      console.error('Error during bulk shortlist:', error);
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
    } catch (error) {
      console.error('Error during bulk reject:', error);
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
      alert('Message sent successfully!');
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
              candidate={selectedCandidate}
              onBack={handleBackToJobDetails}
              onUpdateStatus={handleUpdateStatus}
              onSendMessage={handleSendMessage}
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
            />
          ) : (
            <EmployerDashboard
              jobs={jobs}
              onCreateJob={handleCreateJob}
              onSelectJob={handleSelectJob}
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
    </div>
  );
};

export default App;