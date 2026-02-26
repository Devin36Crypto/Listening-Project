import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  position?: 'up' | 'down';
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon,
  className = '',
  position = 'down'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-all ${className}`}
        type="button"
        title={selectedOption ? selectedOption.label : placeholder}
      >
        {icon ? icon : (
          <span className="text-sm text-slate-200 truncate px-2">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className={`absolute ${position === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-48 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1 custom-scrollbar`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0 ${
                value === option.value ? 'text-blue-400 bg-slate-700/30' : 'text-slate-300'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check size={14} className="flex-shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
