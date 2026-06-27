import React, { useState, useRef } from 'react';
import { X, Calendar } from 'lucide-react';

const CreateJobModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    employment_type: 'Full-time',
    department: '',
    application_deadline: '',
    default_shortlist_message: '',
    default_rejection_message: '',
  });

  const dateInputRef = useRef(null);

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const tomorrowStr = getTomorrowDateString();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-dark-card/50">
          <h3 className="font-display font-extrabold text-xl text-white">Create New Job Posting</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                placeholder="e.g. Senior React Developer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                placeholder="e.g. Engineering"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                placeholder="e.g. Remote, San Francisco"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Application Deadline</label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="date"
                  ref={dateInputRef}
                  min={tomorrowStr}
                  value={formData.application_deadline}
                  onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (dateInputRef.current) {
                      try {
                        dateInputRef.current.showPicker();
                      } catch (err) {
                        dateInputRef.current.click();
                      }
                    }
                  }}
                  className="flex items-center justify-center p-3 bg-dark-bg/60 border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-400 hover:text-brand-400 rounded-xl transition-all duration-300 shadow-md cursor-pointer group"
                  title="Select application deadline"
                >
                  <Calendar className="h-5 w-5 group-hover:scale-105 transition-transform" />
                </button>

                {formData.application_deadline ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-semibold animate-fade-in">
                    <span>
                      {(() => {
                        try {
                          const d = new Date(formData.application_deadline);
                          return isNaN(d.getTime()) ? formData.application_deadline : d.toLocaleDateString();
                        } catch (err) {
                          return formData.application_deadline;
                        }
                      })()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, application_deadline: '' })}
                      className="text-brand-400 hover:text-rose-400 transition-colors p-0.5 rounded-md hover:bg-white/5 cursor-pointer"
                      title="Clear deadline"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No deadline set</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job Description *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
              placeholder="Outline the role responsibilities, team details, and scope of work..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Requirements *</label>
            <textarea
              required
              rows={4}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
              placeholder="List qualifications, required skills, tools, and years of experience..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Default Shortlist Message</label>
              <textarea
                rows={3}
                value={formData.default_shortlist_message}
                onChange={(e) => setFormData({ ...formData, default_shortlist_message: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs leading-relaxed"
                placeholder="e.g. Congratulations! We would love to move forward with your application."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Default Rejection Message</label>
              <textarea
                rows={3}
                value={formData.default_rejection_message}
                onChange={(e) => setFormData({ ...formData, default_rejection_message: e.target.value })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-xs leading-relaxed"
                placeholder="e.g. Thank you for your interest. Unfortunately, we have decided not to proceed."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4 bg-dark-card/30 -mx-6 -mb-6 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-semibold text-white transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/10 text-sm cursor-pointer"
            >
              Post Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobModal;
