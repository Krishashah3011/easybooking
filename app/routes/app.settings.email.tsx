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
  ChevronDownIcon,
  collapsibleHeaderStyleML,
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
    return { ok: true as const, kind: "reset" as const, templates: templatesML };
  }

  const { values: valuesML, errors: smtpErrorsML } = parseSmtpSettingsFormML(formDataML);
  const emailFromNameML = parseEmailFromNameML(formDataML);
  const errorsML: SmtpSettingsFieldErrors & { emailFromName?: string } = {
    ...smtpErrorsML,
    ...(emailFromNameML.error ? { emailFromName: emailFromNameML.error } : {}),
  };
  if (Object.keys(errorsML).length > 0) {
    return {
      ok: false as const,
      kind: "save" as const,
      errors: errorsML,
      values: valuesML,
      emailFromName: emailFromNameML.value,
    };
  }

  const savedSmtpML = await upsertSmtpSettingsML(sessionML.shop, valuesML);
  await updateEmailFromNameML(sessionML.shop, emailFromNameML.value);

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
    errors: {} as SmtpSettingsFieldErrors & { emailFromName?: string },
    values: toFormValuesML(savedSmtpML),
    templates: templatesML,
    emailFromName: emailFromNameML.value,
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
  } = useLoaderData<typeof loader>();
  const saveFetcherML = useFetcher<typeof action>();
  const resetFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const { registerSave: registerSaveML } = useOutletContext<{ registerSave: RegisterSave }>();

  const [smtpValuesML, setSmtpValuesML] = useState<SmtpSettingsFormValues>(initialSmtpML);
  const [emailFromNameML, setEmailFromNameML] = useState<string>(initialEmailFromNameML ?? "");
  const [showPassML, setShowPassML] = useState(false);

  const [templatesML, setTemplatesML] = useState<TemplateRow[]>(initialTemplatesML);
  const [templateValuesML, setTemplateValuesML] = useState<EditableTemplateValues>(() =>
    toEditableValuesML(initialTemplatesML),
  );
  const [previewOpenML, setPreviewOpenML] = useState<Record<string, boolean>>({});
  const [openTemplatesML, setOpenTemplatesML] = useState<Record<string, boolean>>({});
  const bodyRefsML = useRef<Record<string, RichTextEditorHandle | null>>({});

  const smtpErrorsML: SmtpSettingsFieldErrors & { emailFromName?: string } =
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
      setTemplatesML(saveFetcherML.data.templates);
      setTemplateValuesML(toEditableValuesML(saveFetcherML.data.templates));
      shopifyML.toast.show("Settings saved");
    } else {
      shopifyML.toast.show("Please fix the highlighted fields", { isError: true });
    }
  }, [saveFetcherML.data, shopifyML]);

  useEffect(() => {
    if (resetFetcherML.data?.ok && resetFetcherML.data.kind === "reset") {
      setTemplatesML(resetFetcherML.data.templates);
      setTemplateValuesML(toEditableValuesML(resetFetcherML.data.templates));
      shopifyML.toast.show("Reverted to default");
    }
  }, [resetFetcherML.data, shopifyML]);

  const setSmtpFieldML = <K extends keyof SmtpSettingsFormValues>(
    keyML: K,
    valueML: SmtpSettingsFormValues[K],
  ) => {
    setSmtpValuesML((prevML) => ({ ...prevML, [keyML]: valueML }));
  };

  const setTemplateFieldML = (
    typeML: EmailTemplateType,
    fieldML: "subject" | "body",
    valueML: string,
  ) => {
    setTemplateValuesML((prevML) => ({
      ...prevML,
      [typeML]: { ...prevML[typeML], [fieldML]: valueML },
    }));
  };

  const insertTokenML = (typeML: EmailTemplateType, tokenML: string) => {
    const editorHandleML = bodyRefsML.current[typeML];
    if (!editorHandleML) {
      const currentML = templateValuesML[typeML]?.body ?? "";
      setTemplateFieldML(typeML, "body", `${currentML}${tokenML}`);
      return;
    }
    editorHandleML.insertText(tokenML);
  };

  const togglePreviewML = (typeML: EmailTemplateType) => {
    setPreviewOpenML((prevML) => ({ ...prevML, [typeML]: !prevML[typeML] }));
  };

  const toggleTemplateOpenML = (typeML: EmailTemplateType) => {
    setOpenTemplatesML((prevML) => ({ ...prevML, [typeML]: !prevML[typeML] }));
  };

  const handleSaveML = () => {
    const templatesPayloadML = EMAIL_TEMPLATE_TYPES_ML.map((typeML) => ({
      type: typeML,
      subject: templateValuesML[typeML]?.subject ?? "",
      body: templateValuesML[typeML]?.body ?? "",
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
        templates: JSON.stringify(templatesPayloadML),
      },
      { method: "POST" },
    );
  };

  const handleResetTemplateML = (typeML: EmailTemplateType) => {
    resetFetcherML.submit({ intent: "reset-template", type: typeML }, { method: "POST" });
  };

  useEffect(() => {
    registerSaveML(handleSaveML, isSavingML);
    return () => registerSaveML(null, false);
  }, [registerSaveML, smtpValuesML, emailFromNameML, templateValuesML, isSavingML]);

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

          {templatesML.map((templateML, indexML) => {
            const editableML = templateValuesML[templateML.type] ?? { subject: "", body: "" };
            const isOpenML = !!openTemplatesML[templateML.type];
            return (
              <div key={templateML.type}>
                {indexML > 0 && <div style={stylesML.clientDivider} />}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "6px 0" }}>
                  <div
                    style={{ ...collapsibleHeaderStyleML(), alignItems: "flex-start" }}
                    onClick={() => toggleTemplateOpenML(templateML.type)}
                    onKeyDown={(eML) => {
                      if (eML.key === "Enter" || eML.key === " ") {
                        eML.preventDefault();
                        toggleTemplateOpenML(templateML.type);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpenML}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div>
                        <div style={stylesML.label}>
                          {templateML.label}
                          {templateML.isCustomized && (
                            <span style={customizedPillStyleML}>Customized</span>
                          )}
                        </div>
                        <div style={stylesML.subLabel}>{templateML.description}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <ChevronDownIcon open={isOpenML} />
                    </div>
                  </div>

                  {isOpenML && (
                    <>
                      <div style={subjectRowStyleML}>
                        <div style={subjectFieldGroupStyleML}>
                          <div style={stylesML.clientFieldLabel}>Subject</div>
                          <input
                            type="text"
                            style={stylesML.clientInput}
                            value={editableML.subject}
                            onChange={(eML) => setTemplateFieldML(templateML.type, "subject", eML.target.value)}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => togglePreviewML(templateML.type)}
                            style={resetButtonStyleML(false)}
                          >
                            {previewOpenML[templateML.type] ? "Hide preview" : "Preview"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetTemplateML(templateML.type)}
                            disabled={!templateML.isCustomized || isResettingML}
                            style={resetButtonStyleML(!templateML.isCustomized || isResettingML)}
                          >
                            Reset to default
                          </button>
                        </div>
                      </div>

                      <div className="eb-email-row" style={editorPreviewRowStyleML}>
                        <div className="eb-email-col" style={editorColumnStyleML}>
                          <div style={editorFieldGroupStyleML}>
                            <div style={stylesML.clientFieldLabel}>Email Body</div>
                            <RichTextEditor
                              ref={(elML) => {
                                bodyRefsML.current[templateML.type] = elML;
                              }}
                              value={editableML.body}
                              onChange={(htmlML) => setTemplateFieldML(templateML.type, "body", htmlML)}
                              footer={templateML.placeholders.map((pML) => (
                                <button
                                  key={pML.token}
                                  type="button"
                                  title={pML.description}
                                  onClick={() => insertTokenML(templateML.type, pML.token)}
                                  style={tokenPillStyleML}
                                >
                                  {pML.token}
                                </button>
                              ))}
                            />
                          </div>
                        </div>

                        {previewOpenML[templateML.type] && (
                          <div className="eb-email-col eb-email-preview" style={previewColumnStyleML}>
                            <div style={hiddenLabelSpacerStyleML} aria-hidden="true">
                              Email Body
                            </div>
                            <EmailPreview type={templateML.type} subject={editableML.subject} body={editableML.body} />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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

const subjectRowStyleML: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: "12px 16px",
};

const subjectFieldGroupStyleML: React.CSSProperties = {
  ...stylesML.clientFieldGroup,
  flex: "1 1 260px",
  minWidth: 0,
};

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
  fontFamily: "monospace",
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