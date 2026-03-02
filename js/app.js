/* =========================================================
   Selection Slip App – FINAL (Responsive + QR + iPhone SAFE)
   ========================================================= */

let MASTER = [];
let currentRecord = null;

const TRACK_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxLSML3csbZjm-0DKVcg0BDBQM2Nz9iqzXxUunrA98Ydeq115PlLiD1hRyn_MRnK8t33A/exec";

const $ = (sel) => document.querySelector(sel);

/* ------------------------------ */
async function loadData() {
  try {
    const res = await fetch("./data/masterlist.json", { cache: "no-store" });
    if (!res.ok) throw new Error("masterlist.json not found");
    MASTER = await res.json();
  } catch (err) {
    showStatus("danger", "Master list could not be loaded.");
  }
}

/* ------------------------------ */
function normalizeRef(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function findRecordByRef(ref) {
  const target = normalizeRef(ref);
  return MASTER.find((r) => normalizeRef(r.reference) === target) || null;
}

function showStatus(type, html) {
  $("#resultArea").classList.remove("d-none");
  const card = $("#statusCard");
  card.className = `alert alert-${type}`;
  card.innerHTML = html;
}

function togglePrint(show) {
  $("#printBtn").classList.toggle("d-none", !show);
  $("#slipPreviewWrap").classList.toggle("d-none", !show);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

/* ------------------------------
   Responsive Slip
-------------------------------- */
function buildSlipHTML(r) {
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const photo =
    r.photoUrl?.trim() ||
    "https://via.placeholder.com/240x280.png?text=Passport";

  const edu = r.educationLevel?.trim() || "—";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    normalizeRef(r.reference)
  )}`;

  return `
  <style>
    .slip-container {
      max-width: 800px;
      margin: auto;
      padding: 20px;
      background: #fff;
    }

    .media-row {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 30px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 25px;
    }

    @media (max-width: 768px) {
      .media-row {
        flex-direction: column;
        align-items: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .slip-container {
        padding: 15px;
      }
    }
  </style>

  <div class="slip-container">

    <div class="text-center mb-3">
      <h5>Appointment Notification Slip</h5>
      <div class="small">State Recruitment Committee</div>
      <div class="small">Issued: ${dateStr}</div>
    </div>

    <div class="text-center mb-3">
      <strong>Reference:</strong> ${escapeHtml(r.reference)}
    </div>

    <div class="media-row">
      <div style="text-align:center;">
        <img src="${photo}"
             style="width:180px;height:220px;object-fit:cover;border:1px solid #333;"
             onerror="this.src='https://via.placeholder.com/240x280.png?text=Passport'">
        <div class="small mt-2">Passport</div>
      </div>

      <div style="text-align:center;">
        <img src="${qrUrl}"
             style="width:180px;height:180px;border:1px solid #333;">
        <div class="small mt-2">Scan to Verify</div>
      </div>
    </div>

    <div class="text-center mb-3">
      <h4>${escapeHtml(r.name)}</h4>
    </div>

    <div class="info-grid">

      <div style="border:1px solid #ddd;padding:12px;">
        <div style="font-size:12px;color:#666;">Course</div>
        <div style="font-weight:600;">${escapeHtml(r.course)}</div>
      </div>

      <div style="border:1px solid #ddd;padding:12px;">
        <div style="font-size:12px;color:#666;">Education Level</div>
        <div style="font-weight:600;">${escapeHtml(edu)}</div>
      </div>

      <div style="border:1px solid #ddd;padding:12px;">
        <div style="font-size:12px;color:#666;">LGA</div>
        <div style="font-weight:600;">${escapeHtml(r.lga)}</div>
      </div>

      <div style="border:1px solid #ddd;padding:12px;">
        <div style="font-size:12px;color:#666;">Serial Number</div>
        <div style="font-weight:600;">${escapeHtml(r.serial)}</div>
      </div>

    </div>

    <div style="margin-top:25px;font-size:14px;">
      <strong>Next Steps:</strong><br>
      Present this slip at the Office of the State Head of Service,
      Usman Faruku Secretariat, with copies of your credentials.
    </div>

  </div>
  `;
}

/* ------------------------------ */
function trackEvent(action, record) {
  try {
    const params = new URLSearchParams({
      action,
      reference: normalizeRef(record.reference),
      name: record.name || "",
      serial: String(record.serial || ""),
      page: location.href,
      t: Date.now().toString(),
    });
    new Image().src = `${TRACK_WEBHOOK_URL}?${params.toString()}`;
  } catch (e) {}
}

/* ------------------------------ */
function printSlip() {
  if (!currentRecord) return;

  trackEvent("generated", currentRecord);

  sessionStorage.setItem("SLIP_HTML", buildSlipHTML(currentRecord));
  window.open("./print.html", "_blank");
}

/* ------------------------------ */
function wireUI() {
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ref = $("#refInput").value.trim();
    if (!ref) return;

    const r = findRecordByRef(ref);
    currentRecord = r;

    if (!r) {
      showStatus(
        "danger",
        `<div class="fw-bold">Not Selected</div>
         <div class="small">Sorry! Your Reference Number is either wrong or not among the selected.</div>`
      );
      togglePrint(false);
      return;
    }

    showStatus(
      "success",
      `<div class="fw-bold">Congratulations!</div>
       <div class="small">You have been selected. Click <b>Print Slip</b> to proceed.</div>`
    );

    togglePrint(true);
    $("#slip").innerHTML = buildSlipHTML(r);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#printBtn")) {
      e.preventDefault();
      printSlip();
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  wireUI();
});
