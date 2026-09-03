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
  createCustomField,
  deleteCustomField,
  listCustomFields,
  parseCustomFieldForm,
  reorderCustomFields,
  updateCustomField,
  type CustomFieldFieldErrors,
  type CustomFieldFormValues,
} from "../models/customBookingField.server";

type FieldChangeEvent = { currentTarget: { value: string } };

const EMPTY_FORM: CustomFieldFormValues = {
  label: "",
  type: "TEXT",
  required: false,
  options: "",
};

const TYPE_LABELS: Record<CustomFieldFormValues["type"], string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  NUMBER: "Number",
  SELECT: "Dropdown",
};

const ACCENT = "#073E74";
const LINE_BORDER = "#DBDBDB";
const INPUT_BORDER = "#E9E9EA";
const LABEL_GREY = "#373737";
const TEXT_BLACK = "#000000";

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="11"
    height="6"
    viewBox="0 0 11 6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.2s ease",
    }}
  >
    <path
      d="M1 1L5.5 5L10 1"
      stroke={ACCENT}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 1V11M1 6H11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "10px 10px 13px",
    gap: "16px",
    width: "886px",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
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
    color: TEXT_BLACK,
    margin: 0,
  },
  descText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK,
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
    borderTop: `1px solid ${LINE_BORDER}`,
    margin: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  fieldsRow: {
    display: "flex",
    flexDirection: "row",
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
    flex: "1 1 0",
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
    color: LABEL_GREY,
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
    border: `1px solid ${INPUT_BORDER}`,
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
    color: TEXT_BLACK,
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
    color: TEXT_BLACK,
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
    border: `1.5px solid ${ACCENT}`,
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
    background: ACCENT,
  },
  requiredLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "15px",
    color: TEXT_BLACK,
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
    background: ACCENT,
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
    border: `1px solid ${INPUT_BORDER}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  cancelButtonLabel: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
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
    border: `1px solid ${LINE_BORDER}`,
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
    color: TEXT_BLACK,
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
    color: TEXT_BLACK,
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
    color: TEXT_BLACK,
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
    color: LABEL_GREY,
    margin: 0,
  },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const fields = await listCustomFields(session.shop);
  return { fields };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "") as
    "create" | "update" | "delete" | "reorder" | "";

  if (intent === "reorder") {
    let orderedIds: string[] = [];
    try {
      orderedIds = JSON.parse(String(formData.get("orderedIds") ?? "[]"));
    } catch {
      orderedIds = [];
    }
    await reorderCustomFields(session.shop, orderedIds);
    return { intent, ok: true as const };
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");
    const result = await deleteCustomField(session.shop, id);
    return { intent, ...result };
  }

  const { values, errors } = parseCustomFieldForm(formData);
  if (Object.keys(errors).length > 0) {
    return { intent, ok: false as const, errors, values };
  }

  if (intent === "update") {
    const id = String(formData.get("id") ?? "");
    const result = await updateCustomField(session.shop, id, values);
    return { intent, ...result, values };
  }

  await createCustomField(session.shop, values);
  return { intent: "create" as const, ok: true as const, values: EMPTY_FORM };
};

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div style={styles.requiredRow}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        style={styles.checkbox}
        onClick={onChange}
      >
        {checked && <span style={styles.checkboxDot} />}
      </button>
      <p style={styles.requiredLabel} onClick={onChange}>
        {label}
      </p>
    </div>
  );
}

function FieldEditor({
  initial,
  onCancel,
  submitLabel,
  fieldId,
  open,
  onToggleOpen,
  title,
  description,
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
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [values, setValues] = useState<CustomFieldFormValues>(initial);

  const isEdit = Boolean(fieldId);
  const errors: CustomFieldFieldErrors =
    fetcher.data && "errors" in fetcher.data ? fetcher.data.errors ?? {} : {};

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show(isEdit ? "Field updated" : "Field added");
      if (!isEdit) {
        setValues(EMPTY_FORM);
      }
      onCancel?.();
    }
  }, [fetcher.data]);

  const isSaving = fetcher.state !== "idle";

  const handleSubmit = () => {
    fetcher.submit(
      {
        intent: isEdit ? "update" : "create",
        ...(fieldId ? { id: fieldId } : {}),
        label: values.label,
        type: values.type,
        required: String(values.required),
        options: values.options,
      },
      { method: "POST" },
    );
  };

  const showChrome = title !== undefined;

  return (
    <div style={{ ...styles.card, height: "auto" }}>
      <div style={styles.body}>
        {showChrome && (
          <div
            style={{
              ...styles.headerRow,
              cursor: onToggleOpen ? "pointer" : undefined,
            }}
            onClick={onToggleOpen}
          >
            <div style={styles.headerLeft}>
              <p style={styles.title}>{title}</p>
              {description && <p style={styles.descText}>{description}</p>}
            </div>
            {onToggleOpen && (
              <button
                type="button"
                style={styles.chevronButton}
                aria-label={open ? "Collapse" : "Expand"}
              >
                <ChevronIcon open={Boolean(open)} />
              </button>
            )}
          </div>
        )}

        {(open ?? true) && (
          <>
            {showChrome && <hr style={styles.divider} />}

            <div style={styles.fieldsRow}>
              <div style={styles.fieldGroupHalf}>
                <p style={styles.fieldLabel}>Question / field label</p>
                <div style={styles.inputBox}>
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Number of guests"
                    value={values.label}
                    onChange={(e: FieldChangeEvent) => {
                      const value = e.currentTarget.value;
                      setValues((prev) => ({ ...prev, label: value }));
                    }}
                  />
                </div>
                {errors.label && (
                  <p
                    style={{
                      ...styles.fieldLabel,
                      color: "#D82C0D",
                      fontWeight: 400,
                      fontSize: "12px",
                    }}
                  >
                    {errors.label}
                  </p>
                )}
              </div>

              <div style={styles.fieldGroupHalf}>
                <p style={styles.fieldLabel}>Field type</p>
                <div style={styles.inputBox}>
                  <select
                    style={styles.selectInput}
                    value={values.type}
                    onChange={(e: FieldChangeEvent) => {
                      const value = e.currentTarget
                        .value as CustomFieldFormValues["type"];
                      setValues((prev) => ({ ...prev, type: value }));
                    }}
                  >
                    <option value="TEXT">Short text</option>
                    <option value="TEXTAREA">Long text</option>
                    <option value="NUMBER">Number</option>
                    <option value="SELECT">Dropdown</option>
                  </select>
                </div>
              </div>
            </div>

            <Checkbox
              checked={values.required}
              onChange={() =>
                setValues((prev) => ({ ...prev, required: !prev.required }))
              }
              label="Required"
            />

            {values.type === "SELECT" && (
              <div style={styles.fieldGroupOptions}>
                <p style={styles.fieldLabel}>Options</p>
                <div style={styles.inputBox}>
                  <input
                    type="text"
                    style={styles.textInput}
                    placeholder="Small, Medium, Large"
                    value={values.options}
                    onChange={(e: FieldChangeEvent) => {
                      const value = e.currentTarget.value;
                      setValues((prev) => ({ ...prev, options: value }));
                    }}
                  />
                </div>
                {errors.options && (
                  <p
                    style={{
                      ...styles.fieldLabel,
                      color: "#D82C0D",
                      fontWeight: 400,
                      fontSize: "12px",
                    }}
                  >
                    {errors.options}
                  </p>
                )}
              </div>
            )}

            {showChrome && <hr style={styles.divider} />}
          </>
        )}
      </div>

      <div style={styles.buttonRow}>
        {onCancel && (
          <button
            type="button"
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            <span style={styles.cancelButtonLabel}>Cancel</span>
          </button>
        )}
        <button
          type="button"
          style={{
            ...styles.addButton,
            ...(isSaving ? styles.addButtonDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={isSaving}
        >
          <span style={styles.addButtonLabel}>{submitLabel}</span>
          {!isEdit && (
            <span style={styles.plusWrap}>
              <PlusIcon />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isReordering,
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
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [isEditing, setIsEditing] = useState(false);
  const isDeleting = deleteFetcher.state !== "idle";
  const isBusy = isDeleting || isReordering;

  useEffect(() => {
    if (deleteFetcher.data?.intent === "delete" && deleteFetcher.data.ok) {
      shopify.toast.show("Field removed");
    }
  }, [deleteFetcher.data, shopify]);

  const handleDelete = () => {
    deleteFetcher.submit(
      { intent: "delete", id: field.id },
      { method: "POST" },
    );
  };

  if (isEditing) {
    return (
      <div>
        <FieldEditor
          fieldId={field.id}
          submitLabel="Save"
          onCancel={() => setIsEditing(false)}
          initial={{
            label: field.label,
            type: field.type as CustomFieldFormValues["type"],
            required: field.required,
            options: field.options ?? "",
          }}
        />
        <hr style={styles.divider} />
      </div>
    );
  }

  return (
    <div>
      <div style={styles.rowWrap}>
        <p style={styles.rowCell}>{field.label}</p>
        <p style={styles.rowCell}>
          {TYPE_LABELS[field.type as CustomFieldFormValues["type"]] ?? field.type}
        </p>
        <p style={styles.rowCell}>{field.required ? "Yes" : "No"}</p>
        <div style={styles.actionsCell}>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isFirst || isBusy ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveUp}
            disabled={isBusy}
            aria-label={`Move ${field.label} up`}
          >
            <img src="/arrow-up.svg" 
            width={44} 
            height={40} 
            alt="" />
          </button>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isLast || isBusy ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            onClick={onMoveDown}
            disabled={isBusy}
            aria-label={`Move ${field.label} down`}
          >
            <img src="/arrow-down.svg" 
              width={44} 
              height={40} 
              alt="" />
          </button>
          <button
            type="button"
            style={styles.iconButton}
            onClick={() => setIsEditing(true)}
            disabled={isBusy}
            aria-label={`Edit ${field.label}`}
          >
            <img 
              src="/edit-icon.svg" 
              width={44} 
              height={40} 
              alt="" />
          </button>
          <button
            type="button"
            style={styles.deleteButton}
            onClick={handleDelete}
            disabled={isReordering}
            aria-label={`Delete ${field.label}`}
          >
            <img
              src="/delete-icon.svg"
              width={44}
              height={40}
              alt="Delete"
              style={{
                display: "block",
                ...(isDeleting ? { opacity: 0.5 } : {}),
              }}
            />
          </button>
        </div>
      </div>
      <hr style={styles.divider} />
    </div>
  );
}

export default function CustomFieldsPage() {
  const { fields: loaderFields } = useLoaderData<typeof loader>();
  const reorderFetcher = useFetcher<typeof action>();
  const [fields, setFields] = useState(loaderFields);
  const [open, setOpen] = useState(true);
  const isReordering = reorderFetcher.state !== "idle";

  useEffect(() => {
    setFields(loaderFields);
  }, [loaderFields]);

  const persistOrder = (ordered: typeof fields) => {
    reorderFetcher.submit(
      {
        intent: "reorder",
        orderedIds: JSON.stringify(ordered.map((f) => f.id)),
      },
      { method: "POST" },
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = (index + direction + fields.length) % fields.length;

    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setFields(reordered);
    persistOrder(reordered);
  };

  return (
    <div style={{ fontFamily: "Inter" }}>
      <FieldEditor
        initial={EMPTY_FORM}
        submitLabel="Add field"
        open={open}
        onToggleOpen={() => setOpen(!open)}
        title="Add a field"
        description={
          'Extra questions customers answer on the booking widget- e.g. "Number of guests" or "Special requests". Applies to every bookable product.'
        }
      />

      <div style={styles.listCard}>
        <div style={styles.listHeaderRow}>
          <div style={styles.listHeaderLeft}>
            <p style={styles.listTitle}>Current fields</p>
            <p style={styles.descText}>
              Use the arrows to change the order these questions appear in on
              the storefront.
            </p>
          </div>
        </div>

        <hr style={styles.divider} />

        <div style={styles.columnHeaderRow}>
          <p style={styles.columnHeaderCell}>Label</p>
          <p style={styles.columnHeaderCell}>Type</p>
          <p style={styles.columnHeaderCell}>Required</p>
          <p style={{ ...styles.columnHeaderCell, textAlign: "left" }}>
            Actions
          </p>
        </div>

        <hr style={styles.divider} />

        {fields.length === 0 ? (
          <p style={styles.emptyText}>No custom fields yet.</p>
        ) : (
          fields.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onMoveUp={() => moveField(index, -1)}
              onMoveDown={() => moveField(index, 1)}
              isReordering={isReordering}
            />
          ))
        )}
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};