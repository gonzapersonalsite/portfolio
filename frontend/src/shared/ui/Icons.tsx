import React from 'react'

export interface IconProps {
  readonly className?: string
  readonly 'aria-hidden'?: boolean | 'true' | 'false'
}

const iconProps = (className?: string): React.SVGProps<SVGSVGElement> => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: 'false',
  'aria-hidden': true,
  className: className ? `ui-icon ${className}` : 'ui-icon',
})

export const BrandMarkIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 64 64"
    fill="none"
    focusable="false"
    aria-hidden="true"
    className={className ? `ui-icon ${className}` : 'ui-icon'}
  >
    <rect x="1" y="1" width="62" height="62" rx="13" fill="#17181A" stroke="#343841" strokeWidth="2" />
    <path d="M37.15 21.96A15 15 0 1 0 41 32H27" stroke="#F4F1EA" strokeWidth="7" strokeLinecap="round" />
    <circle cx="51" cy="45.5" r="5" fill="#FF7847" />
  </svg>
)

export const ArrowForwardIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
)

export const MenuIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
)

export const CloseIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export const SunIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

export const MoonIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
  </svg>
)

export const MotionPlayIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
  </svg>
)

export const MotionPauseIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
  </svg>
)

export const EmailIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const LocationIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const GitHubIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
    className={className ? `ui-icon ${className}` : 'ui-icon'}
  >
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
)

export const LinkedInIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
    className={className ? `ui-icon ${className}` : 'ui-icon'}
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
  </svg>
)

export const LaunchIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M14 4h6v6" />
    <path d="M10 14 20 4" />
    <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
  </svg>
)

export const StoreIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
)

export const BookIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
    <path d="M6.5 19H20" />
  </svg>
)

export const CodeIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="m8 8-4 4 4 4" />
    <path d="m16 8 4 4-4 4" />
    <path d="m13.5 5-3 14" />
  </svg>
)

export const GlobeIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
  </svg>
)

export const DesktopIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
)

export const PhoneIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </svg>
)

export const GalleryIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="5" width="14" height="12" rx="2" />
    <path d="m6 14 3-3 2.5 2.5L14 11l3 3" />
    <path d="M19 8v10a2 2 0 0 1-2 2H6" />
  </svg>
)

export const EyeIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const StarIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
    className={className ? `ui-icon ${className}` : 'ui-icon'}
  >
    <path d="m12 3 2.9 5.88 6.5.94-4.7 4.58 1.1 6.46L12 17.8l-5.8 3.06 1.1-6.46-4.7-4.58 6.5-.94L12 3Z" />
  </svg>
)

export const DotIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 12 12"
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
    className={className ? `ui-icon ${className}` : 'ui-icon'}
  >
    <circle cx="6" cy="6" r="5" />
  </svg>
)

export const CalendarIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
)

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
)

export const TerminalIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="m7 9 3 3-3 3M12 15h5" />
  </svg>
)

export const AlertCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export const RocketIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M5 15s1-6 8-10c3 3 3 7 0 11l-3 3-5-4Z" />
    <path d="m9 17-4 2 2-4" />
  </svg>
)

export const LayersIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <polygon points="12 3 3 8 12 13 21 8 12 3" />
    <path d="m3 13 9 5 9-5" />
    <path d="m3 18 9 5 9-5" />
  </svg>
)

export const ExploreIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="15 9 13 13 9 15 11 11 15 9" />
  </svg>
)

export const SendIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...iconProps(className)}>
    <path d="M21 3 10 14" />
    <path d="m21 3-6.5 18-4-7.5L3 9.5 21 3Z" />
  </svg>
)
