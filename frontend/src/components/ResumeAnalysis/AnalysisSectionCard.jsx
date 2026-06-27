import React from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalysisSectionCard = ({ section, isExpanded, onToggleExpand, getScoreLabel }) => {
  const sectionStyle = getScoreLabel(section.score);

  // Math for needle inside the mini-speedometer
  const scoreVal = section.score || 0;
  const needleAngle = Math.PI + (scoreVal / 100) * Math.PI;
  const needleX = 30 + 17 * Math.cos(needleAngle);
  const needleY = 32 + 17 * Math.sin(needleAngle);

  return (
    <div
      onClick={onToggleExpand}
      className={`glass-panel p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none hover:scale-[1.015] hover:bg-white/[0.02] ${
        isExpanded 
          ? 'border-brand-500/30 bg-brand-500/[0.01] shadow-[0_0_20px_rgba(62,92,255,0.02)]' 
          : 'border-white/5 shadow-sm'
      }`}
    >
      {/* Header summary of the section */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <h4 className="font-display font-bold text-white text-base">
            {section.section_label}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{section.summary}</p>
        </div>

        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Mini-Speedometer Gauge for Section */}
          <div className="relative flex flex-col items-center justify-center">
            <svg className="w-18 h-11" viewBox="0 0 60 38">
              <defs>
                <linearGradient id={`mini-grad-${section.section_key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Background Arch */}
              <path
                d="M 8 32 A 22 22 0 0 1 52 32"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Colored Arch */}
              <path
                d="M 8 32 A 22 22 0 0 1 52 32"
                fill="none"
                stroke={`url(#mini-grad-${section.section_key})`}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="69.1"
                strokeDashoffset={69.1 * (1 - scoreVal / 100)}
                className="transition-all duration-1000 ease-out"
              />
              {/* Needle */}
              <line
                x1="30"
                y1="32"
                x2={needleX}
                y2={needleY}
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out origin-[30px_32px]"
              />
              {/* Cap Pin */}
              <circle cx="30" cy="32" r="3.5" fill="#ffffff" />
              <circle cx="30" cy="32" r="1.5" fill="#121622" />
            </svg>
            <div className="text-[10px] font-extrabold text-white mt-0.5">
              {scoreVal}%
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Expanded bullet details: Positives, Negatives, Missing */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4 text-xs leading-relaxed">
              {/* Positives */}
              <div className="space-y-2">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  Positives
                </span>
                {section.positives?.length > 0 ? (
                  <ul className="space-y-1.5 list-disc list-inside text-gray-300 pl-1 break-words">
                    {section.positives.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic pl-1">None reported</p>
                )}
              </div>

              {/* Negatives */}
              <div className="space-y-2">
                <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Negatives / Flags
                </span>
                {section.negatives?.length > 0 ? (
                  <ul className="space-y-1.5 list-disc list-inside text-gray-300 pl-1 break-words">
                    {section.negatives.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic pl-1">None reported</p>
                )}
              </div>

              {/* Missing */}
              <div className="space-y-2">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Items
                </span>
                {section.missing?.length > 0 ? (
                  <ul className="space-y-1.5 list-disc list-inside text-gray-300 pl-1 break-words">
                    {section.missing.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic pl-1">None reported</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisSectionCard;
