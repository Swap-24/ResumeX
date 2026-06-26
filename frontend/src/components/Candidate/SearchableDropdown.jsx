import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const SearchableDropdown = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`w-full bg-dark-bg/40 border rounded-xl pl-9 pr-8 py-2 text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer select-none ${
          isOpen 
            ? 'border-brand-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] text-white' 
            : 'border-white/10 text-gray-300 hover:border-brand-500/50 hover:bg-brand-500/[0.02]'
        }`}
      >
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {Icon && <Icon className={`h-4 w-4 transition-colors duration-300 ${isOpen ? 'text-brand-400' : 'text-gray-500'}`} />}
        </span>
        <span className="truncate">
          {value || placeholder}
        </span>
        <span className={`text-[10px] text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-400' : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full glass-panel border border-brand-500/30 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(139,92,246,0.1)] overflow-hidden bg-dark-card/95 backdrop-blur-md animate-fade-in">
          <div className="p-2 border-b border-white/5 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-500" />
            </span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full bg-dark-bg/60 border border-white/10 focus:border-brand-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-500/20 scrollbar-track-transparent">
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-xs cursor-pointer select-none transition-all ${
                !value 
                  ? 'bg-brand-500/20 text-brand-400 font-bold border-l-2 border-brand-500' 
                  : 'text-gray-300 hover:bg-brand-500/10 hover:text-white'
              }`}
            >
              All {label}s
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500 italic text-center">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer select-none transition-all truncate ${
                    value === opt 
                      ? 'bg-brand-500/20 text-brand-400 font-bold border-l-2 border-brand-500' 
                      : 'text-gray-300 hover:bg-brand-500/10 hover:text-white'
                  }`}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
