import React from 'react';

const DizanoLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="#1E293B">
      {/* Coffee beans */}
      <ellipse cx="50" cy="80" rx="14" ry="9" />
      <ellipse cx="32" cy="85" rx="14" ry="9" transform="rotate(-30 32 85)" />
      <ellipse cx="68" cy="85" rx="14" ry="9" transform="rotate(30 68 85)" />
      
      {/* Leaves */}
      <path d="M50,70 C 35,60 35,30 50,15 C 65,30 65,60 50,70 Z" />
      <path d="M50,65 C 60,55 75,50 85,30 C 75,45 65,55 50,65 Z" transform="rotate(20 50 50)" />
      <path d="M50,65 C 40,55 25,50 15,30 C 25,45 35,55 50,65 Z" transform="rotate(-20 50 50)" />
    </g>
  </svg>
);

export default DizanoLogo;
