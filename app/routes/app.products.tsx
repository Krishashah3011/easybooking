import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  listBookableProducts,
  setBookableProductEnabled,
} from "../models/bookableProduct.server";

type ProductListItem = {
  id: string;
  title: string;
  status: string;
  isEnabled: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query BookingProductsList {
        products(first: 50, sortKey: TITLE) {
          edges {
            node {
              id
              title
              status
            }
          }
        }
      }`,
  );
  const responseJson = await response.json();
  const productEdges = responseJson.data?.products?.edges ?? [];

  const bookableProducts = await listBookableProducts(session.shop);
  const enabledByProductId = new Map(
    bookableProducts.map((p) => [p.productId, p.isEnabled]),
  );

  const products: ProductListItem[] = productEdges.map(
    (edge: { node: { id: string; title: string; status: string } }) => ({
      id: edge.node.id,
      title: edge.node.title,
      status: edge.node.status,
      isEnabled: enabledByProductId.get(edge.node.id) ?? false,
    }),
  );

  return { products };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = String(formData.get("productId") ?? "");
  const productTitle = String(formData.get("productTitle") ?? "");
  const isEnabled = formData.get("isEnabled") === "true";

  if (!productId || !productTitle) {
    return { ok: false as const };
  }

  await setBookableProductEnabled(
    session.shop,
    productId,
    productTitle,
    isEnabled,
  );

  return { ok: true as const };
};

export default function BookingProductsPage() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const toggle = (product: ProductListItem) => {
    fetcher.submit(
      {
        productId: product.id,
        productTitle: product.title,
        isEnabled: String(!product.isEnabled),
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Booking Products">
      <s-section>
        <s-paragraph>
          Turn booking on for any product, then configure its slot rules if it
          needs anything different from your shop&apos;s default Booking
          Settings.
        </s-paragraph>

        {products.length === 0 ? (
          <s-paragraph>No products found in this store yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Booking enabled</s-table-header>
              <s-table-header>Configure</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {products.map((product) => (
                <s-table-row key={product.id}>
                  <s-table-cell>{product.title}</s-table-cell>
                  <s-table-cell>
                    <s-badge
                      tone={product.status === "ACTIVE" ? "success" : "neutral"}
                    >
                      {product.status}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    <s-switch
                      checked={product.isEnabled}
                      onChange={() => toggle(product)}
                    ></s-switch>
                  </s-table-cell>
                  <s-table-cell>
                    <s-link
                      href={`/app/products/${encodeURIComponent(product.id)}`}
                    >
                      Configure
                    </s-link>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
