import React from 'react';

export function PrayerIcon({ 
  size = 18, 
  className = '', 
  style = {}, 
  strokeWidth = 2 
}: { 
  size?: number; 
  className?: string; 
  style?: React.CSSProperties; 
  strokeWidth?: number; 
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={style}
    >
      {/* Finial / Spire */}
      <path d="M12 3.5V1.5" />
      {/* Mosque Dome with graceful curve */}
      <path d="M12 3.5C7.8 5.8 5 9.4 5 13.8V20h14v-6.2C19 9.4 16.2 5.8 12 3.5z" />
      {/* Mihrab / Prayer Arch */}
      <path d="M9.5 20v-4a2.5 2.5 0 0 1 5 0v4" />
      {/* Ground line */}
      <path d="M2.5 20h19" />
    </svg>
  );
}

export default PrayerIcon;
