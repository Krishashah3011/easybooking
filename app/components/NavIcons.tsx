import type { ReactNode } from "react";

export type IconProps = {
  className?: string;
  active?: boolean;
};

const GREEN_ML = "#96BF47";
const NAVY_ML = "#073E74";

function NavBadge({
  active: activeML,
  className: classNameML,
  children: childrenML,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNameML}
    >
      <rect
        x="0.625"
        y="0.625"
        width="38.75"
        height="38.75"
        rx="6.04"
        fill={activeML ? GREEN_ML : "none"}
        stroke={GREEN_ML}
        strokeWidth="1.25"
      />
      {childrenML}
    </svg>
  );
}

function PlaceholderGlyph({ children: childrenML }: { children: ReactNode }) {
  return (
    <g
      transform="translate(14 14) scale(0.8333)"
      stroke={NAVY_ML}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {childrenML}
    </g>
  );
}

export function HomeIcon({ className: classNameML, active: activeML }: IconProps) {
  return (
    <NavBadge active={activeML} className={classNameML}>
      <image
        href="/Homeicon.svg"
        x="10"
        y="10"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function SettingsIcon({ className: classNameML, active: activeML }: IconProps) {
  return (
    <NavBadge active={activeML} className={classNameML}>
      <image
        href="/Configurationsicon.svg"
        x="10"
        y="10"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function AccountIcon({ className: classNameML }: IconProps) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNameML}
    >
      <rect x="0.625" y="0.625" width="38.75" height="38.75" rx="6.04" fill={NAVY_ML} stroke={NAVY_ML} strokeWidth="1.25" />
      <image
        href="/accounticon.svg"
        x="10"
        y="10"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </svg>
  );
}

export function ScheduleIcon({ className: classNameML, active: activeML }: IconProps) {
  return (
    <NavBadge active={activeML} className={classNameML}>
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

export function ProductsIcon({ className: classNameML, active: activeML }: IconProps) {
  return (
    <NavBadge active={activeML} className={classNameML}>
      <image
        href="/producticon.svg"
        x="10"
        y="10"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}

export function BookingsIcon({ className: classNameML, active: activeML }: IconProps) {
  return (
    <NavBadge active={activeML} className={classNameML}>
      <image
        href="/Bookingicon.svg"
        x="10"
        y="10"
        width="20"
        height="20"
        preserveAspectRatio="none"
      />
    </NavBadge>
  );
}