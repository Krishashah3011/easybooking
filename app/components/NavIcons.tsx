import type { ReactNode } from "react";

export type IconProps = {
  className?: string;
  active?: boolean;
};

const GREEN = "#96BF47";
const NAVY = "#073E74";

function NavBadge({
  active,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="4.75"
        y="4.75"
        width="40"
        height="40"
        rx="7.25"
        fill={active ? GREEN : "none"}
        stroke={GREEN}
        strokeWidth="1.5"
      />
      {children}
    </svg>
  );
}

function PlaceholderGlyph({ children }: { children: ReactNode }) {
  return (
    <g
      transform="translate(14 14) scale(0.8333)"
      stroke={NAVY}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {children}
    </g>
  );
}

export function HomeIcon({ className, active }: IconProps) {
  return (
    <NavBadge active={active} className={className}>
      <image
        href="/Homeicon.svg"
        x="14.75"
        y="14.75"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function SettingsIcon({ className, active }: IconProps) {
  return (
    <NavBadge active={active} className={className}>
      <image
        href="/Configurationsicon.svg"
        x="14.75"
        y="14.75"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function AccountIcon({ className }: IconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4.75" y="4.75" width="40" height="40" rx="7.25" fill={NAVY} stroke={NAVY} strokeWidth="1.5" />
      <image
        href="/accounticon.svg"
        x="14.75"
        y="14.75"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </svg>
  );
}

export function ScheduleIcon({ className, active }: IconProps) {
  return (
    <NavBadge active={active} className={className}>
      <PlaceholderGlyph>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 2.5v3M16 2.5v3" />
        <circle cx="15.5" cy="15" r="3.2" />
        <path d="M15.5 13.5V15l1 0.8" />
      </PlaceholderGlyph>
    </NavBadge>
  );
}

export function ProductsIcon({ className, active }: IconProps) {
  return (
    <NavBadge active={active} className={className}>
      <image
        href="/producticon.svg"
        x="14.75"
        y="14.75"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function BookingsIcon({ className, active }: IconProps) {
  return (
    <NavBadge active={active} className={className}>
      <image
        href="/Bookingicon.svg"
        x="14.75"
        y="14.75"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}