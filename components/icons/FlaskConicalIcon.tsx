import React from 'react';

const FlaskConicalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M10 2v7.31" />
    <path d="M14 9.31V2" />
    <path d="M3.52 14.54 9.2 8.87a4.48 4.48 0 0 1 6.32 0l5.68 5.67a6.5 6.5 0 1 1-9.2 9.19v0a6.5 6.5 0 1 1-9.2-9.19z" />
  </svg>
);

export default FlaskConicalIcon;