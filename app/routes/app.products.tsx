import { useEffect, useMemo, useState } from "react";
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
  listBookableProducts,
  setBookableProductEnabled,
} from "../models/bookableProduct.server";
import { listEnabledLocations } from "../models/bookingLocation.server";

type ProductListItem = {
  id: string;
  title: string;
  status: string;
  isEnabled: boolean;
};

const ACCENT = "#073E74";
const LINE_BORDER = "#DBDBDB";
const INPUT_BORDER = "#E9E9EA";
const TEXT_BLACK = "#000000";

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 19L14.657 14.657M16.778 8.889C16.778 11.246 15.841 13.507 14.174 15.174C12.507 16.841 10.246 17.778 7.889 17.778C5.531 17.778 3.27 16.841 1.603 15.174C-0.063 13.507 -1 11.246 -1 8.889C-1 6.531 -0.063 4.27 1.603 2.603C3.27 0.937 5.531 0 7.889 0C10.246 0 12.507 0.937 14.174 2.603C15.841 4.27 16.778 6.531 16.778 8.889Z"
      stroke={ACCENT}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1.5 1.5)"
    />
  </svg>
);

const styles: Record<string, React.CSSProperties> = {
  listCard: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER}`,
    borderRadius: "8px",
    padding: "16px",
    marginTop: "16px",
  },
  listHeaderRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    width: "100%",
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
  searchBox: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "5px 10px",
    gap: "10px",
    width: "260px",
    maxWidth: "100%",
    height: "34px",
    background: "#FFFFFF",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "4px",
  },
  searchInput: {
    flex: "1 1 auto",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    padding: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER}`,
    margin: 0,
    width: "100%",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    padding: "0 8px 12px",
    whiteSpace: "nowrap",
  },
  thAction: {
    textAlign: "right",
  },
  thCenter: {
    textAlign: "center",
  },
  td: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    padding: "12px 8px",
    borderTop: `1px solid ${LINE_BORDER}`,
    verticalAlign: "middle",
  },
  tdCenter: {
    textAlign: "center",
  },
  tdAction: {
    textAlign: "right",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 14px",
    borderRadius: "50px",
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "15px",
  },
  toggleButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "46px",
    height: "24px",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  toggleOff: {
    position: "relative",
    display: "block",
    boxSizing: "border-box",
    width: "46px",
    height: "24px",
    borderRadius: "12px",
    background: "#E4E4E4",
    border: `1px solid ${LINE_BORDER}`,
  },
  toggleKnob: {
    position: "absolute",
    top: "50%",
    left: "3px",
    transform: "translateY(-50%)",
    width: "17px",
    height: "17px",
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
  },
  iconButton: {
    display: "inline-flex",
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
    textDecoration: "none",
  },
  emptyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK,
    margin: 0,
    padding: "16px 8px",
  },
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

  const enabledLocations = await listEnabledLocations(session.shop);

  return { products, hasLocations: enabledLocations.length > 0 };
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

  if (isEnabled) {
    const enabledLocations = await listEnabledLocations(session.shop);
    if (enabledLocations.length === 0) {
      return {
        ok: false as const,
        error:
          "Add at least one location in Booking Settings before enabling booking for a product.",
      };
    }
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
  const { products, hasLocations } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [query, setQuery] = useState("");

  const isSubmitting = fetcher.state !== "idle";
  const pendingProductId = isSubmitting
    ? String(fetcher.formData?.get("productId") ?? "")
    : "";

  useEffect(() => {
    if (fetcher.data && !fetcher.data.ok && "error" in fetcher.data) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

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

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      product.title.toLowerCase().includes(term),
    );
  }, [products, query]);

  return (
    <s-page heading="Booking Products" inlineSize="950px">
      <s-section>
        <s-paragraph>
          Turn booking on for any product, then configure its slot rules if it
          needs anything different from your shop&apos;s default Booking
          Settings.
        </s-paragraph>

        {!hasLocations && (
          <s-banner tone="warning" heading="No locations configured">
            <s-paragraph>
              Add at least one location before enabling booking on a
              product — every slot needs one to know its timezone.
            </s-paragraph>
            <s-link href="/app/settings/locations">
              Go to Locations
            </s-link>
          </s-banner>
        )}

        <div style={styles.listCard}>
          <div style={styles.listHeaderRow}>
            <p style={styles.listTitle}>All Products</p>
            <div style={styles.searchBox}>
              <SearchIcon />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by product name"
                style={styles.searchInput}
              />
            </div>
          </div>

          <hr style={styles.divider} />

          {products.length === 0 ? (
            <p style={styles.emptyText}>No products found in this store yet.</p>
          ) : filteredProducts.length === 0 ? (
            <p style={styles.emptyText}>
              No products match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={{ ...styles.th, ...styles.thCenter }}>
                      Status
                    </th>
                    <th style={{ ...styles.th, ...styles.thCenter }}>
                      Booking enabled
                    </th>
                    <th style={{ ...styles.th, ...styles.thAction }}>
                      Configure
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isActive = product.status === "ACTIVE";
                    const isPending = pendingProductId === product.id;
                    const toggleDisabled =
                      isPending || (!hasLocations && !product.isEnabled);

                    return (
                      <tr key={product.id}>
                        <td style={styles.td}>{product.title}</td>
                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              background: isActive ? "#BEFFBA" : "#F1F1F1",
                              color: isActive ? "#000000" : "#666666",
                            }}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, ...styles.tdCenter }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={product.isEnabled}
                            aria-label={`${
                              product.isEnabled ? "Disable" : "Enable"
                            } booking for ${product.title}`}
                            onClick={() => toggle(product)}
                            disabled={toggleDisabled}
                            style={{
                              ...styles.toggleButton,
                              ...(toggleDisabled
                                ? { opacity: 0.5, cursor: "not-allowed" }
                                : {}),
                            }}
                          >
                            {product.isEnabled ? (
                              <img
                                src="/enable.svg"
                                width={46}
                                height={24}
                                alt=""
                              />
                            ) : (
                              <span style={styles.toggleOff}>
                                <span style={styles.toggleKnob} />
                              </span>
                            )}
                          </button>
                        </td>
                        <td style={{ ...styles.td, ...styles.tdAction }}>
                          <a
                            href={`/app/products/${product.id.split("/").pop()}`}
                            style={styles.iconButton}
                            aria-label={`Configure ${product.title}`}
                          >
                            <img
                              src="/edit-icon.svg"
                              width={22}
                              height={22}
                              alt=""
                            />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};