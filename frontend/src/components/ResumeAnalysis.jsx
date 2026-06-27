import React, { useState } from 'react';
import { ArrowLeft, Award, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CandidateProfileCard from './ResumeAnalysis/CandidateProfileCard';
import DecisionForm from './ResumeAnalysis/DecisionForm';
import AnalysisSectionCard from './ResumeAnalysis/AnalysisSectionCard';

const ResumeAnalysis = ({
  candidate,
  onBack,
  onUpdateStatus,
  onSendMessage,
  defaultShortlistMessage,
  defaultRejectionMessage,
}) => {
  const [activeTab, setActiveTab] = useState('evaluator'); // 'evaluator' | 'profiler'
  const [expandedSection, setExpandedSection] = useState(null);

  // Group sections by Evaluator vs Profiler
  const evaluatorKeys = ['work_experience', 'projects', 'skills', 'education', 'certifications', 'resume_quality'];
  const profilerKeys = ['trajectory', 'impact_quality', 'inferred_intent', 'overall_fit'];

  const sections = candidate.sections || [];
  const evaluatorSections = sections.filter((s) => evaluatorKeys.includes(s.section_key));
  const profilerSections = sections.filter((s) => profilerKeys.includes(s.section_key));

  const currentTabSections = activeTab === 'evaluator' ? evaluatorSections : profilerSections;

  const handleAction = (status, individualMessage) => {
    onUpdateStatus(candidate.id, status, individualMessage);
  };

  const handleSendOnlyMessage = (individualMessage) => {
    onSendMessage(candidate.id, individualMessage);
  };

  const getScoreLabel = (score) => {
    if (score >= 81) return { text: 'Excellent', style: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5', color: '#10b981' };
    if (score >= 66) return { text: 'Strong', style: 'text-indigo-400 border-indigo-500/25 bg-indigo-500/5', color: '#6366f1' };
    if (score >= 41) return { text: 'Average', style: 'text-amber-400 border-amber-500/25 bg-amber-500/5', color: '#f59e0b' };
    return { text: 'Weak', style: 'text-rose-400 border-rose-500/25 bg-rose-500/5', color: '#ef4444' };
  };

  const scoreInfo = getScoreLabel(candidate.overall_score || 0);

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rankings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Candidate Overview & Actions */}
        <div className="space-y-6">
          <CandidateProfileCard candidate={candidate} scoreInfo={scoreInfo} />
          <DecisionForm
            onSubmitAction={handleAction}
            onSendOnlyMessage={handleSendOnlyMessage}
            defaultShortlistMessage={defaultShortlistMessage}
            defaultRejectionMessage={defaultRejectionMessage}
          />
        </div>

        {/* Right Column: AI Analysis breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Selection */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => {
                setActiveTab('evaluator');
                setExpandedSection(null);
              }}
              className={`pb-4 px-6 font-display font-bold text-sm tracking-tight border-b-2 transition-all relative flex items-center gap-2 cursor-pointer ${activeTab === 'evaluator'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Award className="h-4 w-4" />
              Evaluator Analysis
              <span className="block text-[10px] text-gray-500 font-normal">(Direct Criteria)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('profiler');
                setExpandedSection(null);
              }}
              className={`pb-4 px-6 font-display font-bold text-sm tracking-tight border-b-2 transition-all relative flex items-center gap-2 cursor-pointer ${activeTab === 'profiler'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Sparkles className="h-4 w-4" />
              Profiler Analysis
              <span className="block text-[10px] text-gray-500 font-normal">(Abstract Signals)</span>
            </button>
          </div>

          {/* Analysis Cards list */}
          <motion.div className="space-y-4" layout>
            <AnimatePresence mode="popLayout">
              {currentTabSections.map((section) => (
                <motion.div
                  key={section.section_key}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                >
                  <AnalysisSectionCard
                    section={section}
                    isExpanded={expandedSection === section.section_key}
                    onToggleExpand={() => setExpandedSection(expandedSection === section.section_key ? null : section.section_key)}
                    getScoreLabel={getScoreLabel}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalysis;
