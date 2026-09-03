export const BLUE = "#073E74";
export const BORDER = "#DBDBDB";
export const LICENSE_BG = "#EDEDED";
export const LICENSE_BORDER = "#E9E9EA";
export const TEXT_DARK = "#000000";
export const TEXT_MUTED = "#373737";

export const styles: Record<string, React.CSSProperties> = {
  outerCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    background: "#fff",
    padding: "16px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  heading: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "18px",
    letterSpacing: "0.02em",
    color: TEXT_DARK,
    margin: 0,
  },
  pageSubtitle: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "13px",
    color: TEXT_MUTED,
    margin: "4px 0 0",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    padding: "8px",
    border: `1px solid ${BORDER}`,
    borderRadius: "10px",
    background: "#fff",
    marginBottom: "16px",
    flexWrap: "nowrap",
    overflowX: "auto",
  },
  innerCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: "8px",
    background: "#fff",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  licenseBox: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "10px",
    background: LICENSE_BG,
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
  },
  licenseTitle: {
    fontFamily: "Inter",
    fontSize: "16px",
    fontWeight: 500,
    color: TEXT_DARK,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    margin: 0,
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontFamily: "Inter",
    fontSize: "14px",
    fontWeight: 500,
    color: TEXT_DARK,
  },
  subLabel: {
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 400,
    color: TEXT_MUTED,
    marginTop: "4px",
  },
  serialPill: {
    padding: "4px 10px",
    background: "#000000",
    borderRadius: "4px",
    color: "#fff",
    fontFamily: "Inter",
    fontSize: "14px",
    fontWeight: 500,
  },
  clientCard: {
    border: `1px solid ${LICENSE_BORDER}`,
    borderRadius: "4px",
    background: "#fff",
    overflow: "hidden",
  },
  clientCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  clientCardTitle: {
    fontFamily: "Inter",
    fontSize: "16px",
    fontWeight: 600,
    color: TEXT_DARK,
  },
  clientCardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "10px",
  },
  clientDivider: {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    width: "100%",
  },
  clientFieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  clientFieldLabel: {
    fontFamily: "Inter",
    fontSize: "14px",
    fontWeight: 500,
    color: TEXT_MUTED,
  },
  clientInput: {
    width: "100%",
    padding: "7px 8px",
    borderRadius: "4px",
    border: `1px solid ${BORDER}`,
    fontFamily: "Inter",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.02em",
    color: TEXT_DARK,
    boxSizing: "border-box",
  },
  secretInputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  secretInput: {
    width: "100%",
    padding: "7px 34px 7px 8px",
    borderRadius: "4px",
    border: `1px solid ${BORDER}`,
    fontFamily: "Inter",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "0.02em",
    color: TEXT_DARK,
    boxSizing: "border-box",
  },
  secretToggleButton: {
    position: "absolute",
    right: "6px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "20px",
    height: "20px",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  errorText: {
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 400,
    color: "#C0392B",
    margin: 0,
  },
};

export function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "9px 17px",
    borderRadius: "6px",
    border: "none",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "13.5px",
    cursor: "pointer",
    background: active ? BLUE : "#ECECEC",
    color: active ? "#fff" : TEXT_DARK,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

export function saveWrapperStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px",
    borderRadius: "8px",
    width: "136px",
    height: "42px",
    boxSizing: "border-box",
    background: "linear-gradient(180deg, #2A2A2A 0%, #000000 100%)",
  };
}

export function saveButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "132px",
    height: "38px",
    boxSizing: "border-box",
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1px solid #353535",
    background: "linear-gradient(180deg, #1C1C1C 0%, #404040 100%)",
    color: "#fff",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    cursor: disabled ? "default" : "pointer",
  };
}

export function EyeIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.75 2.45962C8.66153 2.16968 9.6604 2 10.75 2C14.9319 2 17.778 4.49956 19.4751 6.70433C20.325 7.80853 20.75 8.3606 20.75 10C20.75 11.6394 20.325 12.1915 19.4751 13.2957C17.778 15.5004 14.9319 18 10.75 18C6.56811 18 3.72196 15.5004 2.02489 13.2957C1.17496 12.1915 0.75 11.6394 0.75 10C0.75 8.3606 1.17496 7.80853 2.02489 6.70433C2.50612 6.07914 3.07973 5.43025 3.75 4.82137"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.75 10C13.75 11.6569 12.4069 13 10.75 13C9.0931 13 7.75 11.6569 7.75 10C7.75 8.3431 9.0931 7 10.75 7C12.4069 7 13.75 8.3431 13.75 10Z"
        stroke={BLUE}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.75 2.45962C8.66153 2.16968 9.6604 2 10.75 2C14.9319 2 17.778 4.49956 19.4751 6.70433C20.325 7.80853 20.75 8.3606 20.75 10C20.75 11.6394 20.325 12.1915 19.4751 13.2957C17.778 15.5004 14.9319 18 10.75 18C6.56811 18 3.72196 15.5004 2.02489 13.2957C1.17496 12.1915 0.75 11.6394 0.75 10C0.75 8.3606 1.17496 7.80853 2.02489 6.70433C2.50612 6.07914 3.07973 5.43025 3.75 4.82137"
        stroke={BLUE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.75 10C13.75 11.6569 12.4069 13 10.75 13C9.0931 13 7.75 11.6569 7.75 10C7.75 8.3431 9.0931 7 10.75 7C12.4069 7 13.75 8.3431 13.75 10Z"
        stroke={BLUE}
        strokeWidth="1.5"
      />
      <path d="M1.75 1.5L19.75 18.5" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
export const tabNavRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "20px",
};

export function backNavButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: `1px solid ${BORDER}`,
    background: LICENSE_BG,
    color: disabled ? "#A6A6A6" : TEXT_DARK,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function nextNavButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: BLUE,
    color: "#fff",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TabNavRow({
  onBack,
  onNext,
  isFirst,
  isLast,
}: {
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div style={tabNavRowStyle}>
      <button type="button" style={backNavButtonStyle(isFirst)} disabled={isFirst} onClick={onBack}>
        <ChevronLeftIcon />
        Back
      </button>
      <button type="button" style={nextNavButtonStyle(isLast)} disabled={isLast} onClick={onNext}>
        Next
        <ChevronRightIcon />
      </button>
    </div>
  );
}