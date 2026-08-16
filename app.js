(() => {
  "use strict";

  const STORAGE_KEY = "rootbody.v1";
  const MODEL_VERSION = "0.1";
  const formatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const defaultState = () => ({
    version: 1,
    modelVersion: MODEL_VERSION,
    settings: {
      baselineKcal: 1600,
      targetDeficit: 400
    },
    days: {},
    weights: []
  });

  let state = loadState();
  let toastTimer = null;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayData() {
    const key = localDateKey();
    if (!state.days[key]) state.days[key] = { activityKcal: 0, meals: [] };
    if (!Array.isArray(state.days[key].meals)) state.days[key].meals = [];
    return state.days[key];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      console.warn("Rootbody could not read local data.", error);
      return defaultState();
    }
  }

  function normalizeState(value) {
    const fresh = defaultState();
    if (!value || typeof value !== "object") return fresh;
    const baseline = Number(value.settings?.baselineKcal);
    const target = Number(value.settings?.targetDeficit);
    fresh.settings.baselineKcal = Number.isFinite(baseline) ? clamp(baseline, 800, 4000) : 1600;
    fresh.settings.targetDeficit = Number.isFinite(target) ? clamp(target, 100, 1000) : 400;
    fresh.days = value.days && typeof value.days === "object" ? value.days : {};
    fresh.weights = Array.isArray(value.weights)
      ? value.weights
          .filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(Number(item.kg)))
          .map((item) => ({ date: item.date, kg: clamp(Number(item.kg), 30, 300) }))
      : [];
    return fresh;
  }

  function saveState() {
    state.modelVersion = MODEL_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatKcal(value) {
    return formatter.format(Math.round(value));
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function mealInitial(type) {
    const map = { "Sáng": "S", "Trưa": "T", "Tối": "T", "Phụ": "P", "Khác": "K" };
    return map[type] || "B";
  }

  function renderToday() {
    const today = todayData();
    const baseline = state.settings.baselineKcal;
    const target = state.settings.targetDeficit;
    const activity = Number(today.activityKcal) || 0;
    const intake = today.meals.reduce((sum, meal) => sum + (Number(meal.kcal) || 0), 0);
    const burn = baseline + activity;
    const deficit = burn - intake;
    const budget = Math.max(0, burn - target);
    const remaining = budget - intake;
    const hasMeals = today.meals.length > 0;

    document.querySelector("[data-today-label]").textContent = dateFormatter.format(new Date());
    document.querySelector("[data-baseline-value]").textContent = formatKcal(baseline);
    document.querySelector("[data-activity-value]").textContent = formatKcal(activity);
    document.querySelector("[data-intake-value]").textContent = formatKcal(intake);
    document.querySelector("[data-meal-total]").textContent = `${formatKcal(intake)} kcal`;
    document.querySelector("[data-budget-remaining]").textContent = `${remaining < 0 ? "−" : ""}${formatKcal(Math.abs(remaining))}`;
    document.querySelector("[data-budget-context]").textContent = remaining < 0
      ? `Vượt ${formatKcal(Math.abs(remaining))} kcal`
      : `Mục tiêu −${formatKcal(target)}`;

    const progress = budget > 0 ? clamp((intake / budget) * 100, 0, 100) : 100;
    const progressRoot = document.querySelector("[data-budget-progress]");
    progressRoot.setAttribute("aria-valuenow", String(Math.round(progress)));
    progressRoot.setAttribute("aria-valuetext", `${formatKcal(intake)} trên ${formatKcal(budget)} kcal`);
    document.querySelector("[data-budget-fill]").style.width = `${progress}%`;
    progressRoot.classList.toggle("is-over", remaining < 0);

    const deficitValue = document.querySelector("[data-deficit-value]");
    const status = document.querySelector("[data-deficit-status]");
    const note = document.querySelector("[data-deficit-note]");
    deficitValue.textContent = hasMeals ? formatKcal(Math.abs(deficit)) : "—";

    if (!hasMeals) {
      status.textContent = "Chưa đủ dữ liệu";
      note.textContent = "Ghi bữa đầu tiên để Rootbody bắt đầu tính.";
    } else if (deficit < 0) {
      status.textContent = "Đang dư";
      note.textContent = `Lượng ăn cao hơn tổng mức đốt hôm nay ${formatKcal(Math.abs(deficit))} kcal.`;
    } else if (deficit < target) {
      status.textContent = "Thiếu nhẹ";
      note.textContent = `Đang deficit, nhưng thấp hơn mục tiêu ${formatKcal(target)} kcal.`;
    } else if (deficit <= 750) {
      status.textContent = "Đúng hướng";
      note.textContent = "Calo nền và vận động đã được tính trước khi trừ lượng ăn.";
    } else {
      status.textContent = "Hơi sâu";
      note.textContent = "Deficit cao; đừng kết luận từ một ngày, hãy nhìn thêm weight trend.";
    }

    const empty = document.querySelector("[data-meals-empty]");
    const list = document.querySelector("[data-meal-list]");
    empty.hidden = today.meals.length > 0;
    list.innerHTML = today.meals
      .slice()
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .map((meal) => `
        <article class="meal-row">
          <span class="meal-type" aria-hidden="true">${escapeHtml(mealInitial(meal.type))}</span>
          <div class="meal-copy"><strong>${escapeHtml(meal.name)}</strong><small>${escapeHtml(meal.type)} · ${escapeHtml(meal.at || "")}</small></div>
          <span class="meal-kcal">${formatKcal(meal.kcal)} kcal</span>
          <button class="row-delete" type="button" aria-label="Xóa ${escapeHtml(meal.name)}" data-delete-meal="${escapeHtml(meal.id)}">×</button>
        </article>`)
      .join("");

    document.querySelector("#activityKcal").value = String(activity);
  }

  function renderWeights() {
    const weights = state.weights.slice().sort((a, b) => b.date.localeCompare(a.date));
    const latest = weights[0];
    const oldest = weights[weights.length - 1];
    document.querySelector("[data-latest-weight]").textContent = latest ? formatter.format(latest.kg) : "—";
    document.querySelector("[data-weight-change]").textContent = latest && oldest && weights.length > 1
      ? `${latest.kg - oldest.kg > 0 ? "+" : ""}${formatter.format(latest.kg - oldest.kg)}`
      : "—";

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 20);
    const recentCount = weights.filter((item) => parseDateKey(item.date) >= cutoff).length;
    const calibrationCount = Math.min(14, recentCount);
    document.querySelector("[data-calibration-count]").textContent = String(calibrationCount);
    if (recentCount >= 14) {
      document.querySelector("[data-calibration-title]").textContent = "Đủ điểm cân";
      document.querySelector("[data-calibration-copy]").textContent = "Dữ liệu đã đủ để bước sang calibrated TDEE; V1 vẫn giữ prior để tránh precision giả.";
    } else {
      document.querySelector("[data-calibration-title]").textContent = "Cần thêm dữ liệu";
      document.querySelector("[data-calibration-copy]").textContent = `Còn ${14 - recentCount} lần cân trong cửa sổ 21 ngày để giảm nhiễu nước và glycogen.`;
    }

    document.querySelector("[data-weight-empty]").hidden = weights.length > 0;
    document.querySelector("[data-weight-list]").innerHTML = weights.slice(0, 14).map((item) => `
      <article class="weight-row">
        <div class="weight-copy"><strong>${escapeHtml(shortDateFormatter.format(parseDateKey(item.date)))}</strong><small>Cân buổi sáng</small></div>
        <span class="weight-value">${formatter.format(item.kg)} kg</span>
        <button class="row-delete" type="button" aria-label="Xóa số cân ngày ${escapeHtml(item.date)}" data-delete-weight="${escapeHtml(item.date)}">×</button>
      </article>`).join("");
  }

  function renderSettings() {
    document.querySelector("#baselineSetting").value = String(state.settings.baselineKcal);
    document.querySelector("#targetSetting").value = String(state.settings.targetDeficit);
  }

  function renderAll() {
    renderToday();
    renderWeights();
    renderSettings();
  }

  function showToast(message) {
    const toast = document.querySelector("[data-toast]");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    const firstInput = dialog.querySelector("input:not([type=file]), select");
    setTimeout(() => firstInput?.focus(), 80);
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function route() {
    const requested = window.location.hash.replace("#", "") || "today";
    const current = ["today", "weight", "settings"].includes(requested) ? requested : "today";
    document.querySelectorAll("[data-view]").forEach((view) => {
      const active = view.dataset.view === current;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-dialog]");
    if (openButton) openDialog(openButton.dataset.openDialog);

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) closeDialog(closeButton.closest("dialog"));

    const deleteMeal = event.target.closest("[data-delete-meal]");
    if (deleteMeal && window.confirm("Xóa bữa ăn này?")) {
      const today = todayData();
      today.meals = today.meals.filter((meal) => meal.id !== deleteMeal.dataset.deleteMeal);
      saveState();
      renderToday();
      showToast("Đã xóa bữa ăn");
    }

    const deleteWeight = event.target.closest("[data-delete-weight]");
    if (deleteWeight && window.confirm("Xóa điểm cân này?")) {
      state.weights = state.weights.filter((item) => item.date !== deleteWeight.dataset.deleteWeight);
      saveState();
      renderWeights();
      showToast("Đã xóa điểm cân");
    }

    if (event.target.closest("[data-go-settings]")) {
      closeDialog(document.querySelector("#settingsDialog"));
      window.location.hash = "settings";
    }
  });

  document.querySelector("[data-meal-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const kcal = Number(data.get("kcal"));
    if (!name || !Number.isFinite(kcal) || kcal <= 0) return;
    const now = new Date();
    todayData().meals.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      kcal: Math.round(clamp(kcal, 1, 5000)),
      type: String(data.get("type") || "Khác"),
      at: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    });
    saveState();
    form.reset();
    closeDialog(document.querySelector("#mealDialog"));
    renderToday();
    showToast("Đã ghi bữa ăn");
  });

  document.querySelector("[data-activity-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    todayData().activityKcal = Math.round(clamp(Number(data.get("activityKcal")) || 0, 0, 3000));
    saveState();
    closeDialog(document.querySelector("#activityDialog"));
    renderToday();
    showToast("Đã cập nhật vận động");
  });

  document.querySelector("[data-weight-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kg = Number(data.get("weight"));
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) return;
    const date = localDateKey();
    state.weights = state.weights.filter((item) => item.date !== date);
    state.weights.push({ date, kg: Math.round(kg * 10) / 10 });
    saveState();
    event.currentTarget.reset();
    renderWeights();
    showToast("Đã lưu cân sáng nay");
  });

  document.querySelector("[data-settings-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.settings.baselineKcal = Math.round(clamp(Number(data.get("baselineKcal")) || 1600, 800, 4000));
    state.settings.targetDeficit = Math.round(clamp(Number(data.get("targetDeficit")) || 400, 100, 1000));
    saveState();
    renderAll();
    showToast("Đã lưu thiết lập");
  });

  document.querySelector("[data-export]").addEventListener("click", () => {
    const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rootbody-${localDateKey()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Đã tạo bản export");
  });

  document.querySelector("[data-import]").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      state = normalizeState(JSON.parse(await file.text()));
      saveState();
      renderAll();
      showToast("Đã import dữ liệu");
    } catch (error) {
      console.warn("Rootbody import failed.", error);
      showToast("File JSON không hợp lệ");
    } finally {
      event.target.value = "";
    }
  });

  document.querySelector("[data-reset]").addEventListener("click", () => {
    if (!window.confirm("Xóa toàn bộ bữa ăn, cân nặng và thiết lập trên máy này? Hành động không thể hoàn tác.")) return;
    state = defaultState();
    saveState();
    renderAll();
    window.location.hash = "today";
    showToast("Đã xóa dữ liệu trên máy");
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  window.addEventListener("hashchange", route);
  renderAll();
  route();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker unavailable.", error)));
  }
})();
