import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';

const ApplyForm = ({ selectedJob, onApply, isSubmitting, onCancel, userEmail = '', userName = '' }) => {
  const [formData, setFormData] = useState({
    name: userName || '',
    email: userEmail || '',
    file: null,
  });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setFormData({ ...formData, file });
      } else {
        alert("Only PDF files are accepted!");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setFormData({ ...formData, file });
      } else {
        alert("Only PDF files are accepted!");
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.file) {
      alert("Please fill out all fields and select a PDF resume.");
      return;
    }
    
    onApply(selectedJob.id, formData.name, formData.email, formData.file, () => {
      setFormData({ name: '', email: '', file: null });
    });
  };

  if (!selectedJob) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 animate-fade-in max-w-xl mx-auto relative z-10">
      <div>
        <h2 className="font-display font-bold text-xl text-white">Apply for {selectedJob.title}</h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-brand-500/10 text-brand-300 rounded-full border border-brand-500/20">
            {selectedJob.department || 'General'}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {selectedJob.location || 'Remote'} &bull; {selectedJob.employment_type || 'Full-time'}
          </span>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => !userName && setFormData({ ...formData, name: e.target.value })}
            readOnly={!!userName}
            className={`w-full bg-dark-bg/60 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm ${
              userName ? 'border-white/5 opacity-60 cursor-not-allowed' : 'border-white/10'
            }`}
            placeholder="e.g. John Doe"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => !userEmail && setFormData({ ...formData, email: e.target.value })}
            readOnly={!!userEmail}
            className={`w-full bg-dark-bg/60 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm ${
              userEmail ? 'border-white/5 opacity-60 cursor-not-allowed' : 'border-white/10'
            }`}
            placeholder="e.g. johndoe@example.com"
          />
        </div>

        {/* Resume Upload Box */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Upload Resume (PDF only) *</label>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`w-full min-h-[160px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 relative ${
              dragActive 
                ? 'border-brand-500 bg-brand-500/5' 
                : formData.file 
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                  : 'border-white/10 bg-dark-bg/30 hover:bg-dark-bg/60 hover:border-white/20'
            }`}
          >
            <input
              type="file"
              id="resume-upload"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="resume-upload" className="cursor-pointer space-y-2 flex flex-col items-center">
              <UploadCloud className={`h-10 w-10 ${formData.file ? 'text-emerald-400' : 'text-brand-400'}`} />
              {formData.file ? (
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-[280px]">
                    {formData.file.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(formData.file.size / 1024 / 1024).toFixed(2)} MB &bull; Ready
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-white">Drag and drop your resume file here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse from files (PDF only)</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/10 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading & Analyzing Resume...
              </>
            ) : (
              'Submit Application'
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/5 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            Cancel & Back to Listings
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplyForm;
