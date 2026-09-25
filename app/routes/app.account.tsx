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
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.75024 8.75C10.9594 8.75 12.7502 6.95914 12.7502 4.75C12.7502 2.54086 10.9594 0.75 8.75024 0.75C6.54111 0.75 4.75024 2.54086 4.75024 4.75C4.75024 6.95914 6.54111 8.75 8.75024 8.75Z" stroke={BLUE_ML} strokeWidth="1.5"/>
      <path d="M16.7482 16.75C16.7496 16.586 16.7502 16.4193 16.7502 16.25C16.7502 13.765 13.1682 11.75 8.75024 11.75C4.33224 11.75 0.750244 13.765 0.750244 16.25C0.750244 18.735 0.750244 20.75 8.75024 20.75C10.9812 20.75 12.5902 20.593 13.7502 20.313" stroke={BLUE_ML} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.507 0.75H3.99349C2.20229 0.75 0.750244 2.20205 0.750244 3.99324V14.2635C0.750244 16.0547 2.20229 17.5068 3.99349 17.5068H17.507C19.2982 17.5068 20.7502 16.0547 20.7502 14.2635V3.99324C20.7502 2.20205 19.2982 0.75 17.507 0.75Z" stroke={BLUE_ML} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M0.750244 4.80405L9.84754 8.98351C10.1307 9.1136 10.4386 9.18096 10.7502 9.18096C11.0619 9.18096 11.3698 9.1136 11.6529 8.98351L20.7502 4.80405" stroke={BLUE_ML} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.2291 2.3959L14.6431 3.81049L16.2739 3.85697L18.6036 19.3682L13.2291 20.4995L0.5 18.2369L2.19728 5.79047L13.2291 2.3959ZM13.2291 20.4995V2.3959" stroke={BLUE_ML} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.26081 14.3806C5.67703 14.9233 6.19864 15.125 6.92512 15.125H7.93052C8.37957 15.1248 8.81018 14.9463 9.12766 14.6288C9.44513 14.3112 9.62348 13.8805 9.62348 13.4315V13.4239C9.62348 12.9747 9.44506 12.544 9.12747 12.2264C8.80987 11.9088 8.37913 11.7304 7.92998 11.7304H6.82188C6.59923 11.7305 6.37875 11.6867 6.17302 11.6015C5.9673 11.5164 5.78036 11.3915 5.6229 11.2341C5.46544 11.0767 5.34053 10.8898 5.25531 10.6841C5.17008 10.4784 5.12622 10.2579 5.12622 10.0353C5.12622 9.58469 5.30521 9.15257 5.62382 8.83396C5.94243 8.51536 6.37455 8.33636 6.82513 8.33636H7.82512C8.55106 8.33636 9.07267 8.53798 9.48889 9.08014M7.71269 4.09316C7.17485 2.11317 10.7905 -0.955452 11.7051 2.86506" stroke={BLUE_ML} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.98682 4.93208C5.74897 0.213199 10.4581 -1.35598 10.296 3.29858" stroke={BLUE_ML} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.7425 2.6369C15.8217 2.75703 15.8569 2.9008 15.8423 3.04392C15.8278 3.18705 15.7643 3.32076 15.6625 3.42247L8.00425 11.0799C7.92591 11.1582 7.82816 11.2143 7.72102 11.2424L4.53125 12.0754C4.42581 12.1029 4.31501 12.1024 4.20985 12.0738C4.10469 12.0453 4.00883 11.9897 3.93178 11.9126C3.85473 11.8356 3.79917 11.7397 3.77061 11.6346C3.74206 11.5294 3.7415 11.4186 3.769 11.3132L4.60206 8.12424C4.62697 8.02874 4.67278 7.93996 4.73618 7.86432L12.4228 0.182722C12.5399 0.0657194 12.6987 0 12.8643 0C13.0299 0 13.1887 0.0657194 13.3058 0.182722L15.6625 2.5386C15.6916 2.56929 15.7184 2.60215 15.7425 2.6369ZM14.3371 2.98012L12.8643 1.50811L5.76834 8.60408L5.24768 10.5976L7.24118 10.0769L14.3371 2.98012Z" fill={BLUE_ML}/>
      <path d="M14.2306 12.4203C14.4583 10.4742 14.531 8.51316 14.448 6.55559C14.4461 6.50945 14.4537 6.46341 14.4705 6.42039C14.4873 6.37736 14.5128 6.3383 14.5455 6.30567L15.3652 5.48594C15.3876 5.46342 15.416 5.44784 15.4471 5.44108C15.4781 5.43432 15.5105 5.43667 15.5402 5.44784C15.5699 5.45902 15.5958 5.47854 15.6147 5.50407C15.6336 5.52959 15.6448 5.56004 15.6468 5.59174C15.8007 7.917 15.7421 10.2515 15.4718 12.5661C15.2752 14.2505 13.9224 15.5709 12.2454 15.7583C9.33418 16.0805 6.39627 16.0805 3.48502 15.7583C1.80891 15.5709 0.455197 14.2505 0.258596 12.5661C-0.0861988 9.61321 -0.0861988 6.63025 0.258596 3.67738C0.455197 1.99294 1.80808 0.672552 3.48502 0.485115C5.69465 0.241069 7.92079 0.181717 10.1403 0.307674C10.1721 0.309955 10.2025 0.321291 10.228 0.340339C10.2535 0.359388 10.2731 0.385352 10.2843 0.415155C10.2955 0.444959 10.298 0.477353 10.2913 0.508502C10.2847 0.539652 10.2693 0.568251 10.2469 0.590913L9.4197 1.4173C9.38736 1.44966 9.34871 1.47502 9.30614 1.49179C9.26357 1.50856 9.21801 1.51638 9.17229 1.51477C7.3202 1.45133 5.46595 1.52233 3.62414 1.7272C3.08594 1.78677 2.58353 2.02604 2.19808 2.40635C1.81263 2.78666 1.56664 3.28581 1.49985 3.82317C1.16567 6.67913 1.16567 9.56433 1.49985 12.4203C1.56664 12.9576 1.81263 13.4568 2.19808 13.8371C2.58353 14.2174 3.08594 14.4567 3.62414 14.5163C6.41904 14.8287 9.31141 14.8287 12.1071 14.5163C12.6453 14.4567 13.1477 14.2174 13.5332 13.8371C13.9187 13.4568 14.1638 12.9576 14.2306 12.4203Z" fill={BLUE_ML}/>
    </svg>
  );
}

const stylesML: Record<string, React.CSSProperties> = {
  outerCard: {
    background: "#fff",
    border: "1px solid #dbdbdb",
    borderRadius: "8px",
    padding: "15px",
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

    setUsernameErrorML(usernameEmptyML ? "Username is required" : "");
    setEmailErrorML(emailEmptyML ? "Email is required" : "");

    if (usernameEmptyML || emailEmptyML) return;

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
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L17 17M17 1L1 17" stroke={BLUE_ML} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
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
        <div style={{ maxWidth: "950px", margin: "0 auto" }}>
          <CreateAccountForm fetcher={fetcherML} saving={savingML} />
        </div>
      </s-page>
    );
  }

  return (
    <s-page heading="Booking and Reservation" inlineSize="950px" style={{ fontFamily: "Inter" }}>
      <div style={{ maxWidth: "950px", margin: "0 auto" }}>
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 2V5M17 2V5M3 9H21M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5Z"
                    stroke={BLUE_ML}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span style={stylesML.value}>{planML || "—"}</span>
              </div>
            </div>
          </div>

          <div className={rowStyles.row}>
            <div style={stylesML.fieldGroup}>
              <span style={stylesML.label}>Subscription ID</span>
              <div style={stylesML.inputBox}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 4H18M8 8H18M8 12H14M5 4H5.01M5 8H5.01M5 12H5.01M4 20H20C20.5523 20 21 19.5523 21 19V5C21 4.44772 20.5523 4 20 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20Z"
                    stroke={BLUE_ML}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

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