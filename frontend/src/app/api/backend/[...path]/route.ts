// we are adding this file because we don't have auth yet, we could get rid of this once we have a more sophisticated auth flow set up.
// this is just a way for us to effectively prevent our backend from getting DDOSed - backend is not rate-limited yet.

const backendUrl  = process.env.BACKEND_URL;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function POST(request: Request, context: RouteContext) {
  const proxySecret = process.env.BACKEND_PROXY_SECRET;

  if (!proxySecret) {
    return Response.json(
      { detail: "BACKEND_PROXY_SECRET is not configured" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const contentType = request.headers.get("content-type") ?? "application/json";
  const response = await fetch(`${backendUrl}/${path.join("/")}`, {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-jev-proxy-secret": proxySecret,
    },
    body: await request.text(),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
