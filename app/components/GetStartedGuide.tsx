import { useState, Fragment } from "react";
import { Link } from "react-router";

const GREEN_ML = "#96BF47";
const BORDER_ML = "#E5E5E5";
const TEXT_BLACK_ML = "#000000";
const TEXT_MUTED_ML = "#616161";

const InfoIcon = () => (
  <img src="/infoicon.svg" width={7} height={14} alt="" />
);

const ChevronIcon = ({ open: openML }: { open: boolean }) => (
  <img
    src="/chevron.svg"
    width={14}
    height={7}
    alt=""
    style={{
      transform: openML ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  />
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

const stylesML: Record<string, React.CSSProperties> = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BORDER_ML}`,
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "20px",
    width: "auto",
    boxSizing: "border-box",
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
    background: GREEN_ML,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "20px",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  chevronButton: {
    width: "24px",
    height: "24px",
    minWidth: "24px",
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
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "18px",
    color: TEXT_MUTED_ML,
    margin: "0 0 20px",
  },
  stepTitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "18px",
    color: TEXT_BLACK_ML,
    margin: "0 0 6px",
  },
  stepDescription: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "19px",
    color: TEXT_MUTED_ML,
    margin: "0 0 14px",
  },
  stepButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#000000",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "16px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  stepSpacer: {
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
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "12px",
  },
};

export type GuideStep = {
  title: string;
  body: string;
  cta: string;
  href: string;
  done?: boolean;
  external?: boolean;
};

export default function GetStartedGuide({
  appName: appNameML,
  intro: introML,
  steps: stepsML,
  defaultOpen: defaultOpenML = false,
}: {
  appName: string;
  intro?: string;
  steps: GuideStep[];
  defaultOpen?: boolean;
}) {
  const [openML, setOpenML] = useState(defaultOpenML);

  return (
    <div
      style={{
        ...stylesML.card,
        overflow: "hidden",
      }}
    >
      <div
        style={{ ...stylesML.headerRow, cursor: "pointer" }}
        onClick={() => setOpenML(!openML)}
      >
        <div style={stylesML.iconBox}>
          <InfoIcon />
        </div>

        <h2 style={stylesML.title}>User Guide: Get Started with {appNameML}</h2>

        <button
          type="button"
          style={stylesML.chevronButton}
          aria-label={openML ? "Collapse guide" : "Expand guide"}
        >
          <ChevronIcon open={openML} />
        </button>
      </div>

      {openML && (
        <div style={stylesML.body}>
          <p style={stylesML.intro}>
            {introML ?? `Follow these steps to get bookings running end to end with ${appNameML}.`}
          </p>

          {stepsML.map((stepML, indexML) => (
            <Fragment key={stepML.title}>
              <div>
                <p style={stylesML.stepTitle}>
                  {indexML + 1}. {stepML.title}
                </p>

                <p style={stylesML.stepDescription}>{stepML.body}</p>

                {stepML.done ? (
                  <span style={stylesML.donePill}>
                    <CheckIcon />
                    Completed
                  </span>
                ) : stepML.external ? (
                  <a
                    href={stepML.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={stylesML.stepButton}
                  >
                    {stepML.cta}
                    <ArrowRightIcon />
                  </a>
                ) : (
                  <Link to={stepML.href} style={stylesML.stepButton}>
                    {stepML.cta}
                    <ArrowRightIcon />
                  </Link>
                )}
              </div>

              {indexML < stepsML.length - 1 && <div style={stylesML.stepSpacer} />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}