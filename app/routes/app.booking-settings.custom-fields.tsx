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

function FieldEditor({
  initial,
  onCancel,
  submitLabel,
  fieldId,
}: {
  initial: CustomFieldFormValues;
  onCancel?: () => void;
  submitLabel: string;
  fieldId?: string;
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

  return (
    <s-stack direction="block" gap="base">
      <s-text-field
        label="Question / field label"
        placeholder="Number of guests"
        value={values.label}
        error={errors.label}
        onChange={(e: FieldChangeEvent) => {
          const value = e.currentTarget.value;
          setValues((prev) => ({ ...prev, label: value }));
        }}
      ></s-text-field>

      <s-stack direction="inline" gap="base">
        <s-select
          label="Field type"
          value={values.type}
          onChange={(e: FieldChangeEvent) => {
            const value = e.currentTarget.value as CustomFieldFormValues["type"];
            setValues((prev) => ({ ...prev, type: value }));
          }}
        >
          <s-option value="TEXT">Short text</s-option>
          <s-option value="TEXTAREA">Long text</s-option>
          <s-option value="NUMBER">Number</s-option>
          <s-option value="SELECT">Dropdown</s-option>
        </s-select>

        <s-checkbox
          label="Required"
          checked={values.required}
          onChange={() =>
            setValues((prev) => ({ ...prev, required: !prev.required }))
          }
        ></s-checkbox>
      </s-stack>

      {values.type === "SELECT" && (
        <s-text-field
          label="Options"
          details="Comma-separated, e.g. Small, Medium, Large"
          value={values.options}
          error={errors.options}
          onChange={(e: FieldChangeEvent) => {
            const value = e.currentTarget.value;
            setValues((prev) => ({ ...prev, options: value }));
          }}
        ></s-text-field>
      )}

      <s-stack direction="inline" gap="small">
        <s-button
          variant="primary"
          onClick={handleSubmit}
          {...(isSaving ? { loading: true } : {})}
        >
          {submitLabel}
        </s-button>
        {onCancel && (
          <s-button
            variant="tertiary"
            onClick={onCancel}
            {...(isSaving ? { disabled: true } : {})}
          >
            Cancel
          </s-button>
        )}
      </s-stack>
    </s-stack>
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
      <s-table-row>
        <s-table-cell colSpan={4}>
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
        </s-table-cell>
      </s-table-row>
    );
  }

  return (
    <s-table-row>
      <s-table-cell>{field.label}</s-table-cell>
      <s-table-cell>{field.type}</s-table-cell>
      <s-table-cell>{field.required ? "Yes" : "No"}</s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small">
          <s-button
            variant="tertiary"
            {...(isFirst || isBusy ? { disabled: true } : {})}
            onClick={onMoveUp}
            accessibilityLabel={`Move ${field.label} up`}
          >
            ↑
          </s-button>
          <s-button
            variant="tertiary"
            {...(isLast || isBusy ? { disabled: true } : {})}
            onClick={onMoveDown}
            accessibilityLabel={`Move ${field.label} down`}
          >
            ↓
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => setIsEditing(true)}
            {...(isBusy ? { disabled: true } : {})}
          >
            Edit
          </s-button>
          <s-button
            variant="tertiary"
            tone="critical"
            onClick={handleDelete}
            {...(isReordering ? { disabled: true } : {})}
            {...(isDeleting ? { loading: true } : {})}
          >
            Delete
          </s-button>
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export default function CustomFieldsPage() {
  const { fields: loaderFields } = useLoaderData<typeof loader>();
  const reorderFetcher = useFetcher<typeof action>();
  const [fields, setFields] = useState(loaderFields);
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
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setFields(reordered);
    persistOrder(reordered);
  };

  return (
    <s-page heading="Custom Booking Fields" inlineSize="large">
      <s-section heading="Add a field">
        <s-paragraph>
          Extra questions customers answer on the booking widget, in
          addition to name, email, and phone — e.g. "Number of guests" or
          "Special requests". Applies to every bookable product.
        </s-paragraph>
        <FieldEditor initial={EMPTY_FORM} submitLabel="Add field" />
      </s-section>

      <s-section heading="Current fields">
        {fields.length === 0 ? (
          <s-paragraph>No custom fields yet.</s-paragraph>
        ) : (
          <>
            <s-paragraph>
              Use the arrows to change the order these questions appear in
              on the storefront.
            </s-paragraph>
            <s-table>
              <s-table-header-row>
                <s-table-header>Label</s-table-header>
                <s-table-header>Type</s-table-header>
                <s-table-header>Required</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {fields.map((field, index) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    onMoveUp={() => moveField(index, -1)}
                    onMoveDown={() => moveField(index, 1)}
                    isReordering={isReordering}
                  />
                ))}
              </s-table-body>
            </s-table>
          </>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};