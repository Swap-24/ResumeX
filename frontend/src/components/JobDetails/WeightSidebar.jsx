import React from 'react';
import { Sliders, RotateCcw, Briefcase, Code, Award, GraduationCap, FileCheck } from 'lucide-react';

const WeightSidebar = ({ sliders, setSliders }) => {
  const handleSliderChange = (key, value) => {
    setSliders((prev) => ({
      ...prev,
      [key]: parseInt(value, 10),
    }));
  };

  const handleReset = () => {
    setSliders({
      work_experience: 50,
      projects: 50,
      skills: 50,
      education: 50,
      certifications: 50,
    });
  };

  const sliderConfig = [
    {
      key: 'work_experience',
      label: 'Work Experience',
      icon: Briefcase,
      color: 'text-indigo-400',
      accentColor: 'accent-indigo-500',
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: Code,
      color: 'text-emerald-400',
      accentColor: 'accent-emerald-500',
    },
    {
      key: 'skills',
      label: 'Skills',
      icon: Award,
      color: 'text-pink-400',
      accentColor: 'accent-pink-500',
    },
    {
      key: 'education',
      label: 'Education',
      icon: GraduationCap,
      color: 'text-amber-400',
      accentColor: 'accent-amber-500',
    },
    {
      key: 'certifications',
      label: 'Certifications',
      icon: FileCheck,
      color: 'text-cyan-400',
      accentColor: 'accent-cyan-500',
    },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl h-fit space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-brand-400" />
          Weight Rankings
        </h3>
        <button
          onClick={handleReset}
          title="Reset to default weights"
          className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/5 hover:border-white/10 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Adjust sliders to customize the criteria weightage. The rankings will recalculate and re-sort instantly.
      </p>

      <div className="space-y-5">
        {sliderConfig.map(({ key, label, icon: Icon, color, accentColor }) => {
          const value = sliders[key] ?? 50;
          let weightLabel = 'Normal';
          if (value > 75) weightLabel = 'Critical';
          else if (value > 55) weightLabel = 'High';
          else if (value < 25) weightLabel = 'Minimal';
          else if (value < 45) weightLabel = 'Low';

          return (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  weightLabel === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  weightLabel === 'High' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  weightLabel === 'Minimal' ? 'bg-white/5 text-gray-500 border-white/5' :
                  weightLabel === 'Low' ? 'bg-amber-500/5 text-amber-500/50 border-amber-500/10' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                }`}>
                  {weightLabel}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => handleSliderChange(key, e.target.value)}
                className={`w-full h-1.5 rounded-lg bg-white/5 appearance-none cursor-pointer outline-none ${accentColor}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeightSidebar;
