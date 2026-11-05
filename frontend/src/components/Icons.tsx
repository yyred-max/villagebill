// src/components/Icons.tsx
// Ikon outline tipis, meniru gaya di desain (bukan emoji)

export const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconWarning = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconSpinner = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin-icon">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconSplit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
  </svg>
);

export const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconBolt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

export const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

// 🔥 Gabungan versi pertama & kedua — default width=15, bisa di-override via props
export const IconCreditCard = (props: any) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const IconUserPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

export const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="8" cy="8" r="3" />
    <path d="M1.5 19c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
    <circle cx="17" cy="8.5" r="2.3" />
    <path d="M15.5 13.2c2.7.4 4.5 2.5 4.5 5.3" />
  </svg>
);

export const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export const IconAlertCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M4 16V5a1 1 0 0 1 1-1h11" />
  </svg>
);

export const IconExternalLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 4h6v6M20 4 10 14M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </svg>
);