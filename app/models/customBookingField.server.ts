import type { CustomBookingField, CustomFieldType } from "@prisma/client";
import prisma from "../db.server";

export type CustomFieldFormValues = {
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string; // raw comma-separated input, only meaningful for SELECT
};

export type CustomFieldFieldErrors = Partial<
  Record<keyof CustomFieldFormValues, string>
>;

const MAX_LABEL_LENGTH = 80;
const MAX_OPTIONS = 20;

/** Turns a label into a stable, URL/property-safe key, e.g. "Number of guests" -> "number-of-guests". */
function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}

/** Appends -2, -3, etc. until the key is unique for this shop. */
async function uniqueFieldKey(shop: string, base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  // Field counts per shop are small (a handful of questions), so a loop
  // of individual lookups is simpler than a single query and fine here.
  while (
    await prisma.customBookingField.findUnique({
      where: { shop_fieldKey: { shop, fieldKey: candidate } },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function listCustomFields(
  shop: string,
): Promise<CustomBookingField[]> {
  return prisma.customBookingField.findMany({
    where: { shop },
    orderBy: { sortOrder: "asc" },
  });
}

export function parseCustomFieldForm(formData: FormData): {
  values: CustomFieldFormValues;
  errors: CustomFieldFieldErrors;
} {
  const errors: CustomFieldFieldErrors = {};

  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    errors.label = "Enter a question or field label.";
  } else if (label.length > MAX_LABEL_LENGTH) {
    errors.label = `Keep it under ${MAX_LABEL_LENGTH} characters.`;
  }

  const typeRaw = String(formData.get("type") ?? "TEXT");
  const validTypes: CustomFieldType[] = ["TEXT", "TEXTAREA", "NUMBER", "SELECT"];
  const type = validTypes.includes(typeRaw as CustomFieldType)
    ? (typeRaw as CustomFieldType)
    : "TEXT";

  const required = formData.get("required") === "true";
  const optionsRaw = String(formData.get("options") ?? "").trim();

  if (type === "SELECT") {
    const options = optionsRaw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length === 0) {
      errors.options = "Add at least one option, separated by commas.";
    } else if (options.length > MAX_OPTIONS) {
      errors.options = `Keep it to ${MAX_OPTIONS} options or fewer.`;
    }
  }

  return {
    values: { label, type, required, options: optionsRaw },
    errors,
  };
}

export async function createCustomField(
  shop: string,
  values: CustomFieldFormValues,
): Promise<CustomBookingField> {
  const baseKey = slugify(values.label);
  const fieldKey = await uniqueFieldKey(shop, baseKey);

  const lastField = await prisma.customBookingField.findFirst({
    where: { shop },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastField?.sortOrder ?? -1) + 1;

  return prisma.customBookingField.create({
    data: {
      shop,
      fieldKey,
      label: values.label,
      type: values.type,
      required: values.required,
      options: values.type === "SELECT" ? normalizeOptions(values.options) : null,
      sortOrder,
    },
  });
}

export async function updateCustomField(
  shop: string,
  id: string,
  values: CustomFieldFormValues,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.customBookingField.findFirst({
    where: { id, shop },
  });
  if (!existing) {
    return { ok: false, error: "Field not found." };
  }

  await prisma.customBookingField.update({
    where: { id },
    data: {
      label: values.label,
      type: values.type,
      required: values.required,
      options: values.type === "SELECT" ? normalizeOptions(values.options) : null,
    },
  });
  return { ok: true };
}

export async function deleteCustomField(
  shop: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.customBookingField.findFirst({
    where: { id, shop },
  });
  if (!existing) {
    return { ok: false, error: "Field not found." };
  }
  await prisma.customBookingField.delete({ where: { id } });
  return { ok: true };
}

/** Bulk-updates sortOrder to match the given id order (drag-and-drop reordering). */
export async function reorderCustomFields(
  shop: string,
  orderedIds: string[],
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.customBookingField.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}

function normalizeOptions(raw: string): string {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .join(",");
}

/** Widget-facing shape: just what's needed to render and validate the field. */
export type PublicCustomField = {
  fieldKey: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[]; // empty for non-SELECT types
};

export function toPublicField(field: CustomBookingField): PublicCustomField {
  return {
    fieldKey: field.fieldKey,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options ? field.options.split(",") : [],
  };
}
