'use client';

import type { CSSProperties } from 'react';

/**
 * Winit standalone brand icon in the Coastal Sky palette.
 * Features blue speed lines, a Fun Blue-to-Malibu frame gradient, and a checkmark
 * that dynamically adapts to light/dark themes via var(--color-ink).
 */
export function WinItIcon({
  size = 32,
  className = '',
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const width = Math.round(size * (156 / 123));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 156 123"
      width={width}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="winit-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A6DAD" />
          <stop offset="50%" stopColor="#46B4D2" />
          <stop offset="100%" stopColor="#7ADAF5" />
        </linearGradient>
      </defs>
      {/* Speed lines in the primary Coastal Sky blue */}
      <rect x="16" y="41" width="28" height="8.5" rx="4.25" fill="#1A6DAD" />
      <rect x="3" y="59" width="41" height="8.5" rx="4.25" fill="#1A6DAD" />
      {/* Top-left arc of frame */}
      <path
        d="M 120,11 H 59 A 22,22 0 0 0 37,33 V 35"
        fill="none"
        stroke="url(#winit-icon-grad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-left, bottom, bottom-right and right arc of frame */}
      <path
        d="M 37,73 V 88 A 22,22 0 0 0 59,110 H 122 A 22,22 0 0 0 144,88 V 40"
        fill="none"
        stroke="url(#winit-icon-grad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark: dynamically adapts to dark (white) and light (dark navy) */}
      <path
        d="M 61,56 L 82,80 L 138,26"
        fill="none"
        stroke="var(--color-ink, currentColor)"
        strokeWidth="15.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Winit full horizontal logo: WinItIcon + 'winIt' wordmark.
 * Uses exact brand colors and typography matching the brand design system in both Light and Dark modes.
 */
export function WinItLogo({
  height = 32,
  className = '',
  style,
}: {
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const width = Math.round(height * (460 / 123));
  return (
    <div
      className={`winit-brand-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', height, direction: 'ltr', ...style }}
      aria-label="Winit"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 460 123"
        width={width}
        height={height}
        style={{ display: 'block', height: '100%', width: 'auto' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="winit-logo-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A6DAD" />
            <stop offset="50%" stopColor="#46B4D2" />
            <stop offset="100%" stopColor="#7ADAF5" />
          </linearGradient>
        </defs>

        {/* Icon Group */}
        <g transform="translate(0, 0)">
          <rect x="16" y="41" width="28" height="8.5" rx="4.25" fill="#1A6DAD" />
          <rect x="3" y="59" width="41" height="8.5" rx="4.25" fill="#1A6DAD" />
          <path
            d="M 120,11 H 59 A 22,22 0 0 0 37,33 V 35"
            fill="none"
            stroke="url(#winit-logo-icon-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 37,73 V 88 A 22,22 0 0 0 59,110 H 122 A 22,22 0 0 0 144,88 V 40"
            fill="none"
            stroke="url(#winit-logo-icon-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 61,56 L 82,80 L 138,26"
            fill="none"
            stroke="var(--color-ink, currentColor)"
            strokeWidth="15.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Wordmark: theme ink plus accessible primary blue in both color modes */}
        <text
          x="170"
          y="94"
          fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
          fontSize="86"
          fontWeight="800"
          letterSpacing="-1px"
        >
          <tspan fill="var(--color-ink, #ffffff)">win</tspan>
          <tspan fill="var(--color-primary, #1A6DAD)">It</tspan>
        </text>
      </svg>
    </div>
  );
}

export default WinItLogo;
