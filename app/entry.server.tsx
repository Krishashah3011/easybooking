import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  requestML: Request,
  responseStatusCodeML: number,
  responseHeadersML: Headers,
  reactRouterContextML: EntryContext
) {
  addDocumentResponseHeaders(requestML, responseHeadersML);
  const userAgentML = requestML.headers.get("user-agent");
  const callbackNameML = isbot(userAgentML ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolveML, rejectML) => {
    const { pipe: pipeML, abort: abortML } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContextML}
        url={requestML.url}
      />,
      {
        [callbackNameML]: () => {
          const bodyML = new PassThrough();
          const streamML = createReadableStreamFromReadable(bodyML);

          responseHeadersML.set("Content-Type", "text/html");
          resolveML(
            new Response(streamML, {
              headers: responseHeadersML,
              status: responseStatusCodeML,
            })
          );
          pipeML(bodyML);
        },
        onShellError(errorML) {
          rejectML(errorML);
        },
        onError(errorML) {
          responseStatusCodeML = 500;
          console.error(errorML);
        },
      }
    );
    
    setTimeout(abortML, streamTimeout + 1000);
  });
}