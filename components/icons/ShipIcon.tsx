import React from 'react';

const ShipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M18 6h2" />
    <path d="M12 6h2" />
    <path d="M6 6h2" />
    <path d="M2 16l2.5-9h15L22 16" />
    <path d="M8 12H4" />
    <path d="M14 12H10" />
    <path d="M20 12h-4" />
  </svg>
);

export default ShipIcon;