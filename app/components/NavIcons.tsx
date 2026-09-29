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
      style={{ overflow: "visible" }}
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNameML}
    >
      <rect
        x="0"
        y="0"
        width="40"
        height="40"
        rx="6.04"
        fill={activeML ? GREEN_ML : "none"}
        stroke={GREEN_ML}
        strokeWidth="1.25"
      />
      {childrenML}
    </svg>
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
      style={{ overflow: "visible" }}
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNameML}
    >
      <rect x="0" y="0" width="40" height="40" rx="6.04" fill={NAVY_ML} stroke={NAVY_ML} strokeWidth="1.25" />
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