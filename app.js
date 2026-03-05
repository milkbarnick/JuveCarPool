const STORAGE_KEY = "soccer-lift-requests-v1";

const kidForm = document.getElementById("kid-form");
const kidNameInput = document.getElementById("kid-name");
const dayInput = document.getElementById("training-day");
const locationInput = document.getElementById("pickup-location");
const needPickupInput = document.getElementById("need-pickup");
const needDropoffInput = document.getElementById("need-dropoff");
const dayFilter = document.getElementById("day-filter");
const requestList = document.getElementById("request-list");
const template = document.getElementById("request-card-template");

let requests = loadRequests();

function loadRequests() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Backward compatibility for existing saved requests.
    return parsed.map((item) => ({
      ...item,
      needsPickup: item.needsPickup ?? true,
      needsDropoff: item.needsDropoff ?? true,
    }));
  } catch {
    return [];
  }
}

function saveRequests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
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

    setStatusText(
      pickupStatus,
      request.pickupParent,
      "Pickup not assigned",
      request.needsPickup
    );
    setStatusText(
      dropoffStatus,
      request.dropoffParent,
      "Drop-off not assigned",
      request.needsDropoff
    );
    toggleRideInputs(pickupForm, clearPickupBtn, request.needsPickup);
    toggleRideInputs(dropoffForm, clearDropoffBtn, request.needsDropoff);

    node.querySelectorAll(".volunteer-form").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const parentName = new FormData(form).get("parentName").toString().trim();
        if (!parentName) {
          return;
        }

        const type = form.dataset.type;
        const target = requests.find((item) => item.id === request.id);
        if (!target) {
          return;
        }
        if ((type === "pickup" && !target.needsPickup) || (type === "dropoff" && !target.needsDropoff)) {
          return;
        }

        if (type === "pickup") {
          target.pickupParent = parentName;
        } else {
          target.dropoffParent = parentName;
        }

        saveRequests();
        renderRequests();
      });
    });

    node.querySelectorAll(".clear-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = requests.find((item) => item.id === request.id);
        if (!target) {
          return;
        }

        if (button.dataset.clear === "pickup") {
          target.pickupParent = "";
        } else {
          target.dropoffParent = "";
        }

        saveRequests();
        renderRequests();
      });
    });

    node.querySelector(".remove-request").addEventListener("click", () => {
      requests = requests.filter((item) => item.id !== request.id);
      saveRequests();
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

kidForm.addEventListener("submit", (event) => {
  event.preventDefault();

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

  requests.unshift({
    id: crypto.randomUUID(),
    kidName,
    day,
    location,
    needsPickup,
    needsDropoff,
    pickupParent: "",
    dropoffParent: "",
  });

  saveRequests();
  kidForm.reset();
  dayInput.value = day;
  kidNameInput.focus();
  renderRequests();
});

dayFilter.addEventListener("change", renderRequests);

renderRequests();
