import type { CustomBookingField, CustomFieldType } from "@prisma/client";
import prismaML from "../db.server";

export type CustomFieldFormValues = {
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string;
};

export type CustomFieldFieldErrors = Partial<
  Record<keyof CustomFieldFormValues, string>
>;

const MAX_LABEL_LENGTH_ML = 80;
const MAX_OPTIONS_ML = 20;

function slugifyML(labelML: string): string {
  return (
    labelML
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}

async function uniqueFieldKeyML(shopML: string, baseML: string): Promise<string> {
  let candidateML = baseML;
  let suffixML = 2;

  while (
    await prismaML.customBookingField.findUnique({
      where: { shop_fieldKey: { shop: shopML, fieldKey: candidateML } },
    })
  ) {
    candidateML = `${baseML}-${suffixML}`;
    suffixML += 1;
  }
  return candidateML;
}

export async function listCustomFieldsML(
  shopML: string,
): Promise<CustomBookingField[]> {
  return prismaML.customBookingField.findMany({
    where: { shop: shopML },
    orderBy: { sortOrder: "asc" },
  });
}

export function parseCustomFieldFormML(formDataML: FormData): {
  values: CustomFieldFormValues;
  errors: CustomFieldFieldErrors;
} {
  const errorsML: CustomFieldFieldErrors = {};

  const labelML = String(formDataML.get("label") ?? "").trim();
  if (!labelML) {
    errorsML.label = "Enter a question or field label.";
  } else if (labelML.length > MAX_LABEL_LENGTH_ML) {
    errorsML.label = `Keep it under ${MAX_LABEL_LENGTH_ML} characters.`;
  }

  const typeRawML = String(formDataML.get("type") ?? "TEXT");
  const validTypesML: CustomFieldType[] = ["TEXT", "TEXTAREA", "NUMBER", "SELECT"];
  const typeML = validTypesML.includes(typeRawML as CustomFieldType)
    ? (typeRawML as CustomFieldType)
    : "TEXT";

  const requiredML = formDataML.get("required") === "true";
  const optionsRawML = String(formDataML.get("options") ?? "").trim();

  if (typeML === "SELECT") {
    const optionsML = optionsRawML
      .split(",")
      .map((oML) => oML.trim())
      .filter(Boolean);
    if (optionsML.length === 0) {
      errorsML.options = "Add at least one option, separated by commas.";
    } else if (optionsML.length > MAX_OPTIONS_ML) {
      errorsML.options = `Keep it to ${MAX_OPTIONS_ML} options or fewer.`;
    }
  }

  return {
    values: { label: labelML, type: typeML, required: requiredML, options: optionsRawML },
    errors: errorsML,
  };
}

export async function createCustomFieldML(
  shopML: string,
  valuesML: CustomFieldFormValues,
): Promise<CustomBookingField> {
  const baseKeyML = slugifyML(valuesML.label);
  const fieldKeyML = await uniqueFieldKeyML(shopML, baseKeyML);

  const lastFieldML = await prismaML.customBookingField.findFirst({
    where: { shop: shopML },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrderML = (lastFieldML?.sortOrder ?? -1) + 1;

  return prismaML.customBookingField.create({
    data: {
      shop: shopML,
      fieldKey: fieldKeyML,
      label: valuesML.label,
      type: valuesML.type,
      required: valuesML.required,
      options: valuesML.type === "SELECT" ? normalizeOptionsML(valuesML.options) : null,
      sortOrder: sortOrderML,
    },
  });
}

export async function updateCustomFieldML(
  shopML: string,
  idML: string,
  valuesML: CustomFieldFormValues,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existingML = await prismaML.customBookingField.findFirst({
    where: { id: idML, shop: shopML },
  });
  if (!existingML) {
    return { ok: false, error: "Field not found." };
  }

  await prismaML.customBookingField.update({
    where: { id: idML },
    data: {
      label: valuesML.label,
      type: valuesML.type,
      required: valuesML.required,
      options: valuesML.type === "SELECT" ? normalizeOptionsML(valuesML.options) : null,
    },
  });
  return { ok: true };
}

export async function deleteCustomFieldML(
  shopML: string,
  idML: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existingML = await prismaML.customBookingField.findFirst({
    where: { id: idML, shop: shopML },
  });
  if (!existingML) {
    return { ok: false, error: "Field not found." };
  }
  await prismaML.customBookingField.delete({ where: { id: idML } });
  return { ok: true };
}

export async function reorderCustomFieldsML(
  shopML: string,
  orderedIdsML: string[],
): Promise<void> {
  await prismaML.$transaction(
    orderedIdsML.map((idML, indexML) =>
      prismaML.customBookingField.update({
        where: { id: idML },
        data: { sortOrder: indexML },
      }),
    ),
  );
}

function normalizeOptionsML(rawML: string): string {
  return rawML
    .split(",")
    .map((oML) => oML.trim())
    .filter(Boolean)
    .join(",");
}

export type PublicCustomField = {
  fieldKey: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
};

export function toPublicFieldML(fieldML: CustomBookingField): PublicCustomField {
  return {
    fieldKey: fieldML.fieldKey,
    label: fieldML.label,
    type: fieldML.type,
    required: fieldML.required,
    options: fieldML.options ? fieldML.options.split(",") : [],
  };
}