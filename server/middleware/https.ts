import { getRequestHeader, sendRedirect } from "h3";

const FORCE_HTTPS = (process.env.FORCE_HTTPS ?? "").toLowerCase() === "true";

export default defineEventHandler((event) => {
  if (!FORCE_HTTPS) return;

  const proto = getRequestHeader(event, "x-forwarded-proto");
  if (!proto || proto === "https") return;

  const host = getRequestHeader(event, "x-forwarded-host") || getRequestHeader(event, "host");
  if (!host) return;

  const url = `https://${host}${event.node.req.url ?? "/"}`;
  return sendRedirect(event, url, 308);
});
