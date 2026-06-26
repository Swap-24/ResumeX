import React from 'react';
import { Search } from 'lucide-react';

const LookupForm = ({ lookupEmail, onChangeEmail, onLookup }) => {
  return (
    <form onSubmit={onLookup} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
        <input
          type="email"
          required
          value={lookupEmail}
          onChange={(e) => onChangeEmail(e.target.value)}
          className="w-full bg-dark-bg/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
          placeholder="Enter registered email"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-sm border border-white/5 transition-all cursor-pointer"
      >
        Track
      </button>
    </form>
  );
};

export default LookupForm;
