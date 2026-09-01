import { useState, Fragment } from "react";
import { Link } from "react-router";

const GREEN = "#96BF47";
const BORDER = "#E5E5E5";
const TEXT_BLACK = "#000000";
const TEXT_MUTED = "#616161";

const InfoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text
      x="12"
      y="17.5"
      textAnchor="middle"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontStyle="italic"
      fontWeight="700"
      fontSize="17"
      fill="#1B1B4D"
    >
      i
    </text>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: open ? "rotate(0deg)" : "rotate(180deg)",
      transition: "transform 0.2s ease",
    }}
  >
    <path
      d="M3.5 10L8 5.5L12.5 10"
      stroke={TEXT_BLACK}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.5 7.2L5.4 10L11.5 3.8"
      stroke="#1F7A3F"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 2.5L9 7L4 11.5"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="13" height="14" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="15" width="30" height="20" rx="3" stroke="#fff" strokeWidth="2.4" />
    <path d="M7 15V9C7 4.58172 10.5817 1 15 1H17C21.4183 1 25 4.58172 25 9V15" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="16" cy="24" r="2.4" fill="#fff" />
    <path d="M16 26.4V29.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBox: {
    width: "24px",
    height: "24px",
    minWidth: "24px",
    borderRadius: "4px",
    background: GREEN,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "20px",
    color: TEXT_BLACK,
    margin: 0,
  },
  chevronButton: {
    width: "28px",
    height: "28px",
    minWidth: "28px",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  body: {
    marginTop: "16px",
  },
  intro: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    lineHeight: "18px",
    color: TEXT_MUTED,
    margin: "0 0 20px",
  },
  stepTitle: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "18px",
    color: TEXT_BLACK,
    margin: "0 0 6px",
  },
  stepDescription: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    lineHeight: "19px",
    color: TEXT_MUTED,
    margin: "0 0 14px",
    maxWidth: "620px",
  },
  stepButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#000000",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "13px",
    lineHeight: "16px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  stepDivider: {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    margin: "18px 0",
  },
  donePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "#E3F4E9",
    borderRadius: "8px",
    color: "#1F7A3F",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "13px",
  },
  lockedButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#8C8C8C",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "13px",
    lineHeight: "16px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};

export type GuideStep = {
  title: string;
  body: string;
  cta: string;
  href: string;
  done?: boolean;
  external?: boolean;
  /** When true, the step's real destination is replaced with a
   *  "Register to unlock" prompt pointing at /app/account. */
  locked?: boolean;
};

export default function GetStartedGuide({
  appName,
  intro,
  steps,
}: {
  appName: string;
  intro?: string;
  steps: GuideStep[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div style={styles.card}>
      <div
        style={{ ...styles.headerRow, cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <div style={styles.iconBox}>
          <InfoIcon />
        </div>

        <h2 style={styles.title}>User Guide: Get Started with {appName}</h2>

        <button
          type="button"
          style={styles.chevronButton}
          aria-label={open ? "Collapse guide" : "Expand guide"}
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {open && (
        <div style={styles.body}>
          <p style={styles.intro}>
            {intro ?? `Follow these steps to get bookings running end to end with ${appName}.`}
          </p>

          {steps.map((step, index) => (
            <Fragment key={step.title}>
              <div>
                <p style={styles.stepTitle}>
                  {index + 1}. {step.title}
                </p>

                <p style={styles.stepDescription}>{step.body}</p>

                {step.done ? (
                  <span style={styles.donePill}>
                    <CheckIcon />
                    Completed
                  </span>
                ) : step.locked ? (
                  <Link to="/app/account" style={styles.lockedButton}>
                    <LockIcon />
                    Register to unlock
                  </Link>
                ) : step.external ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.stepButton}
                  >
                    {step.cta}
                    <ArrowRightIcon />
                  </a>
                ) : (
                  <Link to={step.href} style={styles.stepButton}>
                    {step.cta}
                    <ArrowRightIcon />
                  </Link>
                )}
              </div>

              {index < steps.length - 1 && <hr style={styles.stepDivider} />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}