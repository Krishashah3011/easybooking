import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import {
  getSmtpSettings,
  parseSmtpSettingsForm,
  toFormValues,
  upsertSmtpSettings,
  type SmtpSettingsFieldErrors,
  type SmtpSettingsFormValues,
} from "../models/smtpSettings.server";

const BLUE = "#073E74";
const BORDER = "#DBDBDB";
const LICENSE_BG = "#EDEDED";
const LICENSE_BORDER = "#E9E9EA";
const TEXT_DARK = "#000000";
const TEXT_MUTED = "#373737";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [shopSettings, smtpSettings] = await Promise.all([
    getOrCreateShopSettings(session.shop),
    getSmtpSettings(session.shop),
  ]);

  return {
    serialKey: shopSettings.serialKey,
    smtp: toFormValues(smtpSettings),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const { values, errors } = parseSmtpSettingsForm(formData);
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values };
  }

  const saved = await upsertSmtpSettings(session.shop, values);
  return {
    ok: true as const,
    errors: {} as SmtpSettingsFieldErrors,
    values: toFormValues(saved),
  };
};

function EyeIcon() {
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

function EyeOffIcon() {
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

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outerCard: {
    width: "950px",
    maxWidth: "950px",
    boxSizing: "border-box",
    marginInline: "auto",
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
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "18px",
    letterSpacing: "0.02em",
    color: TEXT_DARK,
    margin: 0,
  },
  tabBar: {
    display: "flex",
    gap: "10px",
    padding: "8px",
    border: `1px solid ${BORDER}`,
    borderRadius: "10px",
    background: "#fff",
    marginBottom: "16px",
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
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    color: TEXT_DARK,
  },
  subLabel: {
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    color: TEXT_MUTED,
  },
  clientInput: {
    width: "100%",
    padding: "7px 8px",
    borderRadius: "4px",
    border: `1px solid ${BORDER}`,
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
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
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    fontWeight: 400,
    color: "#C0392B",
    margin: 0,
  },
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    background: active ? BLUE : "#ECECEC",
    color: active ? "#fff" : TEXT_DARK,
  };
}

function saveWrapperStyle(): React.CSSProperties {
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

function saveButtonStyle(disabled: boolean): React.CSSProperties {
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
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "19px",
    cursor: disabled ? "default" : "pointer",
  };
}

const tabNavRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "20px",
};

function backNavButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: `1px solid ${BORDER}`,
    background: LICENSE_BG,
    color: disabled ? "#A6A6A6" : TEXT_DARK,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function nextNavButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: BLUE,
    color: "#fff",
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function TabNavRow({
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

const TAB_ORDER = ["general", "smtp"] as const;
type TabKey = (typeof TAB_ORDER)[number];

export default function SettingsPage() {
  const { serialKey, smtp: initialSmtp } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const activeTabIndex = TAB_ORDER.indexOf(activeTab);
  const goBackTab = () => {
    if (activeTabIndex > 0) setActiveTab(TAB_ORDER[activeTabIndex - 1]);
  };
  const goNextTab = () => {
    if (activeTabIndex < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[activeTabIndex + 1]);
  };

  const [smtpValues, setSmtpValues] = useState<SmtpSettingsFormValues>(initialSmtp);
  const [showPass, setShowPass] = useState(false);

  const smtpErrors: SmtpSettingsFieldErrors =
    fetcher.data && "errors" in fetcher.data ? fetcher.data.errors : {};
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      setSmtpValues(fetcher.data.values);
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  const setSmtpField = <K extends keyof SmtpSettingsFormValues>(
    key: K,
    value: SmtpSettingsFormValues[K],
  ) => {
    setSmtpValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    fetcher.submit(
      {
        host: smtpValues.host,
        port: smtpValues.port,
        username: smtpValues.username,
        password: smtpValues.password,
        fromEmail: smtpValues.fromEmail,
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Settings" inlineSize="large" style={{ width: "950px", maxWidth: "950px", boxSizing: "border-box", marginInline: "auto" }}>
      <div style={styles.outerCard}>
        <div style={styles.headerRow}>
          <h1 style={styles.heading}>Configurations</h1>
          <div style={saveWrapperStyle()}>
            <button style={saveButtonStyle(isSaving)} disabled={isSaving} onClick={handleSave}>
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div style={styles.tabBar}>
          <button
            type="button"
            style={tabButtonStyle(activeTab === "general")}
            onClick={() => setActiveTab("general")}
          >
            General Settings
          </button>
          <button
            type="button"
            style={tabButtonStyle(activeTab === "smtp")}
            onClick={() => setActiveTab("smtp")}
          >
            SMTP Settings
          </button>
        </div>

        {activeTab === "general" && (
          <div style={styles.innerCard}>
            <div style={styles.licenseBox}>
              <div style={styles.licenseTitle}>License</div>
              <hr style={styles.divider} />

              <div style={styles.rowBetween}>
                <div style={styles.label}>Serial Key</div>
                <div style={styles.serialPill}>{serialKey}</div>
              </div>
            </div>

            <TabNavRow
              onBack={goBackTab}
              onNext={goNextTab}
              isFirst={activeTabIndex === 0}
              isLast={activeTabIndex === TAB_ORDER.length - 1}
            />
          </div>
        )}

        {activeTab === "smtp" && (
          <div style={styles.innerCard}>
            <div style={styles.subLabel}>
              Configure the SMTP server used to send booking confirmation, reminder, and cancellation emails to
              your customers.
            </div>

            <div style={styles.clientCard}>
              <div style={styles.clientCardBody}>
                <div style={styles.clientCardHeader}>
                  <div style={styles.clientCardTitle}>Email (SMTP) Settings</div>
                </div>

                <div style={styles.subLabel}>
                 Used to send automated emails for reminders, booking confirmations, rescheduling updates, cancellations, and other booking-related notifications.
                </div>

                <div style={styles.clientDivider} />

                <div style={styles.clientFieldGroup}>
                  <div style={styles.clientFieldLabel}>SMTP Host</div>
                  <input
                    type="text"
                    style={styles.clientInput}
                    value={smtpValues.host}
                    onChange={(e) => setSmtpField("host", e.target.value)}
                    placeholder="smtp.example.com"
                  />
                  {smtpErrors.host && <p style={styles.errorText}>{smtpErrors.host}</p>}
                </div>

                <div style={styles.clientDivider} />

                <div style={styles.clientFieldGroup}>
                  <div style={styles.clientFieldLabel}>SMTP Port</div>
                  <input
                    type="text"
                    style={styles.clientInput}
                    value={smtpValues.port}
                    onChange={(e) => setSmtpField("port", e.target.value)}
                    placeholder="587"
                  />
                  {smtpErrors.port && <p style={styles.errorText}>{smtpErrors.port}</p>}
                </div>

                <div style={styles.clientDivider} />

                <div style={styles.clientFieldGroup}>
                  <div style={styles.clientFieldLabel}>SMTP Username</div>
                  <input
                    type="text"
                    style={styles.clientInput}
                    value={smtpValues.username}
                    onChange={(e) => setSmtpField("username", e.target.value)}
                    placeholder="Enter SMTP username"
                  />
                  {smtpErrors.username && (
                    <p style={styles.errorText}>{smtpErrors.username}</p>
                  )}
                </div>

                <div style={styles.clientDivider} />

                <div style={styles.clientFieldGroup}>
                  <div style={styles.clientFieldLabel}>SMTP Password</div>
                  <div style={styles.secretInputWrap}>
                    <input
                      type={showPass ? "text" : "password"}
                      autoComplete="off"
                      style={styles.secretInput}
                      value={smtpValues.password}
                      onChange={(e) => setSmtpField("password", e.target.value)}
                      placeholder="Enter SMTP password"
                    />
                    <button
                      type="button"
                      style={styles.secretToggleButton}
                      onClick={() => setShowPass((prev) => !prev)}
                      aria-label={showPass ? "Hide SMTP password" : "Show SMTP password"}
                      title={showPass ? "Hide" : "Show"}
                    >
                      {showPass ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {smtpErrors.password && (
                    <p style={styles.errorText}>{smtpErrors.password}</p>
                  )}
                </div>

                <div style={styles.clientDivider} />

                <div style={styles.clientFieldGroup}>
                  <div style={styles.clientFieldLabel}>From Email</div>
                  <input
                    type="text"
                    style={styles.clientInput}
                    value={smtpValues.fromEmail}
                    onChange={(e) => setSmtpField("fromEmail", e.target.value)}
                    placeholder="bookings@yourdomain.com"
                  />
                  {smtpErrors.fromEmail && (
                    <p style={styles.errorText}>{smtpErrors.fromEmail}</p>
                  )}
                </div>
              </div>
            </div>

            <TabNavRow
              onBack={goBackTab}
              onNext={goNextTab}
              isFirst={activeTabIndex === 0}
              isLast={activeTabIndex === TAB_ORDER.length - 1}
            />
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};