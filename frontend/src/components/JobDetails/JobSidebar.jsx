import React from 'react';

const JobSidebar = ({ description, requirements }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl h-fit space-y-6">
      <div>
        <h3 className="font-display font-bold text-lg text-white">Job Description</h3>
        <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{description}</p>
      </div>
      <div className="border-t border-white/5 pt-6">
        <h3 className="font-display font-bold text-lg text-white">Key Requirements</h3>
        <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{requirements}</p>
      </div>
    </div>
  );
};

export default JobSidebar;
