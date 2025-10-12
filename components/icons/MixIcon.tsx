import React from 'react';

const MixIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M10 10l4.5 4.5" />
    <path d="M10 4.5V10h5.5" />
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export default MixIcon;
