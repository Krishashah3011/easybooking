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

type FieldChangeEvent = { currentTarget: { value: string } };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSmtpSettings(session.shop);
  return { values: toFormValues(settings) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { values, errors } = parseSmtpSettingsForm(formData);

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values };
  }

  const saved = await upsertSmtpSettings(session.shop, values);
  return { ok: true as const, errors: {}, values: toFormValues(saved) };
};

export default function SmtpSettingsPage() {
  const { values: initialValues } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [values, setValues] = useState<SmtpSettingsFormValues>(initialValues);

  const errors: SmtpSettingsFieldErrors = fetcher.data?.errors ?? {};
  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.ok) {
      setValues(fetcher.data.values);
      shopify.toast.show("SMTP settings saved");
    }
  }, [fetcher.data, shopify]);

  const setField = <K extends keyof SmtpSettingsFormValues>(
    key: K,
    value: SmtpSettingsFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    fetcher.submit(
      {
        host: values.host,
        port: values.port,
        username: values.username,
        password: values.password,
        fromEmail: values.fromEmail,
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Settings">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Email (SMTP) settings">
        <s-paragraph>
          Used to send booking confirmation, reminder, and cancellation
          emails to your customers. Enter your SMTP provider's details
          below — once saved here, this app no longer reads SMTP
          credentials from environment variables.
        </s-paragraph>

        <s-stack direction="inline" gap="base">
          <s-text-field
            label="SMTP host"
            placeholder="smtp.example.com"
            value={values.host}
            error={errors.host}
            onChange={(e: FieldChangeEvent) =>
              setField("host", e.currentTarget.value)
            }
          ></s-text-field>
          <s-number-field
            label="SMTP port"
            placeholder="587"
            value={values.port}
            error={errors.port}
            onChange={(e: FieldChangeEvent) =>
              setField("port", e.currentTarget.value)
            }
          ></s-number-field>
        </s-stack>

        <s-stack direction="inline" gap="base">
          <s-text-field
            label="SMTP username"
            placeholder="Enter SMTP username"
            value={values.username}
            error={errors.username}
            onChange={(e: FieldChangeEvent) =>
              setField("username", e.currentTarget.value)
            }
          ></s-text-field>
          <s-password-field
            label="SMTP password"
            placeholder="Enter SMTP password"
            autocomplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={(e: FieldChangeEvent) =>
              setField("password", e.currentTarget.value)
            }
          ></s-password-field>
        </s-stack>

        <s-text-field
          label="From email"
          placeholder="bookings@yourdomain.com"
          details="The email address customers see booking emails sent from."
          value={values.fromEmail}
          error={errors.fromEmail}
          onChange={(e: FieldChangeEvent) =>
            setField("fromEmail", e.currentTarget.value)
          }
        ></s-text-field>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};