import { useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  listBookableProductsML,
  setAllBookableProductsEnabledML,
  setBookableProductEnabledML,
} from "../models/bookableProduct.server";
import { listEnabledLocationsML } from "../models/bookingLocation.server";
import {
  stylesML as settingsStyles,
  backNavButtonStyleML,
  nextNavButtonStyleML,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../components/SettingsUI";

type ProductListItem = {
  id: string;
  title: string;
  status: string;
  isEnabled: boolean;
};

const PRODUCTS_PER_PAGE_ML = 10;

const ACCENT_ML = "#073E74";
const LINE_BORDER_ML = "#DBDBDB";
const INPUT_BORDER_ML = "#E9E9EA";
const TEXT_BLACK_ML = "#000000";

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
      stroke={ACCENT_ML}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1.5 1.5)"
    />
  </svg>
);

const stylesML: Record<string, React.CSSProperties> = {
  outerCard: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
    borderRadius: "8px",
    marginTop: "-16px",
  },
  headerActions: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  enableAllWrap: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  enableAllLabel: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
    whiteSpace: "nowrap",
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
    padding: "16px",
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
    color: TEXT_BLACK_ML,
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
    border: `1px solid ${INPUT_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
    padding: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${LINE_BORDER_ML}`,
    margin: 0,
    width: "100%",
  },
  paginationRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    paddingTop: "4px",
  },
  paginationButton: {
    fontFamily: "Inter",
    fontWeight: 500,
    fontSize: "14px",
    color: ACCENT_ML,
    background: "#FFFFFF",
    border: `1px solid ${LINE_BORDER_ML}`,
    borderRadius: "6px",
    padding: "6px 14px",
    cursor: "pointer",
  },
  paginationLabel: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: "14px",
    color: TEXT_BLACK_ML,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "640px",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "17px",
    color: TEXT_BLACK_ML,
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
    lineHeight: "16px",
    color: TEXT_BLACK_ML,
    padding: "6px 8px",
    borderTop: `1px solid ${LINE_BORDER_ML}`,
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
    border: `1px solid ${LINE_BORDER_ML}`,
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
    color: TEXT_BLACK_ML,
    margin: 0,
    padding: "16px 8px",
  },
};

export const loader = async ({ request: requestML }: LoaderFunctionArgs) => {
  const { admin: adminML, session: sessionML } = await authenticate.admin(requestML);

  const productEdgesML: Array<{
    node: { id: string; title: string; status: string };
  }> = [];
  let hasNextPageML = true;
  let afterCursorML: string | null = null;

  while (hasNextPageML) {
    const responseML: Response = await adminML.graphql(
      `#graphql
        query BookingProductsList($afterML: String) {
          products(first: 50, sortKey: TITLE, after: $afterML) {
            edges {
              node {
                id
                title
                status
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`,
      { variables: { afterML: afterCursorML } },
    );
    const responseJsonML = await responseML.json();
    const pageEdgesML = responseJsonML.data?.products?.edges ?? [];
    productEdgesML.push(...pageEdgesML);

    const pageInfoML = responseJsonML.data?.products?.pageInfo;
    hasNextPageML = Boolean(pageInfoML?.hasNextPage);
    afterCursorML = pageInfoML?.endCursor ?? null;
  }

  const bookableProductsML = await listBookableProductsML(sessionML.shop);
  const enabledByProductIdML = new Map(
    bookableProductsML.map((pML) => [pML.productId, pML.isEnabled]),
  );

  const productsML: ProductListItem[] = productEdgesML.map(
    (edgeML: { node: { id: string; title: string; status: string } }) => ({
      id: edgeML.node.id,
      title: edgeML.node.title,
      status: edgeML.node.status,
      isEnabled: enabledByProductIdML.get(edgeML.node.id) ?? false,
    }),
  );

  const enabledLocationsML = await listEnabledLocationsML(sessionML.shop);

  return { products: productsML, hasLocations: enabledLocationsML.length > 0 };
};

export const action = async ({ request: requestML }: ActionFunctionArgs) => {
  const { session: sessionML } = await authenticate.admin(requestML);
  const formDataML = await requestML.formData();

  const intentML = String(formDataML.get("intent") ?? "toggle");
  const isEnabledML = formDataML.get("isEnabled") === "true";

  if (intentML === "bulkToggle") {
    if (isEnabledML) {
      const enabledLocationsML = await listEnabledLocationsML(sessionML.shop);
      if (enabledLocationsML.length === 0) {
        return {
          ok: false as const,
          error:
            "Add at least one location in Booking Settings before enabling booking for products.",
        };
      }
    }

    const productsRawML = String(formDataML.get("products") ?? "[]");
    let productsML: { id: string; title: string }[] = [];
    try {
      productsML = JSON.parse(productsRawML);
    } catch {
      productsML = [];
    }

    if (productsML.length === 0) {
      return { ok: false as const };
    }

    await setAllBookableProductsEnabledML(sessionML.shop, productsML, isEnabledML);
    return { ok: true as const };
  }

  const productIdML = String(formDataML.get("productId") ?? "");
  const productTitleML = String(formDataML.get("productTitle") ?? "");

  if (!productIdML || !productTitleML) {
    return { ok: false as const };
  }

  if (isEnabledML) {
    const enabledLocationsML = await listEnabledLocationsML(sessionML.shop);
    if (enabledLocationsML.length === 0) {
      return {
        ok: false as const,
        error:
          "Add at least one location in Booking Settings before enabling booking for a product.",
      };
    }
  }

  await setBookableProductEnabledML(
    sessionML.shop,
    productIdML,
    productTitleML,
    isEnabledML,
  );

  return { ok: true as const };
};

export default function BookingProductsPage() {
  const { products: productsML, hasLocations: hasLocationsML } = useLoaderData<typeof loader>();
  const fetcherML = useFetcher<typeof action>();
  const shopifyML = useAppBridge();
  const [queryML, setQueryML] = useState("");
  const [pageML, setPageML] = useState(1);

  const isSubmittingML = fetcherML.state !== "idle";
  const pendingIntentML = isSubmittingML
    ? String(fetcherML.formData?.get("intent") ?? "toggle")
    : "";
  const isBulkSubmittingML = pendingIntentML === "bulkToggle";
  const pendingProductIdML =
    isSubmittingML && !isBulkSubmittingML
      ? String(fetcherML.formData?.get("productId") ?? "")
      : "";

  useEffect(() => {
    if (fetcherML.data && !fetcherML.data.ok && "error" in fetcherML.data) {
      shopifyML.toast.show(fetcherML.data.error, { isError: true });
    }
  }, [fetcherML.data, shopifyML]);

  const toggleML = (productML: ProductListItem) => {
    fetcherML.submit(
      {
        productId: productML.id,
        productTitle: productML.title,
        isEnabled: String(!productML.isEnabled),
      },
      { method: "POST" },
    );
  };

  const allEnabledML =
    productsML.length > 0 && productsML.every((productML) => productML.isEnabled);

  const toggleAllML = () => {
    fetcherML.submit(
      {
        intent: "bulkToggle",
        isEnabled: String(!allEnabledML),
        products: JSON.stringify(
          productsML.map((productML) => ({
            id: productML.id,
            title: productML.title,
          })),
        ),
      },
      { method: "POST" },
    );
  };

  const filteredProductsML = useMemo(() => {
    const termML = queryML.trim().toLowerCase();
    if (!termML) return productsML;
    return productsML.filter((productML) =>
      productML.title.toLowerCase().includes(termML),
    );
  }, [productsML, queryML]);

  const pageCountML = Math.max(
    1,
    Math.ceil(filteredProductsML.length / PRODUCTS_PER_PAGE_ML),
  );
  const currentPageML = Math.min(pageML, pageCountML);

  useEffect(() => {
    setPageML(1);
  }, [queryML]);

  const paginatedProductsML = useMemo(
    () =>
      filteredProductsML.slice(
        (currentPageML - 1) * PRODUCTS_PER_PAGE_ML,
        currentPageML * PRODUCTS_PER_PAGE_ML,
      ),
    [filteredProductsML, currentPageML],
  );

  return (
    <s-page heading="Booking and Reservation" inlineSize="700px">
      <div style={stylesML.outerCard}>
        <div>
          <h1 style={settingsStyles.heading}>Products</h1>
          <p style={settingsStyles.pageSubtitle}>
            Turn booking on for any product, then configure its slot
            rules if it needs anything different from your shop&apos;s
            default Booking Settings.
          </p>
        </div>

        {!hasLocationsML && (
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

        <div style={stylesML.listCard}>
          <div style={stylesML.listHeaderRow}>
            <p style={stylesML.listTitle}>All Products</p>
            <div style={stylesML.headerActions}>
              {productsML.length > 0 && (
                <div style={stylesML.enableAllWrap}>
                  <span style={stylesML.enableAllLabel}>
                    {isBulkSubmittingML ? "Updating..." : "Enable all"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allEnabledML}
                    aria-label="Enable booking for all products"
                    onClick={toggleAllML}
                    disabled={isSubmittingML || (!hasLocationsML && !allEnabledML)}
                    style={{
                      ...stylesML.toggleButton,
                      ...(isSubmittingML || (!hasLocationsML && !allEnabledML)
                        ? { opacity: 0.5, cursor: "not-allowed" }
                        : {}),
                    }}
                  >
                    {allEnabledML ? (
                      <img src="/enable.svg" width={46} height={24} alt="" />
                    ) : (
                      <span style={stylesML.toggleOff}>
                        <span style={stylesML.toggleKnob} />
                      </span>
                    )}
                  </button>
                </div>
              )}
              <div style={stylesML.searchBox}>
                <SearchIcon />
                <input
                  type="text"
                  value={queryML}
                  onChange={(eventML) => setQueryML(eventML.target.value)}
                  placeholder="Search by product name"
                  style={stylesML.searchInput}
                />
              </div>
            </div>
          </div>

          <hr style={stylesML.divider} />

          {productsML.length === 0 ? (
            <p style={stylesML.emptyText}>No products found in this store yet.</p>
          ) : filteredProductsML.length === 0 ? (
            <p style={stylesML.emptyText}>
              No products match &ldquo;{queryML}&rdquo;.
            </p>
          ) : (
            <div style={stylesML.tableWrap}>
              <table className="eb-table" style={stylesML.table}>
                <thead>
                  <tr>
                    <th style={stylesML.th}>Product</th>
                    <th style={{ ...stylesML.th, ...stylesML.thCenter }}>
                      Status
                    </th>
                    <th style={{ ...stylesML.th, ...stylesML.thCenter }}>
                      Booking enabled
                    </th>
                    <th style={{ ...stylesML.th, ...stylesML.thAction }}>
                      Configure
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProductsML.map((productML) => {
                    const isActiveML = productML.status === "ACTIVE";
                    const isPendingML = pendingProductIdML === productML.id;
                    const toggleDisabledML =
                      isPendingML || (!hasLocationsML && !productML.isEnabled);

                    return (
                      <tr key={productML.id} className="eb-row">
                        <td className="eb-cell-primary" style={stylesML.td}>
                          {productML.title}
                        </td>
                        <td
                          data-label="Status"
                          style={{ ...stylesML.td, ...stylesML.tdCenter }}
                        >
                          <span
                            style={{
                              ...stylesML.statusBadge,
                              background: isActiveML ? "#BEFFBA" : "#F1F1F1",
                              color: isActiveML ? "#000000" : "#666666",
                            }}
                          >
                            {productML.status}
                          </span>
                        </td>
                        <td
                          data-label="Booking enabled"
                          style={{ ...stylesML.td, ...stylesML.tdCenter }}
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={productML.isEnabled}
                            aria-label={`${
                              productML.isEnabled ? "Disable" : "Enable"
                            } booking for ${productML.title}`}
                            onClick={() => toggleML(productML)}
                            disabled={toggleDisabledML}
                            style={{
                              ...stylesML.toggleButton,
                              ...(toggleDisabledML
                                ? { opacity: 0.5, cursor: "not-allowed" }
                                : {}),
                            }}
                          >
                            {productML.isEnabled ? (
                              <img
                                src="/enable.svg"
                                width={46}
                                height={24}
                                alt=""
                              />
                            ) : (
                              <span style={stylesML.toggleOff}>
                                <span style={stylesML.toggleKnob} />
                              </span>
                            )}
                          </button>
                        </td>
                        <td
                          className="eb-cell-action"
                          style={{ ...stylesML.td, ...stylesML.tdAction }}
                        >
                          <Link
                            to={`/app/products/${productML.id.split("/").pop()}`}
                            style={stylesML.iconButton}
                            aria-label={`Configure ${productML.title}`}
                          >
                            <img
                              src="/edit-icon.svg"
                              width={44}
                              height={40}
                              alt=""
                            />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredProductsML.length > PRODUCTS_PER_PAGE_ML && (
            <div style={stylesML.paginationRow}>
              <button
                type="button"
                onClick={() => setPageML((pML) => Math.max(1, pML - 1))}
                disabled={currentPageML === 1}
                style={backNavButtonStyleML(currentPageML === 1)}
              >
                <ChevronLeftIcon />
                Previous
              </button>
              <span style={stylesML.paginationLabel}>
                Page {currentPageML} of {pageCountML}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPageML((pML) => Math.min(pageCountML, pML + 1))
                }
                disabled={currentPageML === pageCountML}
                style={nextNavButtonStyleML(currentPageML === pageCountML)}
              >
                Next
                <ChevronRightIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgsML) => {
  return boundary.headers(headersArgsML);
};