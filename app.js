const AVATARS = ["🦊", "🐯", "🐨", "🐼", "🐸", "🦄", "🐙", "🐝", "🦁", "🐬"];

const kidForm = document.getElementById("kid-form");
const kidNameInput = document.getElementById("kid-name");
const dayInput = document.getElementById("training-day");
const locationInput = document.getElementById("pickup-location");
const needPickupInput = document.getElementById("need-pickup");
const needDropoffInput = document.getElementById("need-dropoff");
const dayFilter = document.getElementById("day-filter");
const requestList = document.getElementById("request-list");
const template = document.getElementById("request-card-template");
const appFeedback = document.getElementById("app-feedback");

let requests = [];
let supabaseClient = null;
let requestsChannel = null;

function getAvatar(seed) {
  const sum = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATARS[sum % AVATARS.length];
}

function setFeedback(message, isError = false) {
  appFeedback.textContent = message;
  appFeedback.classList.toggle("error", isError);
}

async function fetchRequests() {
  if (!supabaseClient) {
    requests = [];
    return;
  }

  const { data, error } = await supabaseClient
    .from("ride_requests")
    .select(
      "id, kid_name, day, location, needs_pickup, needs_dropoff, pickup_parent_name, dropoff_parent_name, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    setFeedback(`Failed to load requests: ${error.message}`, true);
    requests = [];
    return;
  }

  requests = (data || []).map((row) => ({
    id: row.id,
    kidName: row.kid_name,
    day: row.day,
    location: row.location,
    needsPickup: row.needs_pickup,
    needsDropoff: row.needs_dropoff,
    pickupParent: row.pickup_parent_name || "",
    dropoffParent: row.dropoff_parent_name || "",
  }));
}

function renderRequests() {
  const selectedDay = dayFilter.value;
  const visible = requests.filter((request) =>
    selectedDay === "All" ? true : request.day === selectedDay
  );

  requestList.innerHTML = "";

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No lift requests for this filter yet.";
    requestList.appendChild(empty);
    return;
  }

  visible.forEach((request) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.querySelector("[data-avatar]").textContent = getAvatar(`${request.kidName}${request.id}`);
    node.querySelector("[data-kid-name]").textContent = request.kidName;
    node.querySelector("[data-day]").textContent = request.day;

    const needPill = node.querySelector("[data-need]");
    const needLabel = formatNeedText(request);
    needPill.textContent = needLabel;
    needPill.classList.toggle("need-pill-covered", needLabel === "All rides covered");

    const fullyCovered = isFullyCovered(request);
    const coverSummary = node.querySelector("[data-cover-summary]");
    coverSummary.textContent = buildCoverageSummary(request);

    const detailsBody = node.querySelector("[data-details-body]");
    const toggleDetailsButton = node.querySelector("[data-toggle-details]");
    toggleDetailsButton.style.display = fullyCovered ? "inline-block" : "none";
    if (fullyCovered) {
      node.classList.add("minimized");
      toggleDetailsButton.textContent = "View details";
    }

    node.querySelector("[data-location]").textContent = `Location: ${request.location}`;

    const pickupStatus = node.querySelector("[data-pickup-status]");
    const dropoffStatus = node.querySelector("[data-dropoff-status]");
    const pickupForm = node.querySelector('.volunteer-form[data-type="pickup"]');
    const dropoffForm = node.querySelector('.volunteer-form[data-type="dropoff"]');
    const clearPickupBtn = node.querySelector('.clear-btn[data-clear="pickup"]');
    const clearDropoffBtn = node.querySelector('.clear-btn[data-clear="dropoff"]');

    setStatusText(pickupStatus, request.pickupParent, "Pickup not assigned", request.needsPickup);
    setStatusText(
      dropoffStatus,
      request.dropoffParent,
      "Drop-off not assigned",
      request.needsDropoff
    );

    toggleRideInputs(pickupForm, clearPickupBtn, request.needsPickup);
    toggleRideInputs(dropoffForm, clearDropoffBtn, request.needsDropoff);

    node.querySelectorAll(".volunteer-form").forEach((form) => {
      const triggerButton = form.querySelector(".volunteer-trigger");
      const entry = form.querySelector(".volunteer-entry");
      const entryInput = entry.querySelector('input[name="volunteerName"]');
      const cancelButton = entry.querySelector(".cancel-btn");

      triggerButton.addEventListener("click", () => {
        entry.hidden = false;
        triggerButton.hidden = true;
        entryInput.focus();
      });

      cancelButton.addEventListener("click", () => {
        entry.hidden = true;
        triggerButton.hidden = false;
        entryInput.value = "";
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const volunteerName = entryInput.value.trim();
        if (!volunteerName) {
          setFeedback("Please enter your name to volunteer.", true);
          entryInput.focus();
          return;
        }

        const type = form.dataset.type;
        if ((type === "pickup" && !request.needsPickup) || (type === "dropoff" && !request.needsDropoff)) {
          return;
        }

        const payload =
          type === "pickup"
            ? { pickup_parent_name: volunteerName }
            : { dropoff_parent_name: volunteerName };

        const { error } = await supabaseClient.from("ride_requests").update(payload).eq("id", request.id);
        if (error) {
          setFeedback(`Could not save volunteer: ${error.message}`, true);
          return;
        }

        setFeedback(`${volunteerName} is now assigned.`);
        await fetchRequests();
        renderRequests();
      });
    });

    node.querySelectorAll(".clear-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const payload =
          button.dataset.clear === "pickup"
            ? { pickup_parent_name: null }
            : { dropoff_parent_name: null };

        const { error } = await supabaseClient.from("ride_requests").update(payload).eq("id", request.id);
        if (error) {
          setFeedback(`Could not clear assignment: ${error.message}`, true);
          return;
        }

        setFeedback("Ride assignment cleared.");
        await fetchRequests();
        renderRequests();
      });
    });

    node.querySelector(".remove-request").addEventListener("click", async () => {
      const { error } = await supabaseClient.from("ride_requests").delete().eq("id", request.id);
      if (error) {
        setFeedback(`Could not remove request: ${error.message}`, true);
        return;
      }

      setFeedback("Request removed.");
      await fetchRequests();
      renderRequests();
    });

    toggleDetailsButton.addEventListener("click", () => {
      const expanded = node.classList.toggle("expanded");
      detailsBody.style.display = expanded ? "block" : "";
      toggleDetailsButton.textContent = expanded ? "Hide details" : "View details";
    });

    requestList.appendChild(node);
  });
}

function setStatusText(element, value, emptyText, isNeeded) {
  if (!isNeeded) {
    element.textContent = "Not needed";
    element.classList.remove("status-covered");
    element.classList.remove("status-filled");
    element.classList.add("status-empty");
    return;
  }

  if (value) {
    element.textContent = `Covered by ${value}`;
    element.classList.remove("status-empty");
    element.classList.add("status-filled");
    element.classList.add("status-covered");
    return;
  }

  element.textContent = emptyText;
  element.classList.remove("status-covered");
  element.classList.remove("status-filled");
  element.classList.add("status-empty");
}

function toggleRideInputs(form, clearButton, isNeeded) {
  form.style.display = isNeeded ? "flex" : "none";
  clearButton.style.display = isNeeded ? "inline-block" : "none";
}

function formatNeedText(request) {
  const needsPickupNow = request.needsPickup && !request.pickupParent;
  const needsDropoffNow = request.needsDropoff && !request.dropoffParent;

  if (needsPickupNow && needsDropoffNow) {
    return "Still needs both";
  }
  if (needsPickupNow) {
    return "Still needs pickup";
  }
  if (needsDropoffNow) {
    return "Still needs drop-off";
  }
  return "All rides covered";
}

function isFullyCovered(request) {
  const pickupCovered = !request.needsPickup || Boolean(request.pickupParent);
  const dropoffCovered = !request.needsDropoff || Boolean(request.dropoffParent);
  return pickupCovered && dropoffCovered;
}

function buildCoverageSummary(request) {
  const pickupText = request.needsPickup
    ? request.pickupParent
      ? `Pickup: ${request.pickupParent}`
      : "Pickup: unassigned"
    : "Pickup: not needed";
  const dropoffText = request.needsDropoff
    ? request.dropoffParent
      ? `Drop-off: ${request.dropoffParent}`
      : "Drop-off: unassigned"
    : "Drop-off: not needed";
  return `${pickupText} | ${dropoffText}`;
}

async function setupRealtime() {
  if (!supabaseClient || requestsChannel) {
    return;
  }

  requestsChannel = supabaseClient
    .channel("ride-requests-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ride_requests" },
      async () => {
        await fetchRequests();
        renderRequests();
      }
    )
    .subscribe();
}

kidForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    setFeedback("Supabase is not configured yet.", true);
    return;
  }

  const kidName = kidNameInput.value.trim();
  const day = dayInput.value;
  const location = locationInput.value.trim();
  const needsPickup = needPickupInput.checked;
  const needsDropoff = needDropoffInput.checked;

  if (!kidName || !location || (!needsPickup && !needsDropoff)) {
    if (!needsPickup && !needsDropoff) {
      window.alert("Select pickup, drop-off, or both.");
    }
    return;
  }

  const { error } = await supabaseClient.from("ride_requests").insert({
    kid_name: kidName,
    day,
    location,
    needs_pickup: needsPickup,
    needs_dropoff: needsDropoff,
  });

  if (error) {
    setFeedback(`Could not add request: ${error.message}`, true);
    return;
  }

  setFeedback("Lift request added.");
  kidForm.reset();
  dayInput.value = day;
  kidNameInput.focus();
  await fetchRequests();
  renderRequests();
});

dayFilter.addEventListener("change", renderRequests);

async function initialize() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key || !window.supabase?.createClient) {
    setFeedback("Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js.", true);
    return;
  }

  supabaseClient = window.supabase.createClient(url, key);

  setFeedback("Shared board is live. Click a volunteer button to add your name.");

  await fetchRequests();
  renderRequests();
  await setupRealtime();
}

initialize();
