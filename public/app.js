(function () {
  "use strict";

  var titleEl = document.getElementById("title");
  var descriptionEl = document.getElementById("description");
  var overallBadgeEl = document.getElementById("overall-badge");
  var summaryEl = document.getElementById("summary");
  var summaryUpEl = document.getElementById("summary-up");
  var summaryDownEl = document.getElementById("summary-down");
  var summaryTotalEl = document.getElementById("summary-total");
  var bannerEl = document.getElementById("banner");
  var servicesEl = document.getElementById("services");
  var lastUpdatedEl = document.getElementById("last-updated");
  var refreshBtn = document.getElementById("refresh-btn");
  var cardTemplate = document.getElementById("service-card-template");

  var pollTimer = null;
  var pollIntervalMs = 20000;

  var overallLabels = {
    operational: "All Systems Operational",
    outage: "Service Outage",
    degraded: "Degraded Performance",
    maintenance: "Under Maintenance",
  };

  function formatPing(ping) {
    if (ping === null || ping === undefined) return "—";
    return Math.round(ping) + " ms";
  }

  function formatUptime(uptime) {
    if (uptime === null || uptime === undefined) return "—";
    return uptime.toFixed(2) + "%";
  }

  function formatTime(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleString();
  }

  function statusClass(status) {
    if (status === 0) return "down";
    if (status === 1) return "up";
    if (status === 3) return "maintenance";
    return "pending";
  }

  function renderBanner(data) {
    if (data.incident && data.incident.title) {
      bannerEl.hidden = false;
      bannerEl.innerHTML =
        "<strong>" +
        data.incident.title +
        "</strong>" +
        (data.incident.content || "");
      return;
    }

    var maintenance = data.maintenance || [];
    var activeMaintenance = null;
    for (var i = 0; i < maintenance.length; i++) {
      if (maintenance[i].active && maintenance[i].status !== "ended") {
        activeMaintenance = maintenance[i];
        break;
      }
    }

    if (activeMaintenance && activeMaintenance.title) {
      bannerEl.hidden = false;
      bannerEl.innerHTML =
        "<strong>" +
        activeMaintenance.title +
        "</strong>" +
        (activeMaintenance.description || "");
      return;
    }

    bannerEl.hidden = true;
    bannerEl.textContent = "";
  }

  function renderServices(services) {
    servicesEl.innerHTML = "";

    if (!services.length) {
      servicesEl.innerHTML =
        '<div class="empty-state">No monitors are published on this status page yet. Add monitors to your Uptime Kuma status page.</div>';
      return;
    }

    for (var i = 0; i < services.length; i++) {
      var service = services[i];
      var card = cardTemplate.content.cloneNode(true);
      var article = card.querySelector(".service-card");

      article.classList.add(statusClass(service.status));
      card.querySelector(".service-group").textContent = service.group || "Services";
      card.querySelector(".service-name").textContent = service.name;
      card.querySelector(".ping").textContent = formatPing(service.ping);
      card.querySelector(".uptime").textContent = formatUptime(service.uptime24h);
      card.querySelector(".service-message").textContent = service.message;

      servicesEl.appendChild(card);
    }
  }

  function renderError(errorPayload) {
    titleEl.textContent = "Dashboard Error";
    descriptionEl.textContent = "Could not load status page data.";
    overallBadgeEl.textContent = "Error";
    overallBadgeEl.className = "overall-badge error";
    summaryEl.hidden = true;
    bannerEl.hidden = true;
    servicesEl.innerHTML =
      '<div class="error-state">' +
      "<p>" +
      (errorPayload.error || "Unknown error") +
      "</p>" +
      "<p>Check that the dashboard server is running and your <code>.env</code> file is configured.</p>" +
      "</div>";
    lastUpdatedEl.textContent = "Last attempt failed";
  }

  function renderDashboard(data) {
    titleEl.textContent = data.title;
    descriptionEl.textContent = data.description || "";
    overallBadgeEl.textContent = overallLabels[data.overallStatus] || "Status";
    overallBadgeEl.className = "overall-badge " + data.overallStatus;

    summaryEl.hidden = false;
    summaryUpEl.textContent = data.summary.up;
    summaryDownEl.textContent = data.summary.down;
    summaryTotalEl.textContent = data.summary.total;

    renderBanner(data);
    renderServices(data.services);
    lastUpdatedEl.textContent = "Updated " + formatTime(data.fetchedAt);
  }

  function loadStatus() {
    refreshBtn.disabled = true;

    fetch("/api/status")
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            renderError(data);
            return;
          }
          renderDashboard(data);
        });
      })
      .catch(function (error) {
        renderError({ error: error.message });
      })
      .finally(function () {
        refreshBtn.disabled = false;
      });
  }

  function init() {
    if (!titleEl || !refreshBtn || !cardTemplate) {
      document.body.innerHTML =
        '<div class="error-state" style="margin:24px">Dashboard failed to initialize. Try refreshing the page.</div>';
      return;
    }

    fetch("/api/config")
      .then(function (response) {
        return response.json();
      })
      .then(function (config) {
        pollIntervalMs = config.pollIntervalMs || 20000;
      })
      .catch(function () {
        pollIntervalMs = 20000;
      })
      .finally(function () {
        loadStatus();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(loadStatus, pollIntervalMs);
      });

    refreshBtn.addEventListener("click", loadStatus);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
