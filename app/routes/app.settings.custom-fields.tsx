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
  createCustomFieldML,
  deleteCustomFieldML,
  listCustomFieldsML,
  parseCustomFieldFormML,
  reorderCustomFieldsML,
  updateCustomFieldML,
  type CustomFieldFieldErrors,
  type CustomFieldFormValues,
} from "../models/customBookingField.server";

type FieldChangeEvent = { currentTarget: { value: string } };

const EMPTY_FORM_ML: CustomFieldFormValues = {
  label: "",
  type: "TEXT",
  required: false,
  options: "",
};

const TYPE_LABELS_ML: Record<CustomFieldFormValues["type"], string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  NUMBER: "Number",
  SELECT: "Dropdown",
};

const ACCENT_ML = "#073E74";
const LINE_BORDER_ML = "#DBDBDB";
const INPUT_BORDER_ML = "#E9E9EA";
const LABEL_GREY_ML = "#373737";
const TEXT_BLACK_ML = "#000000";

const ChevronIcon = ({ open: openML }: { open: boolean }) => (
  <img
    src="/chevron.svg"
    width={11}
    height={6}
    alt=""
    style={{
      transform: openML ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  />
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const stylesML: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "10px 10px 13px",
    gap: "16px",
    width: "100%",
    maxWidth: "886px",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
    borderRadius: "4px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    width: "100%",
    alignSelf: "stretch",
  },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
  },
  title: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  chevronButton: {
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
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER_ML}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
    alignSelf: "stretch",
  },
  fieldGroupLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "100%",
    alignSelf: "stretch",
  },
  fieldGroupHalf: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    flex: "1 1 200px",
    minWidth: 0,
  },
  fieldGroupOptions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    width: "100%",
    alignSelf: "stretch",
  },
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY_ML,
    margin: 0,
  },
  inputBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER_ML}`,
    borderRadius: "4px",
  },
  textInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK_ML,
    padding: 0,
  },
  selectInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: "19px",
    color: TEXT_BLACK_ML,
    padding: 0,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  requiredRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    height: "24px",
    flex: "none",
  },
  checkbox: {
    boxSizing: "border-box",
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: `1.5px solid ${ACCENT_ML}`,
    background: "#FFFFFF",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
  checkboxDot: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: ACCENT_ML,
  },
  requiredLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK_ML,
    margin: 0,
    cursor: "pointer",
  },
  addButton: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px 14px",
    gap: "6px",
    width: "auto",
    height: "36px",
    background: ACCENT_ML,
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  addButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  plusWrap: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  cancelButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px 14px",
    height: "36px",
    background: "transparent",
    borderRadius: "8px",
    border: `1px solid ${INPUT_BORDER_ML}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  cancelButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    whiteSpace: "nowrap",
  },
  buttonRow: {
    display: "flex",
    flexDirection: "row",
    gap: "10px",
  },
  listCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
    borderRadius: "4px",
    padding: "10px 10px 13px",
    marginTop: "16px",
  },
  listHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  listHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "3px",
  },
  listTitle: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "19px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  columnHeaderRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "20px",
    width: "100%",
    alignSelf: "stretch",
  },
  columnHeaderCell: {
    flex: "1 1 0",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  rowWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "20px",
    width: "100%",
    alignSelf: "stretch",
    minHeight: "40px",
  },
  rowCell: {
    flex: "1 1 0",
    alignSelf: "center",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    margin: 0,
  },
  actionsCell: {
    flex: "1 1 0",
    alignSelf: "center",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    width: "40px",
    height: "40px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  deleteButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    width: "44px",
    height: "40px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  emptyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: LABEL_GREY_ML,
    margin: 0,
  },
};

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const fieldsML = await listCustomFieldsML(sessionML.shop);
  return { fields: fieldsML };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();
  const intentML = String(formDataML.get("intent") ?? "") as
    "create" | "update" | "delete" | "reorder" | "";

  if (intentML === "reorder") {
    let orderedIdsML: string[] = [];
    try {
      orderedIdsML = JSON.parse(String(formDataML.get("orderedIds") ?? "[]"));
    } catch {
      orderedIdsML = [];
    }
    await reorderCustomFieldsML(sessionML.shop, orderedIdsML);
    return { intent: intentML, ok: true as const };
  }

  if (intentML === "delete") {
    const idML = String(formDataML.get("id") ?? "");
    const resultML = await deleteCustomFieldML(sessionML.shop, idML);
    return { intent: intentML, ...resultML };
  }

  const { values: valuesML, errors: errorsML } = parseCustomFieldFormML(formDataML);
  if (Object.keys(errorsML).length > 0) {
    return { intent: intentML, ok: false as const, errors: errorsML, values: valuesML };
  }

  if (intentML === "update") {
    const idML = String(formDataML.get("id") ?? "");
    const resultML = await updateCustomFieldML(sessionML.shop, idML, valuesML);
    return { intent: intentML, ...resultML, values: valuesML };
  }

  await createCustomFieldML(sessionML.shop, valuesML);
  return { intent: "create" as const, ok: true as const, values: EMPTY_FORM_ML };
};

function Checkbox({
  checked: checkedML,
  onChange: onChangeML,
  label: labelML,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div style={stylesML.requiredRow}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checkedML}
        aria-label={labelML}
        style={stylesML.checkbox}
        onClick={onChangeML}
      >
        {checkedML && <span style={stylesML.checkboxDot} />}
      </button>
      <p style={stylesML.requiredLabel} onClick={onChangeML}>
        {labelML}
      </p>
    </div>
  );
}

function FieldEditor({
  initial: initialML,
  onCancel: onCancelML,
  submitLabel: submitLabelML,
  fieldId: fieldIdML,
  open: openML,
  onToggleOpen: onToggleOpenML,
  title: titleML,
  description: descriptionML,
}: {
  initial: CustomFieldFormValues;
  onCancel?: () => void;
  submitLabel: string;
  fieldId?: string;
  open?: boolean;
  onToggleOpen?: () => void;
  title?: string;
  description?: string;
}) {
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const [valuesML, setValuesML] = useState<CustomFieldFormValues>(initialML);

  const isEditML = Boolean(fieldIdML);
  const errorsML: CustomFieldFieldErrors =
    fetcherML.data && "errors" in fetcherML.data ? fetcherML.data.errors ?? {} : {};

  useEffect(() => {
    if (fetcherML.data?.ok) {
      shopifyML.toast.show(isEditML ? "Field updated" : "Field added");
      if (!isEditML) {
        setValuesML(EMPTY_FORM_ML);
      }
      onCancelML?.();
    }
  }, [fetcherML.data]);

  const isSavingML = fetcherML.state !== "idle";

  const handleSubmitML = () => {
    fetcherML.submit(
      {
        intent: isEditML ? "update" : "create",
        ...(fieldIdML ? { id: fieldIdML } : {}),
        label: valuesML.label,
        type: valuesML.type,
        required: String(valuesML.required),
        options: valuesML.options,
      },
      { method: "POST" },
    );
  };

  const showChromeML = titleML !== undefined;

  return (
    <div style={{ ...stylesML.card, height: "auto" }}>
      <div style={stylesML.body}>
        {showChromeML && (
          <div
            style={{
              ...stylesML.headerRow,
              cursor: onToggleOpenML ? "pointer" : undefined,
            }}
            onClick={onToggleOpenML}
          >
            <div style={stylesML.headerLeft}>
              <p style={stylesML.title}>{titleML}</p>
              {descriptionML && <p style={stylesML.descText}>{descriptionML}</p>}
            </div>
            {onToggleOpenML && (
              <button
                type="button"
                style={stylesML.chevronButton}
                aria-label={openML ? "Collapse" : "Expand"}
              >
                <ChevronIcon open={Boolean(openML)} />
              </button>
            )}
          </div>
        )}

        {(openML ?? true) && (
          <>
            {showChromeML && <hr style={stylesML.divider} />}

            <div style={stylesML.fieldsRow}>
              <div style={stylesML.fieldGroupHalf}>
                <p style={stylesML.fieldLabel}>Question / field label</p>
                <div style={stylesML.inputBox}>
                  <input
                    type="text"
                    style={stylesML.textInput}
                    placeholder="Number of guests"
                    value={valuesML.label}
                    onChange={(eML: FieldChangeEvent) => {
                      const valueML = eML.currentTarget.value;
                      setValuesML((prevML) => ({ ...prevML, label: valueML }));
                    }}
                  />
                </div>
                {errorsML.label && (
                  <p
                    style={{
                      ...stylesML.fieldLabel,
                      color: "#D82C0D",
                      fontWeight: 400,
                      fontSize: "12px",
                    }}
                  >
                    {errorsML.label}
                  </p>
                )}
              </div>

              <div style={stylesML.fieldGroupHalf}>
                <p style={stylesML.fieldLabel}>Field type</p>
                <div style={stylesML.inputBox}>
                  <select
                    style={stylesML.selectInput}
                    value={valuesML.type}
                    onChange={(eML: FieldChangeEvent) => {
                      const valueML = eML.currentTarget
                        .value as CustomFieldFormValues["type"];
                      setValuesML((prevML) => ({ ...prevML, type: valueML }));
                    }}
                  >
                    <option value="TEXT">Short text</option>
                    <option value="TEXTAREA">Long text</option>
                    <option value="NUMBER">Number</option>
                    <option value="SELECT">Dropdown</option>
                  </select>
                  <ChevronIcon open={false} />
                </div>
              </div>
            </div>

            <Checkbox
              checked={valuesML.required}
              onChange={() =>
                setValuesML((prevML) => ({ ...prevML, required: !prevML.required }))
              }
              label="Required"
            />

            {valuesML.type === "SELECT" && (
              <div style={stylesML.fieldGroupOptions}>
                <p style={stylesML.fieldLabel}>Options</p>
                <div style={stylesML.inputBox}>
                  <input
                    type="text"
                    style={stylesML.textInput}
                    placeholder="Small, Medium, Large"
                    value={valuesML.options}
                    onChange={(eML: FieldChangeEvent) => {
                      const valueML = eML.currentTarget.value;
                      setValuesML((prevML) => ({ ...prevML, options: valueML }));
                    }}
                  />
                </div>
                {errorsML.options && (
                  <p
                    style={{
                      ...stylesML.fieldLabel,
                      color: "#D82C0D",
                      fontWeight: 400,
                      fontSize: "12px",
                    }}
                  >
                    {errorsML.options}
                  </p>
                )}
              </div>
            )}

            {showChromeML && <hr style={stylesML.divider} />}

            <div style={stylesML.buttonRow}>
              {onCancelML && (
                <button
                  type="button"
                  style={stylesML.cancelButton}
                  onClick={onCancelML}
                  disabled={isSavingML}
                >
                  <span style={stylesML.cancelButtonLabel}>Cancel</span>
                </button>
              )}
              <button
                type="button"
                style={{
                  ...stylesML.addButton,
                  ...(isSavingML ? stylesML.addButtonDisabled : {}),
                }}
                onClick={handleSubmitML}
                disabled={isSavingML}
              >
                <span style={stylesML.addButtonLabel}>{submitLabelML}</span>
                {!isEditML && (
                  <span style={stylesML.plusWrap}>
                    <PlusIcon />
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field: fieldML,
  onMoveUp: onMoveUpML,
  onMoveDown: onMoveDownML,
  isFirst: isFirstML,
  isLast: isLastML,
  isReordering: isReorderingML,
}: {
  field: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options: string | null;
  };
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isReordering: boolean;
}) {
  const deleteFetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const [isEditingML, setIsEditingML] = useState(false);
  const isDeletingML = deleteFetcherML.state !== "idle";
  const isBusyML = isDeletingML || isReorderingML;

  useEffect(() => {
    if (deleteFetcherML.data?.intent === "delete" && deleteFetcherML.data.ok) {
      shopifyML.toast.show("Field removed");
    }
  }, [deleteFetcherML.data, shopifyML]);

  const handleDeleteML = () => {
    deleteFetcherML.submit(
      { intent: "delete", id: fieldML.id },
      { method: "POST" },
    );
  };

  if (isEditingML) {
    return (
      <div>
        <FieldEditor
          fieldId={fieldML.id}
          submitLabel="Save"
          onCancel={() => setIsEditingML(false)}
          initial={{
            label: fieldML.label,
            type: fieldML.type as CustomFieldFormValues["type"],
            required: fieldML.required,
            options: fieldML.options ?? "",
          }}
        />
        <hr style={stylesML.divider} />
      </div>
    );
  }

  return (
    <div>
      <div style={stylesML.rowWrap}>
        <p style={stylesML.rowCell}>{fieldML.label}</p>
        <p style={stylesML.rowCell}>
          {TYPE_LABELS_ML[fieldML.type as CustomFieldFormValues["type"]] ?? fieldML.type}
        </p>
        <p style={stylesML.rowCell}>{fieldML.required ? "Yes" : "No"}</p>
        <div style={stylesML.actionsCell}>
          <button
            type="button"
            style={{
              ...stylesML.iconButton,
              ...(isFirstML || isBusyML ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveUpML}
            disabled={isBusyML}
            aria-label={`Move ${fieldML.label} up`}
          >
            <img src="/arrow-up.svg" 
            width={44} 
            height={40} 
            alt="" />
          </button>
          <button
            type="button"
            style={{
              ...stylesML.iconButton,
              ...(isLastML || isBusyML ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveDownML}
            disabled={isBusyML}
            aria-label={`Move ${fieldML.label} down`}
          >
            <img src="/arrow-down.svg" 
              width={44} 
              height={40} 
              alt="" />
          </button>
          <button
            type="button"
            style={stylesML.iconButton}
            onClick={() => setIsEditingML(true)}
            disabled={isBusyML}
            aria-label={`Edit ${fieldML.label}`}
          >
            <img 
              src="/edit-icon.svg" 
              width={44} 
              height={40} 
              alt="" />
          </button>
          <button
            type="button"
            style={stylesML.deleteButton}
            onClick={handleDeleteML}
            disabled={isReorderingML}
            aria-label={`Delete ${fieldML.label}`}
          >
            <img
              src="/delete-icon.svg"
              width={44}
              height={40}
              alt="Delete"
              style={{
                display: "block",
                ...(isDeletingML ? { opacity: 0.5 } : {}),
              }}
            />
          </button>
        </div>
      </div>
      <hr style={stylesML.divider} />
    </div>
  );
}

export default function CustomFieldsPage() {
  const { fields: loaderFieldsML } = useLoaderData<typeof loader>();
  const reorderFetcherML = useFetcher<typeof action>();
  const [fieldsML, setFieldsML] = useState(loaderFieldsML);
  const [openML, setOpenML] = useState(false);
  const isReorderingML = reorderFetcherML.state !== "idle";

  useEffect(() => {
    setFieldsML(loaderFieldsML);
  }, [loaderFieldsML]);

  const persistOrderML = (orderedML: typeof fieldsML) => {
    reorderFetcherML.submit(
      {
        intent: "reorder",
        orderedIds: JSON.stringify(orderedML.map((fML) => fML.id)),
      },
      { method: "POST" },
    );
  };

  const moveFieldML = (indexML: number, directionML: -1 | 1) => {
    const targetIndexML = (indexML + directionML + fieldsML.length) % fieldsML.length;

    const reorderedML = [...fieldsML];
    const [movedML] = reorderedML.splice(indexML, 1);
    reorderedML.splice(targetIndexML, 0, movedML);

    setFieldsML(reorderedML);
    persistOrderML(reorderedML);
  };

  return (
    <div style={{ fontFamily: "Inter" }}>
      <FieldEditor
        initial={EMPTY_FORM_ML}
        submitLabel="Add field"
        open={openML}
        onToggleOpen={() => setOpenML(!openML)}
        title="Add a field"
        description={
          'Extra questions customers answer on the booking widget- e.g. "Number of guests" or "Special requests". Applies to every bookable product.'
        }
      />

      <div style={stylesML.listCard}>
        <div style={stylesML.listHeaderRow}>
          <div style={stylesML.listHeaderLeft}>
            <p style={stylesML.listTitle}>Current fields</p>
            <p style={stylesML.descText}>
              Use the arrows to change the order these questions appear in on
              the storefront.
            </p>
          </div>
        </div>

        <hr style={stylesML.divider} />

        <div style={stylesML.columnHeaderRow}>
          <p style={stylesML.columnHeaderCell}>Label</p>
          <p style={stylesML.columnHeaderCell}>Type</p>
          <p style={stylesML.columnHeaderCell}>Required</p>
          <p style={{ ...stylesML.columnHeaderCell, textAlign: "left" }}>
            Actions
          </p>
        </div>

        <hr style={stylesML.divider} />

        {fieldsML.length === 0 ? (
          <p style={stylesML.emptyText}>No custom fields yet.</p>
        ) : (
          fieldsML.map((fieldML, indexML) => (
            <FieldRow
              key={fieldML.id}
              field={fieldML}
              isFirst={indexML === 0}
              isLast={indexML === fieldsML.length - 1}
              onMoveUp={() => moveFieldML(indexML, -1)}
              onMoveDown={() => moveFieldML(indexML, 1)}
              isReordering={isReorderingML}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};