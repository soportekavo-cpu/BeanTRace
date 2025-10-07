import React from 'react';

const LasRegionesLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g transform="translate(0, -10)">
      {/* Three berries */}
      <circle cx="60" cy="70" r="10" fill="black" />
      <circle cx="48" cy="75" r="7" fill="black" />
      <circle cx="72" cy="75" r="7" fill="black" />

      {/* Five leaves */}
      <path d="M60,60 C 40,50 40,20 60,10 Z" fill="black" />
      <path d="M60,60 C 80,50 80,20 60,10 Z" fill="black" transform="scale(-1, 1) translate(-120, 0)" />
      <path d="M60,60 C 50,40 20,40 45,30 Z" fill="black" />
      <path d="M60,60 C 70,40 100,40 75,30 Z" fill="black" />
      <path d="M60,60 C 58,40 62,40 60,20 Z" fill="black" />

      <text x="60" y="105" fontFamily="Helvetica, Arial, sans-serif" fontSize="14" fontWeight="bold" textAnchor="middle" fill="black">
        LAS REGIONES
      </text>
    </g>
  </svg>
);

export default LasRegionesLogo;