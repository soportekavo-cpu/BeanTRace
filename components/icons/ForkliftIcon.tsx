import React from 'react';

const ForkliftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 12V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11h12" />
    <path d="M12 12h5a2 2 0 0 1 2 2v5h-7" />
    <path d="M12 3v3" />
    <path d="M18 19V7" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="18" cy="19" r="2" />
  </svg>
);

export default ForkliftIcon;