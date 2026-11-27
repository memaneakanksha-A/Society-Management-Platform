import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "building"
  | "users"
  | "key"
  | "car"
  | "wallet"
  | "receipt"
  | "bell"
  | "megaphone"
  | "calendar"
  | "image"
  | "info"
  | "phone"
  | "settings"
  | "chart"
  | "alert"
  | "externalLink"
  | "logout"
  | "menu"
  | "search"
  | "plus"
  | "edit"
  | "trash"
  | "download"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "eye"
  | "eyeOff"
  | "copy"
  | "globe"
  | "lock"
  | "unlock"
  | "mail"
  | "mapPin"
  | "clock"
  | "shield"
  | "database"
  | "file"
  | "folder"
  | "grid"
  | "list"
  | "moreHorizontal"
  | "moreVertical"
  | "refresh"
  | "save"
  | "x"
  | "upload"
  | "user"
  | "userPlus"
  | "userMinus"
  | "activity"
  | "creditCard"
  | "trendingUp"
  | "trendingDown"
  | "barChart"
  | "pieChart";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

const icons: Record<IconName, React.ReactElement> = {
  home: <> <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /> </>,
  building: <> <path d="M22 21V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v13" /><path d="M6 17h.01" /><path d="M10 17h.01" /><path d="M14 17h.01" /><path d="M18 17h.01" /><path d="M6 21V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 22 16v5" /> </>,
  users: <> <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /> </>,
  key: <> <path d="M15.5 3.5a2.5 2.5 0 0 1 0 3.5l-11 11a2.5 2.5 0 1 1-3.5-3.5l11-11a2.5 2.5 0 0 1 3.5 0z" /><circle cx="7.5" cy="17.5" r="2.5" /> </>,
  car: <> <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 13 10c-3 0-5.7.6-7.5 1.1C3.7 11.3 3 12.1 3 13v3c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 17h2" /><path d="M9 17h6" /><path d="M15 17h2" /> </>,
  wallet: <> <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /> </>,
  receipt: <> <path d="M5 2v20" /><path d="M19 2v20" /><path d="M5 2h14" /><path d="M5 22h14" /><path d="M9 6h6" /><path d="M9 10h6" /><path d="M9 14h6" /><path d="M9 18h4" /> </>,
  bell: <> <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /> </>,
  megaphone: <> <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M19 5v14" /><path d="M7 9h12" /><path d="M5 14.5V17a2.5 2.5 0 0 0 2.5 2.5H20" /> </>,
  calendar: <> <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /> </>,
  image: <> <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /> </>,
  info: <> <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /> </>,
  phone: <> <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /> </>,
  settings: <> <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /> </>,
  chart: <> <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /> </>,
  alert: <> <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /> </>,
  externalLink: <> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /> </>,
  logout: <> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /> </>,
  menu: <> <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /> </>,
  search: <> <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /> </>,
  plus: <> <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /> </>,
  edit: <> <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /> </>,
  trash: <> <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /> </>,
  download: <> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /> </>,
  check: <> <polyline points="20 6 9 17 4 12" /> </>,
  chevronLeft: <> <polyline points="15 18 9 12 15 6" /> </>,
  chevronRight: <> <polyline points="9 18 15 12 9 6" /> </>,
  chevronDown: <> <polyline points="6 9 12 15 18 9" /> </>,
  chevronUp: <> <polyline points="18 15 12 9 6 15" /> </>,
  eye: <> <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /> </>,
  eyeOff: <> <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /> </>,
  copy: <> <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /> </>,
  globe: <> <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /> </>,
  lock: <> <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /> </>,
  unlock: <> <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><line x1="16" y1="16" x2="16" y2="16" /> </>,
  mail: <> <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /> </>,
  mapPin: <> <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /> </>,
  clock: <> <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /> </>,
  shield: <> <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> </>,
  database: <> <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 3.5 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 3.5 3 9 3s9-1.3 9-3" /> </>,
  file: <> <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /> </>,
  folder: <> <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /> </>,
  grid: <> <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /> </>,
  list: <> <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /> </>,
  moreHorizontal: <> <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /> </>,
  moreVertical: <> <circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /><circle cx="12" cy="5" r="1" /> </>,
  refresh: <> <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /> </>,
  save: <> <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /> </>,
  x: <> <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /> </>,
  upload: <> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /> </>,
  user: <> <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /> </>,
  userPlus: <> <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /> </>,
  userMinus: <> <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /> </>,
  activity: <> <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> </>,
  creditCard: <> <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /> </>,
  trendingUp: <> <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 18 23 18 23 12" /> </>,
  trendingDown: <> <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 6 23 6 23 12" /> </>,
  barChart: <> <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /> </>,
  pieChart: <> <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /> </>,
};

export function Icon({ name, size = 18, className = "", ...props }: IconProps) {
  const path = icons[name as IconName];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {path}
    </svg>
  );
}

// Export the icons record for type checking
export const iconComponents = icons;