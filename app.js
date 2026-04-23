const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback
const ALERT_DISTANCE_METERS = 250;
const REPORTS_TO_PROMOTE_HIGH_RISK = 1000;
const PROMOTION_BUCKET_DECIMALS = 3;
const ZONES_STORAGE_KEY = "roadSafetyZonesCacheV1";
const REPORTS_STORAGE_KEY = "nearMissReportsV1";
const REPORTS_API_ENDPOINT = "/api/reports";
const GA4_MEASUREMENT_ID =
  document.querySelector('meta[name="ga4-measurement-id"]')?.content?.trim() || "";

const HARDCODED_DANGER_ZONES = [
  { id: "dz-1", name: "Rajiv Chowk Junction", lat: 28.6328, lng: 77.2197 },
  { id: "dz-2", name: "ITO Crossing", lat: 28.6289, lng: 77.2428 },
  { id: "dz-3", name: "AIIMS Flyover", lat: 28.5672, lng: 77.21 },
  { id: "dz-4", name: "Dhaula Kuan Circle", lat: 28.5921, lng: 77.1649 },
  { id: "dz-5", name: "Kakinada Port Junction", lat: 16.9891, lng: 82.2475 },
  { id: "dz-6", name: "Sarpavaram Junction, Kakinada", lat: 17.0211, lng: 82.2465 },
  { id: "dz-7", name: "RTC Complex Area, Kakinada", lat: 16.955, lng: 82.2383 },
  { id: "dz-8", name: "Benz Circle, Vijayawada", lat: 16.5062, lng: 80.648 },
  { id: "dz-9", name: "Dwaraka Bus Station Junction, Visakhapatnam", lat: 17.7237, lng: 83.3017 },
  { id: "dz-10", name: "Guntur Lodge Center", lat: 16.299, lng: 80.4377 },
  { id: "dz-11", name: "Andheri Junction, Mumbai", lat: 19.1197, lng: 72.8468 },
  { id: "dz-12", name: "Silk Board Junction, Bengaluru", lat: 12.9177, lng: 77.6229 },
  { id: "dz-13", name: "Charminar Approach Road, Hyderabad", lat: 17.3616, lng: 78.4747 },
  { id: "dz-14", name: "Park Street Crossing, Kolkata", lat: 22.5525, lng: 88.3526 },
  { id: "dz-15", name: "Ashram Road Junction, Ahmedabad", lat: 23.0346, lng: 72.5612 },
  { id: "dz-16", name: "Swargate Chowk, Pune", lat: 18.5003, lng: 73.8628 },
  { id: "dz-17", name: "Ram Nagar Square, Nagpur", lat: 21.1466, lng: 79.0618 },
  { id: "dz-18", name: "Master Canteen Square, Bhubaneswar", lat: 20.2722, lng: 85.8425 },
  { id: "dz-19", name: "Anna Salai Junction, Chennai", lat: 13.0604, lng: 80.2496 },
  { id: "dz-20", name: "Hawa Mahal Road Junction, Jaipur", lat: 26.9239, lng: 75.8267 },
  { id: "dz-21", name: "Hazratganj Crossing, Lucknow", lat: 26.8506, lng: 80.9462 },
  { id: "dz-22", name: "Godowlia Chowk, Varanasi", lat: 25.3076, lng: 83.0102 },
  { id: "dz-23", name: "Boring Road Crossing, Patna", lat: 25.6154, lng: 85.1173 },
  { id: "dz-24", name: "Sector 17 Junction, Chandigarh", lat: 30.7415, lng: 76.7756 },
  { id: "dz-25", name: "Lal Chowk Junction, Srinagar", lat: 34.0721, lng: 74.8066 },
  { id: "dz-26", name: "Pan Bazaar Junction, Guwahati", lat: 26.1862, lng: 91.7476 },
  { id: "dz-27", name: "Mapusa Circle, Goa", lat: 15.5927, lng: 73.8097 },
  { id: "dz-28", name: "Railway Station Circle, Indore", lat: 22.7179, lng: 75.8648 },
  { id: "dz-29", name: "Lalbagh Square, Bhopal", lat: 23.2599, lng: 77.4126 },
  { id: "dz-30", name: "Clock Tower Junction, Jodhpur", lat: 26.2968, lng: 73.0226 },
  { id: "dz-31", name: "Rani Talab Chowk, Ranchi", lat: 23.3699, lng: 85.3252 },
  { id: "dz-32", name: "Sector 62 Crossing, Noida", lat: 28.6286, lng: 77.3729 },
  { id: "dz-33", name: "Sector 29 IFFCO Chowk, Gurugram", lat: 28.4691, lng: 77.0731 },
  { id: "dz-34", name: "Clock Tower Junction, Dehradun", lat: 30.3256, lng: 78.0437 },
  { id: "dz-35", name: "Golden Temple Approach, Amritsar", lat: 31.62, lng: 74.8765 },
  { id: "dz-36", name: "Nehru Place Junction, New Delhi", lat: 28.5494, lng: 77.2517 },
  { id: "dz-37", name: "Bistupur Main Road, Jamshedpur", lat: 22.8046, lng: 86.2029 },
  { id: "dz-38", name: "Frazer Road Crossing, Patna", lat: 25.6094, lng: 85.1366 },
  { id: "dz-39", name: "Old Bus Stand Junction, Surat", lat: 21.1702, lng: 72.8311 },
  { id: "dz-40", name: "Vani Vihar Square, Bhubaneswar", lat: 20.2961, lng: 85.8245 },
  { id: "dz-41", name: "NH-16 Highway Junction, Surampalem", lat: 17.083095, lng: 82.073541 }
];

const statusText = document.getElementById("statusText");
const locationText = document.getElementById("locationText");
const reportBtn = document.getElementById("reportBtn");
const zoneCountText = document.getElementById("zoneCount");
const reportCountText = document.getElementById("reportCount");
const statusBadge = document.getElementById("statusBadge");
const homeScreen = document.getElementById("homeScreen");
const appShell = document.getElementById("appShell");
const startBtn = document.getElementById("startBtn");
const installBtn = document.getElementById("installBtn");
const mapSection = document.getElementById("map");
const mapGuideArrow = document.getElementById("mapGuideArrow");
const zoneAlertToast = document.getElementById("zoneAlertToast");

let map;
let userMarker;
let userAccuracyCircle;
let nearMissLayer;
let dangerZoneLayer;
let tileLayer;
let userLocation = { ...DEFAULT_LOCATION };
let hasCenteredOnUser = false;
let reportsPollTimer = null;
let deferredInstallPrompt = null;
let geoWatchId = null;
let alertHideTimer = null;
const zonesInProximity = new Set();
let activeDangerZones = [];

function initializeAnalytics() {
  if (!GA4_MEASUREMENT_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, { anonymize_ip: true });

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA4_MEASUREMENT_ID
  )}`;
  gtagScript.onerror = () => {
    // Keep app behavior unchanged if analytics script fails to load.
  };
  document.head.appendChild(gtagScript);
}

function trackEvent(eventName, params = {}) {
  if (!GA4_MEASUREMENT_ID || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizeZone(zone, index) {
  if (!zone || typeof zone !== "object") return null;

  const lat = Number(zone.lat);
  const lng = Number(zone.lng);
  const name = String(zone.name || `Risk Zone ${index + 1}`).trim();
  const id = String(zone.id || `zone-${index + 1}`).trim();

  if (!isValidCoordinate(lat, lng) || !name || !id) return null;
  return { id, name, lat, lng };
}

function setStatus(message) {
  statusText.textContent = message;
  const text = String(message || "").toLowerCase();
  if (text.includes("warning")) {
    statusBadge.textContent = "Warning";
  } else if (text.includes("blocked") || text.includes("fallback")) {
    statusBadge.textContent = "Fallback";
  } else if (text.includes("loading") || text.includes("fetching") || text.includes("initializing")) {
    statusBadge.textContent = "Loading";
  } else {
    statusBadge.textContent = "Active";
  }
}

function setLocationText(lat, lng) {
  if (!isValidCoordinate(lat, lng)) {
    locationText.textContent = "Location: unavailable";
    return;
  }
  locationText.textContent = `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("LocalStorage write failed:", error);
  }
}

function loadJSON(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error("LocalStorage read failed:", error);
    return fallbackValue;
  }
}

function getBaseDangerZones() {
  const cached = loadJSON(ZONES_STORAGE_KEY, []);
  const cachedZones = Array.isArray(cached) ? cached : [];
  const cachedDz41 = cachedZones.find((zone) => String(zone?.id) === "dz-41");
  // #region agent log
  fetch('http://127.0.0.1:7542/ingest/6d44c4f0-f4ef-4ea1-901a-f1151c7fad7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42ac17'},body:JSON.stringify({sessionId:'42ac17',runId:'initial',hypothesisId:'H4',location:'app.js:getBaseDangerZones',message:'Loaded cached/base zones for merge',data:{cachedCount:cachedZones.length,cachedDz41Lat:cachedDz41?.lat,cachedDz41Lng:cachedDz41?.lng},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const normalized = [...cachedZones, ...HARDCODED_DANGER_ZONES].map(normalizeZone).filter(Boolean);
  const uniqueById = Array.from(new Map(normalized.map((zone) => [zone.id, zone])).values());
  if (!uniqueById.length) {
    const safeFallback = HARDCODED_DANGER_ZONES.map(normalizeZone).filter(Boolean);
    saveJSON(ZONES_STORAGE_KEY, safeFallback);
    return safeFallback;
  }

  saveJSON(ZONES_STORAGE_KEY, uniqueById);
  return uniqueById;
}

function toBucket(value, decimals = PROMOTION_BUCKET_DECIMALS) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getAutoPromotedDangerZonesFromReports(reports) {
  const areaBuckets = new Map();
  reports.forEach((report) => {
    const lat = Number(report?.lat);
    const lng = Number(report?.lng);
    if (!isValidCoordinate(lat, lng)) return;

    const bucketLat = toBucket(lat);
    const bucketLng = toBucket(lng);
    const key = `${bucketLat.toFixed(PROMOTION_BUCKET_DECIMALS)},${bucketLng.toFixed(
      PROMOTION_BUCKET_DECIMALS
    )}`;
    const prev = areaBuckets.get(key) || { count: 0, latSum: 0, lngSum: 0 };
    areaBuckets.set(key, {
      count: prev.count + 1,
      latSum: prev.latSum + lat,
      lngSum: prev.lngSum + lng
    });
  });

  const promoted = Array.from(areaBuckets.entries())
    .filter(([, data]) => data.count >= REPORTS_TO_PROMOTE_HIGH_RISK)
    .map(([key, data]) => ({
      id: `auto-risk-${key}`,
      name: `Auto high-risk zone (${data.count} reports)`,
      lat: data.latSum / data.count,
      lng: data.lngSum / data.count
    }))
    .map(normalizeZone)
    .filter(Boolean);
  return promoted;
}

function getDangerZones(reports = []) {
  const baseZones = getBaseDangerZones();
  const promotedZones = getAutoPromotedDangerZonesFromReports(reports);
  const combined = [...baseZones, ...promotedZones].map(normalizeZone).filter(Boolean);
  const uniqueById = Array.from(new Map(combined.map((zone) => [zone.id, zone])).values());
  const resolvedDz41 = uniqueById.find((zone) => zone.id === "dz-41");
  // #region agent log
  fetch('http://127.0.0.1:7542/ingest/6d44c4f0-f4ef-4ea1-901a-f1151c7fad7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42ac17'},body:JSON.stringify({sessionId:'42ac17',runId:'initial',hypothesisId:'H4',location:'app.js:getDangerZones',message:'Resolved final danger zones',data:{finalCount:uniqueById.length,dz41Lat:resolvedDz41?.lat,dz41Lng:resolvedDz41?.lng},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  saveJSON(ZONES_STORAGE_KEY, uniqueById);
  return uniqueById;
}

function getNearMissReportsFromStorage() {
  const reports = loadJSON(REPORTS_STORAGE_KEY, []);
  if (!Array.isArray(reports)) return [];

  return reports
    .map((report) => {
      const lat = Number(report?.lat);
      const lng = Number(report?.lng);
      if (!isValidCoordinate(lat, lng)) return null;
      return {
        id: String(report.id || `report-${Date.now()}`),
        lat,
        lng,
        timestamp: Number(report.timestamp || Date.now())
      };
    })
    .filter(Boolean);
}

function saveNearMissReports(reports) {
  saveJSON(REPORTS_STORAGE_KEY, reports);
}

async function fetchNearMissReportsFromServer() {
  try {
    const response = await fetch(REPORTS_API_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!Array.isArray(payload)) return null;
    return payload
      .map((report) => {
        const lat = Number(report?.lat);
        const lng = Number(report?.lng);
        if (!isValidCoordinate(lat, lng)) return null;
        return {
          id: String(report.id || `report-${Date.now()}`),
          lat,
          lng,
          timestamp: Number(report.timestamp || Date.now())
        };
      })
      .filter(Boolean);
  } catch (error) {
    return null;
  }
}

async function postNearMissReportToServer(report) {
  try {
    const response = await fetch(REPORTS_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function syncNearMissReports(zones) {
  const sharedReports = await fetchNearMissReportsFromServer();
  if (!Array.isArray(sharedReports)) return false;
  saveNearMissReports(sharedReports);
  refreshMapData(sharedReports);
  return true;
}

function setCounts(zonesCount, reportsCount) {
  zoneCountText.textContent = String(zonesCount);
  reportCountText.textContent = String(reportsCount);
}

function requestNotificationPermissionIfNeeded() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function showInstallButton() {
  if (!installBtn) return;
  installBtn.classList.remove("is-hidden");
}

function hideInstallButton() {
  if (!installBtn) return;
  installBtn.classList.add("is-hidden");
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice?.outcome === "accepted") {
    hideInstallButton();
  }
  deferredInstallPrompt = null;
}

function showMapGuideHint() {
  // #region agent log
  fetch('http://127.0.0.1:7542/ingest/6d44c4f0-f4ef-4ea1-901a-f1151c7fad7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42ac17'},body:JSON.stringify({sessionId:'42ac17',runId:'initial',hypothesisId:'H1',location:'app.js:showMapGuideHint:start',message:'Attempting to show map guide hint',data:{hasGuideArrow:Boolean(mapGuideArrow),hasMapSection:Boolean(mapSection),mapSectionTop:mapSection?.getBoundingClientRect?.().top ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!mapGuideArrow || !mapSection) return;

  mapGuideArrow.classList.remove("is-hidden");
  mapGuideArrow.classList.add("pulse");
  mapSection.scrollIntoView({ behavior: "smooth", block: "start" });

  setTimeout(() => {
    mapGuideArrow.classList.remove("pulse");
    mapGuideArrow.classList.add("is-hidden");
  }, 4500);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function setupReliableTileLayer() {
  const googleRoadLayer = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    maxZoom: 21,
    attribution: "Map data by Google"
  });

  const arcgisLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri"
    }
  );

  const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  });

  const cartoFallbackLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      subdomains: "abcd",
      attribution:
        '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  );

  const providers = [googleRoadLayer, arcgisLayer, osmLayer, cartoFallbackLayer];
  let providerIndex = 0;
  let providerErrorCount = 0;

  function switchToProvider(index) {
    if (tileLayer && map.hasLayer(tileLayer)) {
      map.removeLayer(tileLayer);
    }

    if (index >= providers.length) {
      tileLayer = createOfflineGridLayer().addTo(map);
      trackEvent("map_provider_changed", { provider: "offline_grid" });
      setStatus("All online map APIs blocked. Using offline demo map.");
      return;
    }

    providerIndex = index;
    providerErrorCount = 0;
    tileLayer = providers[providerIndex].addTo(map);

    if (providerIndex === 0) {
      trackEvent("map_provider_changed", { provider: "google_tiles" });
      setStatus("Using Google-based map tiles.");
    } else if (providerIndex === 1) {
      trackEvent("map_provider_changed", { provider: "arcgis" });
      setStatus("Google blocked. Switched to ArcGIS.");
    } else if (providerIndex === 2) {
      trackEvent("map_provider_changed", { provider: "openstreetmap" });
      setStatus("Primary APIs blocked. Switched to OpenStreetMap.");
    } else {
      trackEvent("map_provider_changed", { provider: "carto" });
      setStatus("Primary APIs blocked. Switched to CARTO tiles.");
    }

    tileLayer.on("tileerror", () => {
      providerErrorCount += 1;
      if (providerErrorCount > 2) {
        switchToProvider(providerIndex + 1);
      }
    });
  }

  switchToProvider(0);
}

function createOfflineGridLayer() {
  const OfflineGridLayer = L.GridLayer.extend({
    createTile(coords) {
      const tile = document.createElement("div");
      tile.style.width = "256px";
      tile.style.height = "256px";
      tile.style.background = "#eef3fb";
      tile.style.border = "1px solid #d5e0f0";
      tile.style.color = "#7b8da7";
      tile.style.fontSize = "11px";
      tile.style.display = "flex";
      tile.style.alignItems = "center";
      tile.style.justifyContent = "center";
      tile.textContent = `Offline tile z${coords.z}/${coords.x}/${coords.y}`;
      return tile;
    }
  });

  return new OfflineGridLayer({
    attribution: "Offline demo base layer",
    tileSize: 256
  });
}

function renderDangerZones(zones) {
  if (!dangerZoneLayer) return;
  dangerZoneLayer.clearLayers();
  zones.forEach((zone) => {
    L.circle([zone.lat, zone.lng], {
      radius: ALERT_DISTANCE_METERS,
      color: "#d7263d",
      fillColor: "#d7263d",
      fillOpacity: 0.2,
      weight: 1.5
    }).addTo(dangerZoneLayer)
      .bindPopup(`<strong>${zone.name}</strong><br/>High-risk area`);

    L.circleMarker([zone.lat, zone.lng], {
      radius: 7,
      color: "#a90f22",
      fillColor: "#d7263d",
      fillOpacity: 1,
      weight: 2
    }).addTo(dangerZoneLayer)
      .bindTooltip(`Risk: ${zone.name}`);
  });
}

function renderNearMissReports(reports) {
  nearMissLayer.clearLayers();
  reports.forEach((report) => {
    const timeLabel = new Date(report.timestamp).toLocaleString();
    L.circleMarker([report.lat, report.lng], {
      radius: 6,
      color: "#1b998b",
      fillColor: "#1b998b",
      fillOpacity: 0.9,
      weight: 1
    })
      .bindPopup(`Near-miss reported<br/>${timeLabel}`)
      .addTo(nearMissLayer);
  });
}

function showOneTimeZoneAlert(zone) {
  if (zoneAlertToast) {
    zoneAlertToast.textContent = `Warning: Entering high-risk area (${zone.name})`;
    zoneAlertToast.classList.remove("is-hidden");
    if (alertHideTimer) {
      clearTimeout(alertHideTimer);
    }
    alertHideTimer = setTimeout(() => {
      zoneAlertToast.classList.add("is-hidden");
    }, 4500);
  }

  trackEvent("danger_zone_alert", {
    zone_id: zone.id,
    zone_name: zone.name
  });
  setStatus(`Warning: High-risk area ahead (${zone.name}).`);

  if ("vibrate" in navigator) {
    navigator.vibrate([220, 120, 220]);
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Road Safety Alert", { body: `You are entering a high-risk area: ${zone.name}` });
    return;
  }
}

function evaluateProximity(zones, current) {
  if (!isValidCoordinate(current.lat, current.lng)) return;
  const currentZones = new Set();
  zones.forEach((zone) => {
    const meters = distanceMeters(current.lat, current.lng, zone.lat, zone.lng);
    if (meters <= ALERT_DISTANCE_METERS) {
      currentZones.add(zone.id);
      if (!zonesInProximity.has(zone.id)) {
        showOneTimeZoneAlert(zone);
      }
    }
  });
  zonesInProximity.clear();
  currentZones.forEach((zoneId) => zonesInProximity.add(zoneId));
}

function refreshMapData(reports) {
  activeDangerZones = getDangerZones(reports);
  renderDangerZones(activeDangerZones);
  renderNearMissReports(reports);
  setCounts(activeDangerZones.length, reports.length);
}

function updateUserOnMap(position) {
  const lat = Number(position?.coords?.latitude);
  const lng = Number(position?.coords?.longitude);
  const accuracy = Number(position?.coords?.accuracy || 0);

  if (!isValidCoordinate(lat, lng)) {
    setStatus("GPS data invalid. Using fallback location.");
    return;
  }

  userLocation = { lat, lng };
  setLocationText(lat, lng);
  setStatus("Live tracking active.");

  if (!userMarker) {
    userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here");
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (!userAccuracyCircle) {
    userAccuracyCircle = L.circle([lat, lng], {
      radius: Math.max(accuracy, 20),
      color: "#216fed",
      fillColor: "#216fed",
      fillOpacity: 0.15,
      weight: 1
    }).addTo(map);
  } else {
    userAccuracyCircle.setLatLng([lat, lng]);
    userAccuracyCircle.setRadius(Math.max(accuracy, 20));
  }

  if (!hasCenteredOnUser) {
    map.setView([lat, lng], 14);
    hasCenteredOnUser = true;
  }
}

async function addNearMissReport() {
  const lat = Number(userLocation?.lat);
  const lng = Number(userLocation?.lng);
  if (!isValidCoordinate(lat, lng)) {
    setStatus("Cannot report near-miss: location unavailable.");
    return;
  }

  const reports = getNearMissReportsFromStorage();
  const report = {
    id: `report-${Date.now()}`,
    lat,
    lng,
    timestamp: Date.now()
  };
  reports.push(report);
  saveNearMissReports(reports);
  refreshMapData(reports);
  const isShared = await postNearMissReportToServer(report);
  if (isShared) {
    await syncNearMissReports(activeDangerZones);
    trackEvent("near_miss_reported", { mode: "shared" });
    setStatus("Near-miss reported and shared.");
  } else {
    trackEvent("near_miss_reported", { mode: "local_only" });
    setStatus("Near-miss saved locally (sharing server unavailable).");
  }
}

function useFallbackLocation(message) {
  userLocation = { ...DEFAULT_LOCATION };
  setLocationText(userLocation.lat, userLocation.lng);
  setStatus(message);
  if (!userMarker) {
    userMarker = L.marker([userLocation.lat, userLocation.lng])
      .addTo(map)
      .bindPopup("Fallback location");
  } else {
    userMarker.setLatLng([userLocation.lat, userLocation.lng]);
  }
  map.setView([userLocation.lat, userLocation.lng], 13);
}

function startLocationTracking(zones) {
  if (!("geolocation" in navigator)) {
    useFallbackLocation("Geolocation unavailable. Using fallback location.");
    return;
  }

  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }

  setStatus("Fetching location...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      updateUserOnMap(position);
      evaluateProximity(activeDangerZones, userLocation);
    },
    (error) => {
      console.error("Initial GPS error:", error);
      useFallbackLocation("Location permission denied. Using fallback location.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );

  geoWatchId = navigator.geolocation.watchPosition(
    (position) => {
      updateUserOnMap(position);
      evaluateProximity(activeDangerZones, userLocation);
    },
    (error) => {
      console.error("GPS watch error:", error);
      if (error?.code === 1) {
        setStatus("Location permission denied. Using fallback location.");
        useFallbackLocation("Location permission denied. Using fallback location.");
      } else if (error?.code === 2) {
        setStatus("GPS unavailable. Move to open sky for live tracking.");
      } else {
        setStatus("GPS timeout. Waiting for next live location update...");
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function init() {
  initializeAnalytics();
  trackEvent("app_session_started", {
    has_service_worker: Boolean(navigator.serviceWorker?.controller)
  });
  // #region agent log
  fetch('http://127.0.0.1:7542/ingest/6d44c4f0-f4ef-4ea1-901a-f1151c7fad7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42ac17'},body:JSON.stringify({sessionId:'42ac17',runId:'initial',hypothesisId:'H3',location:'app.js:init',message:'Initializing app with service worker context',data:{swController:Boolean(navigator.serviceWorker?.controller),swScript:navigator.serviceWorker?.controller?.scriptURL ?? null,navigationType:performance?.getEntriesByType?.('navigation')?.[0]?.type ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  map = L.map("map", { zoomControl: true }).setView(
    [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
    12
  );

  setupReliableTileLayer();

  dangerZoneLayer = L.layerGroup().addTo(map);
  nearMissLayer = L.layerGroup().addTo(map);

  const nearMissReports = getNearMissReportsFromStorage();
  refreshMapData(nearMissReports);

  reportBtn.addEventListener("click", addNearMissReport);
  startLocationTracking(activeDangerZones);

  syncNearMissReports(activeDangerZones);
  if (reportsPollTimer) {
    clearInterval(reportsPollTimer);
  }
  reportsPollTimer = setInterval(() => {
    syncNearMissReports(activeDangerZones);
  }, 5000);
}

function openAppFromHome() {
  trackEvent("home_start_clicked");
  // #region agent log
  fetch('http://127.0.0.1:7542/ingest/6d44c4f0-f4ef-4ea1-901a-f1151c7fad7a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'42ac17'},body:JSON.stringify({sessionId:'42ac17',runId:'initial',hypothesisId:'H2',location:'app.js:openAppFromHome',message:'Start Safety Map clicked',data:{homeHiddenBefore:homeScreen.classList.contains('is-hidden'),appHiddenBefore:appShell.classList.contains('is-hidden')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  homeScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  requestNotificationPermissionIfNeeded();
  init();
  // Map container becomes visible only after start.
  setTimeout(() => {
    map.invalidateSize();
    showMapGuideHint();
  }, 0);
}

startBtn.addEventListener("click", openAppFromHome);
if (installBtn) {
  installBtn.addEventListener("click", installApp);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallButton();
});
