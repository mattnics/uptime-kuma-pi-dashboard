import express from "express";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const UPTIME_KUMA_URL = (process.env.UPTIME_KUMA_URL || "http://100.82.211.69:3010").replace(
  /\/$/,
  ""
);
const STATUS_PAGE_SLUG = process.env.STATUS_PAGE_SLUG || "";
const PORT = Number(process.env.PORT || 3080);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20000);

const STATUS_LABELS = {
  0: "Down",
  1: "Up",
  2: "Pending",
  3: "Maintenance",
};

function latestHeartbeat(heartbeats) {
  if (!heartbeats?.length) return null;
  return heartbeats.reduce((latest, beat) =>
    new Date(beat.time) > new Date(latest.time) ? beat : latest
  );
}

function flattenMonitors(publicGroupList = []) {
  return publicGroupList.flatMap((group) =>
    (group.monitorList || []).map((monitor) => ({
      ...monitor,
      groupName: group.name,
    }))
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.json();
}

async function fetchStatusPageData() {
  if (!STATUS_PAGE_SLUG) {
    throw new Error(
      "STATUS_PAGE_SLUG is not set. Copy .env.example to .env and add your status page slug."
    );
  }

  const [pageData, heartbeatData] = await Promise.all([
    fetchJson(`${UPTIME_KUMA_URL}/api/status-page/${STATUS_PAGE_SLUG}`),
    fetchJson(`${UPTIME_KUMA_URL}/api/status-page/heartbeat/${STATUS_PAGE_SLUG}`),
  ]);

  const monitors = flattenMonitors(pageData.publicGroupList);
  const heartbeatList = heartbeatData.heartbeatList || {};
  const uptimeList = heartbeatData.uptimeList || {};

  const services = monitors.map((monitor) => {
    const heartbeats = heartbeatList[String(monitor.id)] || [];
    const latest = latestHeartbeat(heartbeats);
    const uptimeKey = `${monitor.id}_24`;
    const uptime24h = uptimeList[uptimeKey];

    return {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      group: monitor.groupName,
      status: latest?.status ?? 2,
      statusLabel: STATUS_LABELS[latest?.status ?? 2] || "Unknown",
      ping: latest?.ping ?? null,
      message: latest?.msg || "No data yet",
      lastCheck: latest?.time || null,
      uptime24h: typeof uptime24h === "number" ? uptime24h * 100 : null,
    };
  });

  const downCount = services.filter((s) => s.status === 0).length;
  const maintenanceCount = services.filter((s) => s.status === 3).length;
  const upCount = services.filter((s) => s.status === 1).length;

  let overallStatus = "operational";
  if (downCount > 0) overallStatus = "outage";
  else if (maintenanceCount > 0) overallStatus = "maintenance";
  else if (services.some((s) => s.status === 2)) overallStatus = "degraded";

  return {
    title: pageData.config?.title || "Service Status",
    description: pageData.config?.description || "",
    slug: STATUS_PAGE_SLUG,
    overallStatus,
    summary: {
      total: services.length,
      up: upCount,
      down: downCount,
      maintenance: maintenanceCount,
    },
    incident: pageData.incident,
    maintenance: pageData.maintenanceList || [],
    services,
    fetchedAt: new Date().toISOString(),
    pollIntervalMs: POLL_INTERVAL_MS,
    uptimeKumaUrl: UPTIME_KUMA_URL,
  };
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(STATUS_PAGE_SLUG) });
});

app.get("/api/config", (_req, res) => {
  res.json({
    title: "Uptime Kuma Dashboard",
    pollIntervalMs: POLL_INTERVAL_MS,
    configured: Boolean(STATUS_PAGE_SLUG),
    statusPageSlug: STATUS_PAGE_SLUG || null,
    uptimeKumaUrl: UPTIME_KUMA_URL,
  });
});

app.get("/api/status", async (_req, res) => {
  try {
    const data = await fetchStatusPageData();
    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: error.message,
      configured: Boolean(STATUS_PAGE_SLUG),
      statusPageSlug: STATUS_PAGE_SLUG || null,
      uptimeKumaUrl: UPTIME_KUMA_URL,
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pi dashboard running at http://0.0.0.0:${PORT}`);
  console.log(`Uptime Kuma: ${UPTIME_KUMA_URL}`);
  console.log(`Status page slug: ${STATUS_PAGE_SLUG || "(not configured)"}`);
});
