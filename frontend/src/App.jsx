import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import EmployerDashboard from './components/EmployerDashboard';
import JobDetails from './components/JobDetails';
import ResumeAnalysis from './components/ResumeAnalysis';
import CandidatePortal from './components/CandidatePortal';
import LandingPage from './components/LandingPage';

const API_BASE_URL = 'http://localhost:8000';

const App = () => {
  const [userMode, setUserMode] = useState('landing'); // 'landing' | 'employer' | 'candidate'
  const [jobs, setJobs] = useState([]);
  
  // Employer view navigation state
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Candidate portal lookup state
  const [candidateApps, setCandidateApps] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load/refresh jobs when the page mounts or user mode changes
  useEffect(() => {
    fetchJobs();
  }, [userMode]);

  // Fetch all jobs
  const fetchJobs = async (shouldRefreshSelected = true) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/`);
      setJobs(response.data || []);
      
      // Update selected job in state if it's active
      if (shouldRefreshSelected && selectedJob) {
        const updatedJob = response.data.find(j => j.id === selectedJob.id);
        if (updatedJob) setSelectedJob(updatedJob);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  // Auto-poll every 4s while any candidates are still analyzing
  useEffect(() => {
    const hasAnalyzing = candidates.some(c => c.status === 'analyzing');
    if (!selectedJob || !hasAnalyzing) return;

    const timer = setInterval(() => {
      fetchCandidates(selectedJob.id, false);
    }, 4000);

    return () => clearInterval(timer);
  }, [candidates, selectedJob]);

  // Fetch candidates for a specific job
  const fetchCandidates = async (jobId, shouldRefreshSelected = true) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}/resumes`);
      setCandidates(response.data || []);
      
      // Update selected candidate details if active
      if (shouldRefreshSelected && selectedCandidate) {
        const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
        if (updatedCandidate) {
          // Fetch full resume breakdown details
          const detailRes = await axios.get(`${API_BASE_URL}/resumes/${selectedCandidate.id}`);
          setSelectedCandidate(detailRes.data);
        }
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  // Create a new job listing
  const handleCreateJob = async (jobData) => {
    try {
      const payload = {
        ...jobData,
        application_deadline: jobData.application_deadline || null
      };
      await axios.post(`${API_BASE_URL}/jobs/`, payload);
      fetchJobs();
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job listing. Please check input values.");
    }
  };

  // Delete a job listing
  const handleDeleteJob = async (jobId) => {
    try {
      await axios.delete(`${API_BASE_URL}/jobs/${jobId}`);
      fetchJobs();
      alert("Job listing deleted successfully.");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job listing. Please try again.");
    }
  };

  // Select a job to view candidate rankings
  const handleSelectJob = (job) => {
    setSelectedJob(job);
    fetchCandidates(job.id);
  };

  // Navigate back to employer dashboard
  const handleBackToDashboard = () => {
    setSelectedJob(null);
    setCandidates([]);
    fetchJobs(false);
  };

  // View individual candidate's detailed analysis
  const handleSelectCandidate = async (candidate) => {
    try {
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidate.id}`);
      setSelectedCandidate(detailRes.data);
    } catch (error) {
      console.error("Error fetching candidate details:", error);
    }
  };

  // Navigate back to ranking table
  const handleBackToJobDetails = () => {
    setSelectedCandidate(null);
    if (selectedJob) fetchCandidates(selectedJob.id, false);
  };

  // Bulk shortlists candidates and updates lists
  const handleBulkShortlist = async (resumeIds, message) => {
    try {
      await axios.post(`${API_BASE_URL}/resumes/bulk-shortlist`, {
        resume_ids: resumeIds,
        message: message || null
      });
      if (selectedJob) fetchCandidates(selectedJob.id);
      fetchJobs();
    } catch (error) {
      console.error("Error during bulk shortlist:", error);
    }
  };

  // Bulk rejects candidates and updates lists
  const handleBulkReject = async (resumeIds, message) => {
    try {
      await axios.post(`${API_BASE_URL}/resumes/bulk-reject`, {
        resume_ids: resumeIds,
        message: message || null
      });
      if (selectedJob) fetchCandidates(selectedJob.id);
      fetchJobs();
    } catch (error) {
      console.error("Error during bulk reject:", error);
    }
  };

  // Update status (shortlist or reject) of an individual candidate
  const handleUpdateStatus = async (candidateId, status, message) => {
    try {
      if (status === 'shortlisted') {
        await handleBulkShortlist([candidateId], message);
      } else if (status === 'rejected') {
        await handleBulkReject([candidateId], message);
      }
      
      // Refresh detailed candidate view
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidateId}`);
      setSelectedCandidate(detailRes.data);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Send a custom text message to an individual candidate
  const handleSendMessage = async (candidateId, message) => {
    try {
      await axios.post(`${API_BASE_URL}/resumes/${candidateId}/message`, {
        message: message
      });
      
      // Refresh detailed candidate view
      const detailRes = await axios.get(`${API_BASE_URL}/resumes/${candidateId}`);
      setSelectedCandidate(detailRes.data);
      alert("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Apply to a job (Candidate PDF resume upload)
  const handleApply = async (jobId, name, email, file, callback) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('candidate_name', name);
      formData.append('candidate_email', email);
      formData.append('file', file);

      await axios.post(`${API_BASE_URL}/jobs/${jobId}/resumes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert("Application submitted! Your resume is being processed and ranked in the background.");
      if (callback) callback();
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Make sure the file is a PDF and valid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Look up candidate applications by email
  const fetchApplications = async (email) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/candidates/${email}/applications`);
      setCandidateApps(response.data || []);
    } catch (error) {
      console.error("Error fetching candidate applications:", error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col font-sans">
      {/* Navbar header */}
      {userMode !== 'landing' && <Navbar userMode={userMode} setUserMode={setUserMode} />}

      {/* Main Content Areas */}
      <main className="flex-1 w-full">
        {userMode === 'landing' ? (
          <LandingPage onSelectMode={setUserMode} />
        ) : userMode === 'employer' ? (
          // Recruiter / Employer Views
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
          // Candidate / Job Seeker Views
          <CandidatePortal
            jobs={jobs}
            onApply={handleApply}
            fetchApplications={fetchApplications}
            candidateApps={candidateApps}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  );
};

export default App;