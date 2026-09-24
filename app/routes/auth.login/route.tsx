import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessageML } from "./error.server";

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const errorsML = loginErrorMessageML(await login(requestML));

  return { errors: errorsML };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const errorsML = loginErrorMessageML(await login(requestML));

  return {
    errors: errorsML,
  };
};

export default function Auth() {
  const loaderDataML = useLoaderData<typeof loader>();
  const actionDataML = useActionData<typeof action>();
  const [shopML, setShopML] = useState("");
  const { errors: errorsML } = actionDataML || loaderDataML;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
        <s-section heading="Log in">
          <s-text-field
            name="shop"
            label="Shop domain"
            details="example.myshopify.com"
            value={shopML}
            onChange={(eML) => setShopML(eML.currentTarget.value)}
            autocomplete="on"
            error={errorsML.shop}
          ></s-text-field>
          <s-button type="submit">Log in</s-button>
        </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}