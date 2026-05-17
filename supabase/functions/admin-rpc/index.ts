import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

type AdminRpcResource = "dashboard" | "events" | "eventAnalytics";

type AdminRpcBody = {
  resource?: AdminRpcResource;
  params?: Record<string, string | number | null | undefined>;
};

type AdminEventRow = {
  event_id: string;
  client_install_id: string;
  event_name: string;
  occurred_at: string;
  received_at: string;
  app_version: string | null;
  app_build: string | null;
  os_version: string | null;
  environment: string | null;
  attributes: Record<string, unknown>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ORIGINS = new Set([
  "https://clipa.studio",
  "https://www.clipa.studio",
  "https://admin.clipa.studio",
]);

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (origin.startsWith("http://localhost:")) return origin;
  if (origin.startsWith("http://127.0.0.1:")) return origin;
  if (origin.endsWith(".vercel.app")) return origin;
  return "https://admin.clipa.studio";
}

function json(status: number, body: Record<string, unknown>, corsOrigin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin,
      "Vary": "Origin",
    },
  });
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
}

function toOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function toOptionalIso(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toBoundedLimit(value: unknown): number {
  return Math.max(10, Math.min(Number(value || 50), 100));
}

function toSinceDays(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value === "all") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventDateLowerBound(sinceDays: number | null): string | null {
  if (!Number.isFinite(sinceDays)) return null;
  return new Date(Date.now() - Number(sinceDays) * 24 * 60 * 60 * 1000).toISOString();
}

function getAdminTimezone(params: Record<string, string | number | null | undefined>): string {
  return toOptionalString(params.timezone) || "Asia/Seoul";
}

function createUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );
}

function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function throwIfError(error: { message?: string } | null | undefined, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

async function requireAdmin(req: Request): Promise<boolean> {
  const token = getBearerToken(req);
  if (!token) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createUserClient(authHeader);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return false;

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return !profileError && profile?.role === "admin";
}

async function getEventsByClient(
  supabase: SupabaseClient,
  params: Record<string, string | number | null | undefined>,
) {
  const clientInstallId = toOptionalString(params.clientInstallId);
  const eventName = toOptionalString(params.eventName);
  const environment = toOptionalString(params.environment);
  const sinceDays = toSinceDays(params.since);
  const sinceLowerBound = eventDateLowerBound(sinceDays);
  const cursorReceivedAt = toOptionalIso(params.cursorReceivedAt);
  const cursorEventId = toOptionalUuid(params.cursorEventId);
  const limit = toBoundedLimit(params.limit);

  if (!clientInstallId) {
    throw new Error("Client install ID is required.");
  }

  let query = supabase
    .from("client_events")
    .select("event_id, client_install_id, event_name, occurred_at, received_at, app_version, app_build, os_version, environment, attributes")
    .eq("client_install_id", clientInstallId)
    .order("received_at", { ascending: false })
    .order("event_id", { ascending: false })
    .limit(limit + 1);

  if (eventName) query = query.eq("event_name", eventName);
  if (environment) query = query.eq("environment", environment);
  if (sinceLowerBound) query = query.gte("received_at", sinceLowerBound);
  if (cursorReceivedAt && cursorEventId) {
    query = query.or(`received_at.lt.${cursorReceivedAt},and(received_at.eq.${cursorReceivedAt},event_id.lt.${cursorEventId})`);
  }

  const { data, error } = await query;
  throwIfError(error, "이벤트 로그를 불러오지 못했습니다.");

  let namesQuery = supabase
    .from("client_events")
    .select("event_name")
    .eq("client_install_id", clientInstallId)
    .order("event_name", { ascending: true })
    .limit(1000);

  if (environment) namesQuery = namesQuery.eq("environment", environment);
  if (sinceLowerBound) namesQuery = namesQuery.gte("received_at", sinceLowerBound);

  const { data: eventNameRows, error: eventNamesError } = await namesQuery;
  throwIfError(eventNamesError, "이벤트 이름 목록을 불러오지 못했습니다.");

  const rows = (data ?? []) as AdminEventRow[];
  const events = rows.slice(0, limit);
  const extraRow = rows[limit];

  return {
    events,
    eventNames: Array.from(new Set(((eventNameRows ?? []) as Array<{ event_name: string | null }>).map((row) => row.event_name).filter(Boolean))) as string[],
    hasNextPage: rows.length > limit,
    nextCursor: extraRow ? { receivedAt: extraRow.received_at, eventId: extraRow.event_id } : null,
    limit,
  };
}

async function getEvents(
  supabase: SupabaseClient,
  params: Record<string, string | number | null | undefined>,
) {
  const clientInstallId = toOptionalString(params.clientInstallId);
  if (clientInstallId) {
    return getEventsByClient(supabase, params);
  }

  const sinceDays = toSinceDays(params.since);
  const cursorReceivedAt = toOptionalIso(params.cursorReceivedAt);
  const cursorEventId = toOptionalUuid(params.cursorEventId);
  const limit = toBoundedLimit(params.limit);

  const { data, error } = await supabase.rpc("admin_get_events", {
    p_event_name: toOptionalString(params.eventName) || null,
    p_environment: toOptionalString(params.environment) || null,
    p_since_days: Number.isFinite(sinceDays) ? sinceDays : null,
    p_cursor_received_at: cursorReceivedAt,
    p_cursor_event_id: cursorEventId,
    p_limit: limit,
  });

  throwIfError(error, "이벤트 로그를 불러오지 못했습니다.");
  return data;
}

async function getEventAnalytics(
  supabase: SupabaseClient,
  params: Record<string, string | number | null | undefined>,
) {
  const sinceDays = toSinceDays(params.since);

  const { data, error } = await supabase.rpc("admin_get_event_analytics", {
    p_environment: toOptionalString(params.environment) || "prod",
    p_since_days: Number.isFinite(sinceDays) ? sinceDays : null,
    p_timezone: getAdminTimezone(params),
  });

  throwIfError(error, "이벤트 분석을 불러오지 못했습니다.");
  return data;
}

async function getDashboard(
  supabase: SupabaseClient,
  params: Record<string, string | number | null | undefined>,
) {
  const { data, error } = await supabase.rpc("admin_get_dashboard", {
    p_timezone: getAdminTimezone(params),
    p_recent_limit: 8,
  });

  throwIfError(error, "대시보드를 불러오지 못했습니다.");
  return data;
}

Deno.serve(async (req: Request) => {
  const corsOrigin = getCorsOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Vary": "Origin",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, corsOrigin);
  }

  try {
    if (!(await requireAdmin(req))) {
      return json(403, { error: "Admin access required." }, corsOrigin);
    }

    const body = await req.json().catch(() => ({})) as AdminRpcBody;
    const resource = body.resource;
    const params = body.params ?? {};

    if (resource !== "dashboard" && resource !== "events" && resource !== "eventAnalytics") {
      return json(400, { error: "Unknown admin RPC resource." }, corsOrigin);
    }

    const supabase = createServiceClient();
    const data = await ({
      dashboard: () => getDashboard(supabase, params),
      events: () => getEvents(supabase, params),
      eventAnalytics: () => getEventAnalytics(supabase, params),
    } satisfies Record<AdminRpcResource, () => Promise<unknown>>)[resource]();

    return json(200, data && typeof data === "object" ? data as Record<string, unknown> : { data }, corsOrigin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin RPC request failed.";
    return json(500, { error: message }, corsOrigin);
  }
});
