import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
        <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)} 
            className="sr-only peer"
            id={id}
        />
        <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 dark:bg-secondary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
    </label>
  );
};

export default ToggleSwitch;