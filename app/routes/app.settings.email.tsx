import { useEffect, useRef, useState } from "react";
import RichTextEditor, {
  type RichTextEditorHandle,
} from "../components/RichTextEditor";
import { buildPreviewML } from "../utils/emailPreview";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getBookingSettingsML,
  parseEmailFromNameML,
  updateEmailFromNameML,
  parseReminderHoursBeforeML,
  updateReminderHoursBeforeML,
  MIN_REMINDER_HOURS_ML,
  MAX_REMINDER_HOURS_ML,
} from "../models/bookingSettings.server";
import {
  getSmtpSettingsML,
  parseSmtpSettingsFormML,
  toFormValuesML,
  upsertSmtpSettingsML,
  type SmtpSettingsFieldErrors,
  type SmtpSettingsFormValues,
} from "../models/smtpSettings.server";
import {
  listEmailTemplatesML,
  resetEmailTemplateML,
  upsertEmailTemplateML,
  DEFAULT_EMAIL_TEMPLATES_ML,
} from "../models/emailTemplate.server";
import {
  EMAIL_TEMPLATE_TYPES_ML,
  type EmailTemplateType,
} from "../models/emailTemplateTypes";
import {
  stylesML,
  BORDER_ML,
  TEXT_DARK_ML,
  TEXT_MUTED_ML,
  BLUE_ML,
} from "../components/SettingsUI";
import type { RegisterSave } from "./app.settings";

type TemplateRow = Awaited<ReturnType<typeof listEmailTemplatesML>>[number];

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const [smtpSettingsML, templatesML, bookingSettingsML] = await Promise.all([
    getSmtpSettingsML(sessionML.shop),
    listEmailTemplatesML(sessionML.shop),
    getBookingSettingsML(sessionML.shop),
  ]);
  return {
    smtp: toFormValuesML(smtpSettingsML),
    templates: templatesML,
    emailFromName: bookingSettingsML.emailFromName,
    reminderHoursBefore: bookingSettingsML.reminderHoursBefore,
  };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "save");

  if (intentML === "reset-template") {
    const typeML = String(formDataML.get("type") ?? "") as EmailTemplateType;
    if (!EMAIL_TEMPLATE_TYPES_ML.includes(typeML)) {
      return {
        ok: false as const,
        kind: "reset" as const,
        error: "Invalid template type",
      };
    }
    await resetEmailTemplateML(sessionML.shop, typeML);
    const templatesML = await listEmailTemplatesML(sessionML.shop);
    return { ok: true as const, kind: "reset" as const, type: typeML, templates: templatesML };
  }

  const { values: valuesML, errors: smtpErrorsML } = parseSmtpSettingsFormML(formDataML);
  const emailFromNameML = parseEmailFromNameML(formDataML);
  const reminderHoursML = parseReminderHoursBeforeML(formDataML);
  const errorsML: SmtpSettingsFieldErrors & { emailFromName?: string; reminderHoursBefore?: string } = {
    ...smtpErrorsML,
    ...(emailFromNameML.error ? { emailFromName: emailFromNameML.error } : {}),
    ...(reminderHoursML.error ? { reminderHoursBefore: reminderHoursML.error } : {}),
  };
  if (Object.keys(errorsML).length > 0) {
    return {
      ok: false as const,
      kind: "save" as const,
      errors: errorsML,
      values: valuesML,
      emailFromName: emailFromNameML.value,
      reminderHoursBefore: reminderHoursML.value,
    };
  }

  const savedSmtpML = await upsertSmtpSettingsML(sessionML.shop, valuesML);
  await updateEmailFromNameML(sessionML.shop, emailFromNameML.value);
  await updateReminderHoursBeforeML(sessionML.shop, reminderHoursML.value);

  let parsedTemplatesML: { type: string; subject: string; body: string }[] = [];
  try {
    parsedTemplatesML = JSON.parse(String(formDataML.get("templates") ?? "[]"));
  } catch {
    parsedTemplatesML = [];
  }
  for (const itemML of parsedTemplatesML) {
    if (!EMAIL_TEMPLATE_TYPES_ML.includes(itemML.type as EmailTemplateType)) continue;
    const typeML = itemML.type as EmailTemplateType;
    const subjectML = itemML.subject.trim();
    const bodyML = itemML.body.trim();
    if (!subjectML || !bodyML) continue;
    const fallbackML = DEFAULT_EMAIL_TEMPLATES_ML[typeML];
    if (subjectML === fallbackML.subject.trim() && bodyML === fallbackML.body.trim()) {
      continue;
    }
    await upsertEmailTemplateML(sessionML.shop, typeML, subjectML, bodyML);
  }

  const templatesML = await listEmailTemplatesML(sessionML.shop);
  return {
    ok: true as const,
    kind: "save" as const,
    errors: {} as SmtpSettingsFieldErrors & { emailFromName?: string; reminderHoursBefore?: string },
    values: toFormValuesML(savedSmtpML),
    templates: templatesML,
    emailFromName: emailFromNameML.value,
    reminderHoursBefore: reminderHoursML.value,
  };
};

type EditableTemplateValues = Record<
  EmailTemplateType,
  { subject: string; body: string }
>;

function toEditableValuesML(templatesML: TemplateRow[]): EditableTemplateValues {
  const valuesML = {} as EditableTemplateValues;
  for (const tML of templatesML) {
    valuesML[tML.type] = { subject: tML.subject, body: tML.body };
  }
  return valuesML;
}

export default function EmailSettingsTab() {
  const {
    smtp: initialSmtpML,
    templates: initialTemplatesML,
    emailFromName: initialEmailFromNameML,
    reminderHoursBefore: initialReminderHoursML,
  } = useLoaderData<typeof loader>();
  const saveFetcherML = useFetcher<typeof action>();
  const resetFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const { registerSave: registerSaveML } = useOutletContext<{ registerSave: RegisterSave }>();

  const [smtpValuesML, setSmtpValuesML] = useState<SmtpSettingsFormValues>(initialSmtpML);
  const [emailFromNameML, setEmailFromNameML] = useState<string>(initialEmailFromNameML ?? "");
  const [reminderHoursML, setReminderHoursML] = useState<string>(String(initialReminderHoursML));
  const [showPassML, setShowPassML] = useState(false);

  const [templatesML, setTemplatesML] = useState<TemplateRow[]>(initialTemplatesML);
  const [templateValuesML, setTemplateValuesML] = useState<EditableTemplateValues>(() =>
    toEditableValuesML(initialTemplatesML),
  );
  const [editingTypeML, setEditingTypeML] = useState<EmailTemplateType | null>(null);
  const [draftML, setDraftML] = useState<{ subject: string; body: string }>({
    subject: "",
    body: "",
  });
  const popupSaveRef = useRef(false);
  const bodyRefML = useRef<RichTextEditorHandle | null>(null);

  const smtpErrorsML: SmtpSettingsFieldErrors & { emailFromName?: string; reminderHoursBefore?: string } =
    saveFetcherML.data && saveFetcherML.data.kind === "save"
      ? saveFetcherML.data.errors
      : {};
  const isSavingML = saveFetcherML.state !== "idle";
  const isResettingML = resetFetcherML.state !== "idle";

  useEffect(() => {
    if (!saveFetcherML.data) return;
    if (saveFetcherML.data.kind !== "save") return;
    if (saveFetcherML.data.ok) {
      setSmtpValuesML(saveFetcherML.data.values);
      setEmailFromNameML(saveFetcherML.data.emailFromName ?? "");
      setReminderHoursML(String(saveFetcherML.data.reminderHoursBefore));
      setTemplatesML(saveFetcherML.data.templates);
      setTemplateValuesML(toEditableValuesML(saveFetcherML.data.templates));
      shopifyML.toast.show("Settings saved");
      if (popupSaveRef.current) {
        popupSaveRef.current = false;
        setEditingTypeML(null);
      }
    } else {
      popupSaveRef.current = false;
      shopifyML.toast.show("Please fix the highlighted fields", { isError: true });
    }
  }, [saveFetcherML.data, shopifyML]);

  useEffect(() => {
    if (!editingTypeML) return;
    const onKeyDownML = (eML: KeyboardEvent) => {
      if (eML.key === "Escape") setEditingTypeML(null);
    };
    document.addEventListener("keydown", onKeyDownML);
    const prevOverflowML = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDownML);
      document.body.style.overflow = prevOverflowML;
    };
  }, [editingTypeML]);

  useEffect(() => {
    if (resetFetcherML.data?.ok && resetFetcherML.data.kind === "reset") {
      const resetValuesML = toEditableValuesML(resetFetcherML.data.templates);
      const resetTypeML = resetFetcherML.data.type;
      setTemplatesML(resetFetcherML.data.templates);
      if (resetTypeML && resetValuesML[resetTypeML]) {
        setTemplateValuesML((prevML) => ({
          ...prevML,
          [resetTypeML]: resetValuesML[resetTypeML],
        }));
        if (editingTypeML === resetTypeML) {
          setDraftML(resetValuesML[resetTypeML]);
        }
      } else {
        setTemplateValuesML(resetValuesML);
      }
      shopifyML.toast.show("Reverted to default");
    }
  }, [resetFetcherML.data, shopifyML]);

  const setSmtpFieldML = <K extends keyof SmtpSettingsFormValues>(
    keyML: K,
    valueML: SmtpSettingsFormValues[K],
  ) => {
    setSmtpValuesML((prevML) => ({ ...prevML, [keyML]: valueML }));
  };

  const openTemplateEditorML = (typeML: EmailTemplateType) => {
    setDraftML(templateValuesML[typeML] ?? { subject: "", body: "" });
    setEditingTypeML(typeML);
  };

  const closeTemplateEditorML = () => {
    setEditingTypeML(null);
  };

  const insertTokenML = (tokenML: string) => {
    const editorHandleML = bodyRefML.current;
    if (!editorHandleML) {
      setDraftML((prevML) => ({ ...prevML, body: `${prevML.body}${tokenML}` }));
      return;
    }
    editorHandleML.insertText(tokenML);
  };

  const submitSaveML = (valuesByTypeML: EditableTemplateValues) => {
    const templatesPayloadML = EMAIL_TEMPLATE_TYPES_ML.map((typeML) => ({
      type: typeML,
      subject: valuesByTypeML[typeML]?.subject ?? "",
      body: valuesByTypeML[typeML]?.body ?? "",
    }));
    saveFetcherML.submit(
      {
        intent: "save",
        host: smtpValuesML.host,
        port: smtpValuesML.port,
        username: smtpValuesML.username,
        password: smtpValuesML.password,
        fromEmail: smtpValuesML.fromEmail,
        emailFromName: emailFromNameML,
        reminderHoursBefore: reminderHoursML,
        templates: JSON.stringify(templatesPayloadML),
      },
      { method: "POST" },
    );
  };

  const handleSaveML = () => {
    submitSaveML(templateValuesML);
  };

  const handleSaveTemplateML = () => {
    if (!editingTypeML) return;
    const nextValuesML = { ...templateValuesML, [editingTypeML]: draftML };
    setTemplateValuesML(nextValuesML);
    popupSaveRef.current = true;
    submitSaveML(nextValuesML);
  };

  const handleResetTemplateML = (typeML: EmailTemplateType) => {
    resetFetcherML.submit({ intent: "reset-template", type: typeML }, { method: "POST" });
  };

  useEffect(() => {
    registerSaveML(handleSaveML, isSavingML);
    return () => registerSaveML(null, false);
  }, [registerSaveML, smtpValuesML, emailFromNameML, reminderHoursML, templateValuesML, isSavingML]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={stylesML.clientCard}>
        <div style={stylesML.clientCardBody}>
          <div style={stylesML.clientCardHeader}>
            <div style={stylesML.clientCardTitle}>Email (SMTP) Settings</div>
            <div style={stylesML.subLabel}>
              Used to send automated emails for reminders, booking confirmations, rescheduling updates, cancellations, and other booking-related notifications.
            </div>
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>SMTP Host</div>
            <input
              type="text"
              style={stylesML.clientInput}
              value={smtpValuesML.host}
              onChange={(eML) => setSmtpFieldML("host", eML.target.value)}
              placeholder="smtp.example.com"
            />
            {smtpErrorsML.host && <p style={stylesML.errorText}>{smtpErrorsML.host}</p>}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>SMTP Port</div>
            <input
              type="text"
              style={stylesML.clientInput}
              value={smtpValuesML.port}
              onChange={(eML) => setSmtpFieldML("port", eML.target.value)}
              placeholder="587"
            />
            {smtpErrorsML.port && <p style={stylesML.errorText}>{smtpErrorsML.port}</p>}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>SMTP Username</div>
            <input
              type="text"
              style={stylesML.clientInput}
              value={smtpValuesML.username}
              onChange={(eML) => setSmtpFieldML("username", eML.target.value)}
              placeholder="Enter SMTP username"
            />
            {smtpErrorsML.username && (
              <p style={stylesML.errorText}>{smtpErrorsML.username}</p>
            )}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>SMTP Password</div>
            <div style={stylesML.secretInputWrap}>
              <input
                type={showPassML ? "text" : "password"}
                autoComplete="off"
                style={stylesML.secretInput}
                value={smtpValuesML.password}
                onChange={(eML) => setSmtpFieldML("password", eML.target.value)}
                placeholder="Enter SMTP password"
              />
              <button
                type="button"
                style={stylesML.secretToggleButton}
                onClick={() => setShowPassML((prevML) => !prevML)}
                aria-label={showPassML ? "Hide SMTP password" : "Show SMTP password"}
                title={showPassML ? "Hide" : "Show"}
              >
                <img src="/eye-icon.svg" width={22} height={20} alt="" />
              </button>
            </div>
            {smtpErrorsML.password && (
              <p style={stylesML.errorText}>{smtpErrorsML.password}</p>
            )}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>From Email</div>
            <input
              type="text"
              style={stylesML.clientInput}
              value={smtpValuesML.fromEmail}
              onChange={(eML) => setSmtpFieldML("fromEmail", eML.target.value)}
              placeholder="bookings@yourdomain.com"
            />
            {smtpErrorsML.fromEmail && (
              <p style={stylesML.errorText}>{smtpErrorsML.fromEmail}</p>
            )}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>Sender Name</div>
            <input
              type="text"
              style={stylesML.clientInput}
              value={emailFromNameML}
              onChange={(eML) => setEmailFromNameML(eML.target.value)}
              placeholder="Bookings"
            />
            <div style={stylesML.subLabel}>
              The display name customers see on booking confirmation,
              reminder, and cancellation emails — e.g. &quot;Milople Bookings
              &lt;bookings@yourdomain.com&gt;&quot;.
            </div>
            {smtpErrorsML.emailFromName && (
              <p style={stylesML.errorText}>{smtpErrorsML.emailFromName}</p>
            )}
          </div>

          <div style={stylesML.clientDivider} />

          <div style={stylesML.clientFieldGroup}>
            <div style={stylesML.clientFieldLabel}>Send Reminder Email (hours before booking)</div>
            <input
              type="number"
              min={MIN_REMINDER_HOURS_ML}
              max={MAX_REMINDER_HOURS_ML}
              step={1}
              style={stylesML.clientInput}
              value={reminderHoursML}
              onChange={(eML) => setReminderHoursML(eML.target.value)}
              placeholder="24"
            />
            <div style={stylesML.subLabel}>
              How many hours before the booking start time the reminder email is
              sent to the customer — e.g. 24 sends it one day before.
            </div>
            {smtpErrorsML.reminderHoursBefore && (
              <p style={stylesML.errorText}>{smtpErrorsML.reminderHoursBefore}</p>
            )}
          </div>
        </div>
      </div>

      <div style={stylesML.clientCard}>
        <div style={stylesML.clientCardBody}>
          <div style={stylesML.clientCardHeader}>
            <div style={stylesML.clientCardTitle}>Email Templates</div>
            <div style={stylesML.subLabel}>
              Customize the subject and content of the automated emails your customers
              receive. Use the tokens below to insert booking details — they'll be
              filled in automatically when the email is sent.
            </div>
          </div>

          {templatesML.map((templateML, indexML) => (
            <div key={templateML.type}>
              {indexML > 0 && <div style={stylesML.clientDivider} />}
              <div style={templateRowStyleML}>
                <div>
                  <div style={stylesML.label}>
                    {templateML.label}
                    {templateML.isCustomized && (
                      <span style={customizedPillStyleML}>Customized</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  style={editIconButtonStyleML}
                  onClick={() => openTemplateEditorML(templateML.type)}
                  aria-label={`Edit ${templateML.label}`}
                >
                  <img src="/edit-icon.svg" width={44} height={40} alt="" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTypeML && (() => {
        const editingTemplateML = templatesML.find((tML) => tML.type === editingTypeML);
        if (!editingTemplateML) return null;
        return (
          <div role="presentation" style={popupBackdropStyleML}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Edit ${editingTemplateML.label}`}
              style={{
                ...popupBoxStyleML,
                width: "min(1000px, 100%)",
              }}
            >
              <div style={popupHeaderStyleML}>
                <div>
                  <div style={stylesML.clientCardTitle}>{editingTemplateML.label}</div>
                  <div style={stylesML.subLabel}>{editingTemplateML.description}</div>
                </div>
                <button
                  type="button"
                  style={popupCloseStyleML}
                  aria-label="Close"
                  onClick={closeTemplateEditorML}
                >
                  <span style={{ fontSize: "24px", lineHeight: "20px", color: "#000000" }}>
                    &times;
                  </span>
                </button>
              </div>
              <div style={stylesML.clientDivider} />

              <div style={stylesML.clientFieldGroup}>
                <div style={stylesML.clientFieldLabel}>Subject</div>
                <input
                  type="text"
                  style={stylesML.clientInput}
                  value={draftML.subject}
                  onChange={(eML) =>
                    setDraftML((prevML) => ({ ...prevML, subject: eML.target.value }))
                  }
                />
              </div>

              <div className="eb-email-row" style={editorPreviewRowStyleML}>
                <div className="eb-email-col" style={editorColumnStyleML}>
                  <div style={editorFieldGroupStyleML}>
                    <div style={stylesML.clientFieldLabel}>Email Body</div>
                    <RichTextEditor
                      ref={bodyRefML}
                      value={draftML.body}
                      onChange={(htmlML) =>
                        setDraftML((prevML) => ({ ...prevML, body: htmlML }))
                      }
                      footer={editingTemplateML.placeholders.map((pML) => (
                        <button
                          key={pML.token}
                          type="button"
                          title={pML.description}
                          onClick={() => insertTokenML(pML.token)}
                          style={tokenPillStyleML}
                        >
                          {pML.token}
                        </button>
                      ))}
                    />
                  </div>
                </div>

                <div className="eb-email-col eb-email-preview" style={previewColumnStyleML}>
                  <div style={hiddenLabelSpacerStyleML} aria-hidden="true">
                    Email Body
                  </div>
                  <EmailPreview
                    type={editingTemplateML.type}
                    subject={draftML.subject}
                    body={draftML.body}
                  />
                </div>
              </div>

              <div style={popupFooterStyleML}>
                <button
                  type="button"
                  onClick={() => handleResetTemplateML(editingTemplateML.type)}
                  disabled={!editingTemplateML.isCustomized || isResettingML}
                  style={resetButtonStyleML(!editingTemplateML.isCustomized || isResettingML)}
                >
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateML}
                  disabled={isSavingML}
                  style={popupSaveButtonStyleML(isSavingML)}
                >
                  {isSavingML ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function EmailPreview({
  type: typeML,
  subject: subjectML,
  body: bodyML,
}: {
  type: EmailTemplateType;
  subject: string;
  body: string;
}) {
  const previewML = buildPreviewML(typeML, subjectML, bodyML);
  return (
    <div style={previewWrapStyleML}>
      <div style={previewNoteStyleML}>
        Preview with sample data &mdash; this is what the customer will see.
      </div>
      <div style={previewSubjectStyleML}>{previewML.subject}</div>
      <div
        style={previewBodyStyleML}
        dangerouslySetInnerHTML={{ __html: previewML.html }}
      />
    </div>
  );
}

const templateRowStyleML: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "6px 0",
};

const editIconButtonStyleML: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "10px",
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: "4px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const popupBackdropStyleML: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  boxSizing: "border-box",
};

const popupBoxStyleML: React.CSSProperties = {
  boxSizing: "border-box",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#FFFFFF",
  borderRadius: "8px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  fontFamily: "Inter",
};

const popupHeaderStyleML: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const popupCloseStyleML: React.CSSProperties = {
  width: "20px",
  height: "20px",
  minWidth: "20px",
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const popupFooterStyleML: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  gap: "12px",
  width: "calc(100% + 32px)",
  margin: "0 -16px -16px",
  padding: "14px 16px",
  boxSizing: "border-box",
  background: "#F4F8FB",
  borderTop: "1px solid #E3E8EE",
  borderRadius: "0 0 8px 8px",
};

function popupSaveButtonStyleML(disabledML: boolean): React.CSSProperties {
  return {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: BLUE_ML,
    color: "#FFFFFF",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    cursor: disabledML ? "not-allowed" : "pointer",
    opacity: disabledML ? 0.6 : 1,
    whiteSpace: "nowrap",
  };
}

const editorPreviewRowStyleML: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "stretch",
  gap: "16px",
};

const editorColumnStyleML: React.CSSProperties = {
  flex: "1 1 320px",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};

const editorFieldGroupStyleML: React.CSSProperties = {
  ...stylesML.clientFieldGroup,
  flex: 1,
};

const previewColumnStyleML: React.CSSProperties = {
  flex: "1 1 320px",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const hiddenLabelSpacerStyleML: React.CSSProperties = {
  ...stylesML.clientFieldLabel,
  visibility: "hidden",
  height: "17px",
  lineHeight: "17px",
};

const previewWrapStyleML: React.CSSProperties = {
  border: `1px solid ${BORDER_ML}`,
  borderRadius: "6px",
  overflow: "hidden",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const previewNoteStyleML: React.CSSProperties = {
  padding: "6px 12px",
  fontFamily: "Inter",
  fontSize: "11px",
  color: TEXT_MUTED_ML,
  background: "#F5F6F7",
  borderBottom: `1px solid ${BORDER_ML}`,
};

const previewSubjectStyleML: React.CSSProperties = {
  padding: "10px 12px",
  fontFamily: "Inter",
  fontWeight: 600,
  fontSize: "14px",
  color: TEXT_DARK_ML,
  borderBottom: `1px solid ${BORDER_ML}`,
};

const previewBodyStyleML: React.CSSProperties = {
  padding: "12px",
  fontFamily: "Inter",
  fontSize: "14px",
  color: TEXT_DARK_ML,
  lineHeight: 1.5,
  flex: 1,
};

const customizedPillStyleML: React.CSSProperties = {
  marginLeft: "8px",
  padding: "1px 8px",
  borderRadius: "999px",
  background: "#EAF1FB",
  color: BLUE_ML,
  fontFamily: "Inter",
  fontWeight: 500,
  fontSize: "11px",
  verticalAlign: "middle",
};

const tokenPillStyleML: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "999px",
  border: `1px solid ${BORDER_ML}`,
  background: "#F5F6F7",
  color: TEXT_MUTED_ML,
  fontFamily: "Inter",
  fontSize: "12px",
  cursor: "pointer",
};

function resetButtonStyleML(disabledML: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${BORDER_ML}`,
    background: disabledML ? "#F5F5F5" : "#fff",
    color: disabledML ? "#A6A6A6" : BLUE_ML,
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "12px",
    cursor: disabledML ? "default" : "pointer",
    whiteSpace: "nowrap",
  };
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};