'use client';

import type { CSSProperties } from 'react';

/**
 * Winit standalone brand icon.
 * Features cyan speed lines, cyan-to-purple gradient rounded frame with top-right exit opening,
 * and a bold checkmark tick that dynamically adapts to light/dark themes via var(--color-ink).
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
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="40%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Top speed line */}
      <rect x="16" y="41" width="28" height="8.5" rx="4.25" fill="#00d2ff" />
      {/* Bottom speed line */}
      <rect x="3" y="59" width="41" height="8.5" rx="4.25" fill="#00d2ff" />
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
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="winit-logo-it-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>

        {/* Icon Group */}
        <g transform="translate(0, 0)">
          <rect x="16" y="41" width="28" height="8.5" rx="4.25" fill="#00d2ff" />
          <rect x="3" y="59" width="41" height="8.5" rx="4.25" fill="#00d2ff" />
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

        {/* Wordmark: win in theme ink, It in vibrant gradient */}
        <text
          x="170"
          y="94"
          fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
          fontSize="86"
          fontWeight="800"
          letterSpacing="-1px"
        >
          <tspan fill="var(--color-ink, #ffffff)">win</tspan>
          <tspan fill="url(#winit-logo-it-grad)">It</tspan>
        </text>
      </svg>
    </div>
  );
}

export default WinItLogo;
