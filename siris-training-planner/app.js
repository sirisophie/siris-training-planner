const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const today = new Date("2026-06-22T12:00:00");

const goals = [
  { name: "JMT", deadline: "2026-09-13", status: "green" },
  { name: "Sky Marathon", deadline: "2026-09-09", status: "yellow" },
  { name: "Wedding Arms", deadline: "2026-09-11", status: "green" },
  { name: "Climbing", deadline: "", status: "yellow" }
];

const seedWeeks = [
  { phase: "Build 1", dates: "Jun 22-28", focus: "Set rhythm", scale: 1.0 },
  { phase: "Build 2", dates: "Jun 29-Jul 5", focus: "Add vert", scale: 1.08 },
  { phase: "Build 3", dates: "Jul 6-12", focus: "Longer weekend", scale: 1.16 },
  { phase: "Deload", dates: "Jul 13-19", focus: "Absorb work", scale: .82 },
  { phase: "Specific 1", dates: "Jul 20-26", focus: "Pack durability", scale: 1.22 },
  { phase: "Specific 2", dates: "Jul 27-Aug 2", focus: "Sky climbing", scale: 1.32 },
  { phase: "Specific 3", dates: "Aug 3-9", focus: "Back-to-back", scale: 1.42 },
  { phase: "Deload", dates: "Aug 10-16", focus: "Reset", scale: .95 },
  { phase: "Peak 1", dates: "Aug 17-23", focus: "Rehearsal", scale: 1.58 },
  { phase: "Peak 2", dates: "Aug 24-30", focus: "Big specific weekend", scale: 1.68 },
  { phase: "Taper 1", dates: "Aug 31-Sept 6", focus: "Freshen up", scale: .78 },
  { phase: "Goal Week", dates: "Sept 7-13", focus: "Execute", scale: .42 }
];

const storageKey = "siris-training-planner-v1";
let state = loadState();
let editingId = null;

function $(id) {
  return document.getElementById(id);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function createState() {
  return {
    weekIndex: 0,
    weeks: seedWeeks.map((week, index) => ({
      ...week,
      workouts: makeWeek(index)
    }))
  };
}

function makeWeek(index) {
  const scale = seedWeeks[index].scale;
  const taper = index >= 10;
  const deload = seedWeeks[index].phase === "Deload";
  const longMiles = round1((12 + index * 1.25) * scale);
  const easyRunMiles = round1(3.8 + index * .28);
  const secondMiles = round1((5 + index * .75) * scale);
  const vert = Math.round((2200 + index * 420) / 100) * 100;
  const pack = Math.min(30, Math.round(18 + index * 1.6));

  if (taper) {
    return [
      workout("Recovery", "Mobility / easy walk", "25-35 min"),
      workout("Sky", "Short uphill tune-up", "45-60 min", 4, 900),
      workout("Strength", "Full-body strength", "30-40 min"),
      workout("Sky", "Easy run + arms finisher", "35-50 min", 3.5, 300),
      workout("Climb", "Easy climb / mobility", "45-60 min"),
      workout("Sky", index === 11 ? "JMT readiness walk" : "Relaxed run / hike", "2-3 hr", 6, 1200),
      workout("Recovery", "Recovery", "20-30 min")
    ];
  }

  return [
    workout("Recovery", "Recovery / mobility", "25-40 min"),
    workout("Sky", index > 7 ? "Sustained uphill run" : "Hill intervals", "75-100 min", round1(5.5 * scale), Math.round((1000 + index * 160) / 100) * 100),
    workout("Strength", deload ? "Light full-body strength" : "Full-body strength", "45-60 min"),
    workout("Sky", "Easy run + arms finisher", "45-70 min", easyRunMiles, Math.round((400 + index * 60) / 100) * 100),
    workout("Climb", deload ? "Easy MoonBoard" : "MoonBoard + arms finisher", "45-70 min"),
    workout("Sky", index > 7 ? "Long mountain run / hike" : "Mountain run / hike", `${Math.round(4.5 + index * .45)}-${Math.round(5.5 + index * .55)} hr`, longMiles, vert),
    workout("JMT", "Weighted pack hike", `${Math.round(2.2 + index * .25)}-${Math.round(3.2 + index * .35)} hr`, secondMiles, Math.round((900 + index * 190) / 100) * 100, `${pack} lb`)
  ];
}

function workout(type, title, duration = "", miles = 0, vert = 0, pack = "", notes = "") {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    duration,
    miles,
    vert,
    pack,
    notes,
    done: false,
    skipped: false
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && stored.weeks && stored.weeks.length === 12) return stored;
  } catch (error) {}
  return createState();
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function currentWeek() {
  return state.weeks[state.weekIndex];
}

function render() {
  renderGoals();
  renderWeek();
  renderStats();
  renderDays();
  saveState();
}

function renderGoals() {
  $("goalCards").innerHTML = goals.map(goal => `
    <article class="goal-card">
      <div class="goal-top">
        <div>
          <h2>${goal.name}</h2>
          <p class="deadline">${weeksUntil(goal.deadline)}</p>
        </div>
        <div class="status ${goal.status}" title="${goal.status}"></div>
      </div>
    </article>
  `).join("");
}

function weeksUntil(deadline) {
  if (!deadline) return "Ongoing";
  const target = new Date(`${deadline}T12:00:00`);
  const daysLeft = Math.max(0, Math.ceil((target - today) / 86400000));
  const weeks = Math.ceil(daysLeft / 7);
  return `${weeks} weeks · ${target.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function renderWeek() {
  const week = currentWeek();
  $("weekTitle").textContent = `Week ${state.weekIndex + 1}: ${week.phase}`;
  $("weekSubtitle").textContent = `${week.dates} · ${week.focus}`;
}

function renderStats() {
  const workouts = currentWeek().workouts.filter(Boolean);
  const completed = workouts.filter(item => item.done);
  const plannedMiles = round1(workouts.reduce((sum, item) => sum + Number(item.miles || 0), 0));
  const plannedVert = workouts.reduce((sum, item) => sum + Number(item.vert || 0), 0);
  const completedMiles = round1(completed.reduce((sum, item) => sum + Number(item.miles || 0), 0));
  const completedVert = completed.reduce((sum, item) => sum + Number(item.vert || 0), 0);
  const skipped = workouts.filter(item => item.skipped).length;

  $("stats").innerHTML = [
    [`${completed.length}/${workouts.length}`, skipped ? `${skipped} skipped` : "completed"],
    [`${completedMiles}/${plannedMiles}`, "miles"],
    [`${completedVert.toLocaleString()}/${plannedVert.toLocaleString()}`, "vert"]
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderDays() {
  const week = currentWeek();
  $("days").innerHTML = days.map((day, index) => {
    const workoutItem = week.workouts[index];
    return `
      <section class="day">
        <div class="day-head">
          <div>
            <div class="day-name">${fullDays[index]}</div>
            <div class="day-meta">${index < 5 ? "7-9am window" : "Weekend block"}</div>
          </div>
          <button class="day-add" type="button" data-add="${index}" title="Log workout">+</button>
        </div>
        <div class="workouts">
          ${workoutItem ? workoutCard(workoutItem) : ""}
        </div>
      </section>
    `;
  }).join("");

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", handleWorkoutAction);
  });
  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => openDialog(null, Number(button.dataset.add)));
  });
}

function workoutCard(item) {
  const meta = [
    item.duration,
    item.miles ? `${item.miles} mi` : "",
    item.vert ? `${item.vert.toLocaleString()} ft` : "",
    item.pack || ""
  ].filter(Boolean).join(" · ");

  return `
    <article class="workout ${item.done ? "done" : ""} ${item.skipped ? "skipped" : ""}" data-type="${item.type}">
      <div class="workout-top">
        <div class="workout-title">${item.title}</div>
        <div class="tag ${item.type}">${item.type}</div>
      </div>
      <div class="workout-meta">${meta || "Flexible"}</div>
      ${item.notes ? `<div class="workout-note">${escapeHtml(item.notes)}</div>` : ""}
      <div class="actions">
        <button class="tiny" type="button" data-action="done" data-id="${item.id}">${item.done ? "Undo" : "Done"}</button>
        <button class="tiny" type="button" data-action="skip" data-id="${item.id}">${item.skipped ? "Unskip" : "Skipped"}</button>
        <button class="tiny" type="button" data-action="notes" data-id="${item.id}">Notes</button>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function findWorkout(id) {
  const dayIndex = currentWeek().workouts.findIndex(item => item && item.id === id);
  return { dayIndex, item: currentWeek().workouts[dayIndex] };
}

function handleWorkoutAction(event) {
  const action = event.currentTarget.dataset.action;
  const { dayIndex, item } = findWorkout(event.currentTarget.dataset.id);
  if (!item) return;

  if (action === "done") {
    item.done = !item.done;
    if (item.done) item.skipped = false;
    toast(item.done ? "Marked done." : "Marked incomplete.");
  }

  if (action === "skip") {
    item.skipped = !item.skipped;
    if (item.skipped) item.done = false;
    toast(item.skipped ? "Marked skipped." : "Removed skipped mark.");
  }

  if (action === "notes") {
    openDialog(item, dayIndex);
    return;
  }

  render();
}

function openDialog(item = null, dayIndex = 0) {
  editingId = item ? item.id : null;
  $("dialogTitle").textContent = item ? "Add notes" : "Log workout";
  $("dayField").innerHTML = fullDays.map((day, index) => `<option value="${index}">${day}</option>`).join("");

  if (item) {
    $("dayField").value = dayIndex;
    $("typeField").value = item.type;
    $("titleField").value = item.title;
    $("durationField").value = item.duration;
    $("milesField").value = item.miles || "";
    $("vertField").value = item.vert || "";
    $("packField").value = item.pack || "";
    $("notesField").value = item.notes || "";
  } else {
    $("workoutForm").reset();
    $("dayField").value = dayIndex;
    $("typeField").value = "Sky";
  }

  $("workoutDialog").showModal();
}

function saveWorkout(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData($("workoutForm")).entries());
  const dayIndex = Number(data.day);
  const next = workout(
    data.type,
    data.title,
    data.duration,
    Number(data.miles || 0),
    Number(data.vert || 0),
    data.pack,
    data.notes
  );
  next.done = true;

  if (editingId) {
    const found = findWorkout(editingId);
    if (found.item) {
      next.done = found.item.done;
      next.skipped = found.item.skipped;
      currentWeek().workouts[found.dayIndex] = null;
    }
  }

  currentWeek().workouts[dayIndex] = next;
  $("workoutDialog").close();
  toast(editingId ? "Workout updated." : "Workout logged.");
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "siris-training-planner-data.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Export started.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.weeks || imported.weeks.length !== 12) throw new Error("Invalid planner data.");
      state = imported;
      toast("Data imported.");
      render();
    } catch (error) {
      toast("Could not import that file.");
    }
  };
  reader.readAsText(file);
}

function toast(message) {
  const toastEl = $("toast");
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastEl.timer);
  toastEl.timer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function setupPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

$("prevWeek").addEventListener("click", () => {
  state.weekIndex = Math.max(0, state.weekIndex - 1);
  render();
});

$("nextWeek").addEventListener("click", () => {
  state.weekIndex = Math.min(state.weeks.length - 1, state.weekIndex + 1);
  render();
});

$("workoutForm").addEventListener("submit", saveWorkout);
$("cancelBtn").addEventListener("click", () => $("workoutDialog").close());
$("exportBtn").addEventListener("click", exportData);
$("importInput").addEventListener("change", event => importData(event.target.files[0]));
$("resetBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  state = createState();
  toast("Reset sample data.");
  render();
});

setupPwa();
render();
