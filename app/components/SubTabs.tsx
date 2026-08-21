import { NavLink } from "react-router";

import styles from "./SubTabs.module.css";

export type SubTab = {
  to: string;
  label: string;
  end?: boolean;
};

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  return (
    <div className={styles.wrap}>
      <nav className={styles.pillBar} aria-label="Section tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? `${styles.pill} ${styles.pillActive}` : styles.pill
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
