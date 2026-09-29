import { useState, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prismaML from "../db.server";
import rowStyles from "../styles/app.account.module.css";

const BLUE_ML = "#073E74";

const isValidEmailML = (valueML: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueML);

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);

  let settingsML = await prismaML.shopSettings.findUnique({
    where: { shop: sessionML.shop },
  });

  if (!settingsML) {
    settingsML = await prismaML.shopSettings.create({
      data: { shop: sessionML.shop },
    });
  }

  return {
    shop: sessionML.shop,
    registered: settingsML.registered,
    username: settingsML.username || "",
    accountEmail: settingsML.accountEmail || "",
    plan: settingsML.plan || "",
    subscriptionId: settingsML.subscriptionId || "",
  };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = formDataML.get("intent");

  if (intentML === "delete") {
    const updatedML = await prismaML.shopSettings.update({
      where: { shop: sessionML.shop },
      data: { username: "", accountEmail: "", registered: false },
    });
    return { updated: updatedML, deleted: true };
  }

  if (intentML === "register") {
    const usernameML = (formDataML.get("username") || "").toString().trim();
    const accountEmailML = (formDataML.get("accountEmail") || "")
      .toString()
      .trim();

    if (!usernameML || !accountEmailML) {
      return { error: "Username and email are required" };
    }

    if (!isValidEmailML(accountEmailML)) {
      return { error: "Please enter a valid email address" };
    }

    const updatedML = await prismaML.shopSettings.update({
      where: { shop: sessionML.shop },
      data: {
        username: usernameML,
        accountEmail: accountEmailML,
        registered: true,
      },
    });
    return { updated: updatedML, registered: true };
  }

  const fieldML = formDataML.get("field");
  const valueML = (formDataML.get("value") || "").toString();

  if (fieldML !== "username" && fieldML !== "accountEmail") {
    return { error: "Invalid field" };
  }

  const updatedML = await prismaML.shopSettings.update({
    where: { shop: sessionML.shop },
    data: { [fieldML]: valueML },
  });

  return { updated: updatedML };
};

function PersonIcon() {
  return <img src="/name.svg" width={20} height={22} alt="" />;
}

function MailIcon() {
  return <img src="/mail.svg" width={22} height={20} alt="" />;
}

function ShopIcon() {
  return <img src="/shop.svg" width={20} height={21} alt="" />;
}

function PencilIcon() {
  return <img src="/pencil.svg" width={16} height={16} alt="" />;
}

const stylesML: Record<string, React.CSSProperties> = {
  outerCard: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "8px",
    padding: "15px",
    marginTop: "-16px",
  },
  heading: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#000",
    marginBottom: "20px",
    letterSpacing: "0.36px",
  },
  fieldsBox: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "8px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  fieldGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#000",
  },
  inputBox: {
    background: "#fff",
    border: "1px solid #e9e9ea",
    borderRadius: "4px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 10px",
  },
  value: {
    flex: 1,
    fontSize: "14px",
    color: "#000",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
  },
  editBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  deleteWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: "24px",
  },
  deleteOuter: {
    background: "linear-gradient(to bottom, #b8b8b8, #e1e1e1)",
    padding: "2px",
    borderRadius: "8px",
    width: "150px",
  },
  deleteInner: {
    background: "linear-gradient(to bottom, #ffffff, #b5b5b5)",
    border: "1px solid #b3b3b3",
    borderRadius: "6px",
    padding: "7px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  deleteText: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#000",
    border: "none",
    background: "none",
    cursor: "pointer",
  },
  registerHeading: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#000",
    marginBottom: "20px",
  },
  registerBox: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "8px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  registerRow: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  registerFieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  registerLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#000",
  },
  registerInputBox: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "8px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 14px",
  },
  registerInput: {
    flex: 1,
    fontSize: "14px",
    color: "#000",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
  },
  registerButtonWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: "4px",
  },
  registerButton: {
    background: BLUE_ML,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 32px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  registerError: {
    fontFamily: "Inter",
    fontSize: "12px",
    color: "#C0392B",
    margin: 0,
  },
  registerFieldError: {
    fontFamily: "Inter",
    fontSize: "12px",
    color: "#C0392B",
    margin: 0,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    background: "#fff",
    borderRadius: "8px",
    width: "700px",
    maxWidth: "90vw",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #e5e5e5",
  },
  modalTitle: {
    fontFamily: "Inter",
    fontSize: "18px",
    fontWeight: 700,
    color: "#000",
    margin: 0,
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: BLUE_ML,
  },
  modalBody: {
    padding: "24px",
    borderBottom: "1px solid #e5e5e5",
  },
  modalBodyText: {
    fontFamily: "Inter",
    fontSize: "14px",
    lineHeight: "20px",
    color: "#333",
    margin: 0,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 24px",
  },
  modalCancelBtn: {
    fontFamily: "Inter",
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "6px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#000",
    cursor: "pointer",
  },
  modalDeleteBtn: {
    fontFamily: "Inter",
    background: "#D9401F",
    border: "none",
    borderRadius: "6px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
  },
};

function EditableField({
  icon: iconML,
  label: labelML,
  value: valueML,
  field: fieldML,
  onSave: onSaveML,
  saving: savingML,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  saving: boolean;
}) {
  const [editingML, setEditingML] = useState(false);
  const [draftML, setDraftML] = useState(valueML);

  useEffect(() => {
    setDraftML(valueML);
  }, [valueML]);

  const commitML = () => {
    setEditingML(false);
    if (draftML !== valueML) {
      onSaveML(fieldML, draftML);
    }
  };

  return (
    <div style={stylesML.fieldGroup}>
      <span style={stylesML.label}>{labelML}</span>
      <div style={stylesML.inputBox}>
        {iconML}
        {editingML ? (
          <input
            style={stylesML.value}
            value={draftML}
            autoFocus
            disabled={savingML}
            onChange={(eML) => setDraftML(eML.target.value)}
            onBlur={commitML}
            onKeyDown={(eML) => {
              if (eML.key === "Enter") commitML();
              if (eML.key === "Escape") {
                setDraftML(valueML);
                setEditingML(false);
              }
            }}
          />
        ) : (
          <span style={stylesML.value}>{valueML || "—"}</span>
        )}
        <button
          type="button"
          style={stylesML.editBtn}
          onClick={() => setEditingML(true)}
          title={`Edit ${labelML}`}
        >
          <PencilIcon />
        </button>
      </div>
    </div>
  );
}

function CreateAccountForm({
  fetcher: fetcherML,
  saving: savingML,
}: {
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
  saving: boolean;
}) {
  const [usernameDraftML, setUsernameDraftML] = useState("");
  const [emailDraftML, setEmailDraftML] = useState("");
  const [usernameErrorML, setUsernameErrorML] = useState("");
  const [emailErrorML, setEmailErrorML] = useState("");

  const errorML =
    fetcherML.data && "error" in fetcherML.data ? fetcherML.data.error : undefined;

  const handleSubmitML = (eML: React.FormEvent) => {
    eML.preventDefault();

    const usernameEmptyML = !usernameDraftML.trim();
    const emailEmptyML = !emailDraftML.trim();
    const emailInvalidML =
      !emailEmptyML && !isValidEmailML(emailDraftML.trim());

    setUsernameErrorML(usernameEmptyML ? "Username is required" : "");
    setEmailErrorML(
      emailEmptyML
        ? "Email is required"
        : emailInvalidML
          ? "Please enter a valid email address"
          : "",
    );

    if (usernameEmptyML || emailEmptyML || emailInvalidML) return;

    fetcherML.submit(
      { intent: "register", username: usernameDraftML, accountEmail: emailDraftML },
      { method: "POST" },
    );
  };

  return (
    <div style={stylesML.outerCard}>
      <div style={stylesML.registerHeading}>Create Account</div>

      <form onSubmit={handleSubmitML} noValidate>
        <div style={stylesML.registerBox}>
          <div style={stylesML.registerRow}>
            <div style={stylesML.registerFieldGroup}>
              <span style={stylesML.registerLabel}>Username</span>
              <div
                style={{
                  ...stylesML.registerInputBox,
                  ...(usernameErrorML ? { border: "1px solid #C0392B" } : {}),
                }}
              >
                <PersonIcon />
                <input
                  style={stylesML.registerInput}
                  placeholder="Enter username"
                  value={usernameDraftML}
                  disabled={savingML}
                  onChange={(eML) => {
                    setUsernameDraftML(eML.target.value);
                    if (usernameErrorML) setUsernameErrorML("");
                  }}
                />
              </div>
              {usernameErrorML && <p style={stylesML.registerFieldError}>{usernameErrorML}</p>}
            </div>

            <div style={stylesML.registerFieldGroup}>
              <span style={stylesML.registerLabel}>Email</span>
              <div
                style={{
                  ...stylesML.registerInputBox,
                  ...(emailErrorML ? { border: "1px solid #C0392B" } : {}),
                }}
              >
                <MailIcon />
                <input
                  style={stylesML.registerInput}
                  type="email"
                  placeholder="Enter email"
                  value={emailDraftML}
                  disabled={savingML}
                  onChange={(eML) => {
                    setEmailDraftML(eML.target.value);
                    if (emailErrorML) setEmailErrorML("");
                  }}
                  onBlur={(eML) => {
                    const valueML = eML.target.value.trim();
                    if (!valueML) return;
                    setEmailErrorML(
                      isValidEmailML(valueML)
                        ? ""
                        : "Please enter a valid email address",
                    );
                  }}
                />
              </div>
              {emailErrorML && <p style={stylesML.registerFieldError}>{emailErrorML}</p>}
            </div>
          </div>

          {errorML && <p style={stylesML.registerError}>{errorML}</p>}

          <div style={stylesML.registerButtonWrap}>
            <button type="submit" style={stylesML.registerButton} disabled={savingML}>
              {savingML ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function DeleteAccountModal({
  onCancel: onCancelML,
  onConfirm: onConfirmML,
  deleting: deletingML,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div style={stylesML.modalOverlay} onClick={onCancelML}>
      <div style={stylesML.modalCard} onClick={(eML) => eML.stopPropagation()}>
        <div style={stylesML.modalHeader}>
          <h2 style={stylesML.modalTitle}>Delete Account</h2>
          <button
            type="button"
            style={stylesML.modalCloseBtn}
            onClick={onCancelML}
            aria-label="Close"
          >
            <img src="/cross.svg" width={36} height={36} alt="" aria-hidden="true" style={{ display: "block", margin: -9 }} />
          </button>
        </div>

        <div style={stylesML.modalBody}>
          <p style={stylesML.modalBodyText}>
            Are you sure you want to delete your account? This will remove
            all associated data and cannot be
            <br />
            undone.
          </p>
        </div>

        <div style={stylesML.modalFooter}>
          <button type="button" style={stylesML.modalCancelBtn} onClick={onCancelML} disabled={deletingML}>
            Cancel
          </button>
          <button type="button" style={stylesML.modalDeleteBtn} onClick={onConfirmML} disabled={deletingML}>
            {deletingML ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const {
    shop: shopML,
    registered: registeredML,
    username: usernameML,
    accountEmail: accountEmailML,
    plan: planML,
    subscriptionId: subscriptionIdML,
  } = useLoaderData<typeof loader>();
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();

  const savingML = fetcherML.state !== "idle";
  const [showDeleteModalML, setShowDeleteModalML] = useState(false);

  useEffect(() => {
    if (fetcherML.data && "registered" in fetcherML.data && fetcherML.data.registered) {
      shopifyML.toast.show("Account created");
    } else if (
      fetcherML.data &&
      "updated" in fetcherML.data &&
      fetcherML.data.updated &&
      !("deleted" in fetcherML.data && fetcherML.data.deleted)
    ) {
      shopifyML.toast.show("Saved");
    }
    if (fetcherML.data && "deleted" in fetcherML.data && fetcherML.data.deleted) {
      shopifyML.toast.show("Account info cleared");
      setShowDeleteModalML(false);
    }
  }, [fetcherML.data, shopifyML]);

  const handleSaveML = (fieldML: string, valueML: string) => {
    fetcherML.submit({ field: fieldML, value: valueML }, { method: "POST" });
  };

  const handleConfirmDeleteML = () => {
    fetcherML.submit({ intent: "delete" }, { method: "POST" });
  };

  if (!registeredML) {
    return (
      <s-page heading="Booking and Reservation" inlineSize="950px" style={{ fontFamily: "Inter" }}>
        <div style={{ maxWidth: "982px", margin: "0 auto" }}>
          <CreateAccountForm fetcher={fetcherML} saving={savingML} />
        </div>
      </s-page>
    );
  }

  return (
    <s-page heading="Booking and Reservation" inlineSize="950px" style={{ fontFamily: "Inter" }}>
      <div style={{ maxWidth: "982px", margin: "0 auto" }}>
      <div style={stylesML.outerCard}>
        <div style={stylesML.heading}>Account Information</div>

        <div style={stylesML.fieldsBox}>
          <div className={rowStyles.row}>
            <EditableField
              icon={<PersonIcon />}
              label="Username"
              value={usernameML}
              field="username"
              onSave={handleSaveML}
              saving={savingML}
            />
            <EditableField
              icon={<MailIcon />}
              label="Email"
              value={accountEmailML}
              field="accountEmail"
              onSave={handleSaveML}
              saving={savingML}
            />
          </div>

          <div className={rowStyles.row}>
            <div style={stylesML.fieldGroup}>
              <span style={stylesML.label}>Shop</span>
              <div style={stylesML.inputBox}>
                <ShopIcon />
                <span style={stylesML.value}>{shopML}</span>
              </div>
            </div>

            <div style={stylesML.fieldGroup}>
              <span style={stylesML.label}>Plan</span>
              <div style={stylesML.inputBox}>
                <img src="/plan.svg" width={20} height={20} alt="" />

                <span style={stylesML.value}>{planML || "—"}</span>
              </div>
            </div>
          </div>

          <div className={rowStyles.row}>
            <div style={stylesML.fieldGroup}>
              <span style={stylesML.label}>Subscription ID</span>
              <div style={stylesML.inputBox}>
                <img src="/subsid.svg" width={20} height={21} alt="" />

                <span style={stylesML.value}>{subscriptionIdML || "—"}</span>
              </div>
            </div>

            <div style={{ flex: 1 }} />
          </div>

          <div style={stylesML.deleteWrap}>
            <div style={stylesML.deleteOuter}>
              <div style={stylesML.deleteInner} onClick={() => setShowDeleteModalML(true)}>
                <span style={stylesML.deleteText}>Delete Account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {showDeleteModalML && (
        <DeleteAccountModal
          onCancel={() => setShowDeleteModalML(false)}
          onConfirm={handleConfirmDeleteML}
          deleting={savingML}
        />
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};