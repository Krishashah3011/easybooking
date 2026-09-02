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
import {
  getSmtpSettings,
  parseSmtpSettingsForm,
  toFormValues,
  upsertSmtpSettings,
  type SmtpSettingsFieldErrors,
  type SmtpSettingsFormValues,
} from "../models/smtpSettings.server";
import {
  styles,
  saveWrapperStyle,
  saveButtonStyle,
  EyeIcon,
  EyeOffIcon,
} from "../components/SettingsUI";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const smtpSettings = await getSmtpSettings(session.shop);
  return { smtp: toFormValues(smtpSettings) };
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

export default function SmtpSettingsTab() {
  const { smtp: initialSmtp } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

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
    <div style={styles.innerCard}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={saveWrapperStyle()}>
          <button style={saveButtonStyle(isSaving)} disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

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
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
