import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response=await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    const responseHeaders=new Headers(response.headers);
    responseHeaders.set('X-Content-Type-Options','nosniff');
    responseHeaders.set('X-Frame-Options','DENY');
    responseHeaders.set('Referrer-Policy','strict-origin-when-cross-origin');
    responseHeaders.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    const path=new URL(request.url).pathname;
    if(path==='/'||path.startsWith('/entry/')||path.endsWith('.xml'))responseHeaders.set('Cache-Control','no-store');
    if(path.startsWith('/admin')||path.startsWith('/api/admin')||path.startsWith('/my-entries')){
      responseHeaders.set('Cache-Control','no-store, private');
      responseHeaders.set('X-Robots-Tag','noindex, nofollow');
    }
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:responseHeaders});
  },
};

export default worker;
