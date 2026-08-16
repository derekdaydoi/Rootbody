(() => {
  "use strict";

  const STORAGE_KEY = "rootbody.v2";
  const LEGACY_KEY = "rootbody.v1";
  const MODEL_VERSION = "0.2";
  const KCAL_PER_KG = 7700;
  const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  const kg3 = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const longDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });

  const FOOD_SAMPLES = [
    { id: "rice", name: "Cơm trắng", serving: "1 bát vừa", kcal: 250 },
    { id: "milk-coffee", name: "Cà phê sữa", serving: "1 ly", kcal: 100 },
    { id: "black-coffee", name: "Cà phê đen", serving: "không đường", kcal: 10 },
    { id: "boiled-egg", name: "Trứng luộc", serving: "1 quả", kcal: 80 },
    { id: "fried-egg", name: "Trứng chiên", serving: "1 quả", kcal: 120 },
    { id: "boiled-veg", name: "Rau luộc", serving: "1 đĩa", kcal: 80 },
    { id: "stir-veg", name: "Rau xào", serving: "1 đĩa", kcal: 200 },
    { id: "boiled-beef", name: "Bò luộc / áp chảo", serving: "100 g", kcal: 250 },
    { id: "stir-beef", name: "Thịt bò xào", serving: "1 đĩa", kcal: 400 },
    { id: "minced-pork", name: "Thịt lợn băm", serving: "100 g", kcal: 300 },
    { id: "boiled-pork", name: "Thịt lợn luộc", serving: "100 g", kcal: 260 },
    { id: "stir-oil", name: "Dầu / sốt món xào", serving: "phần cộng thêm", kcal: 150 }
  ];

  const ACTIVITY_NAMES = { walk: "Đi bộ", run: "Chạy", badminton: "Cầu lông", legacy: "Vận động V1" };
  const LEVELS = {
    weak: { label: "Yếu", met: 3.5 },
    poor: { label: "Kém", met: 4.5 },
    medium: { label: "Trung bình", met: 5.5 },
    medium_plus: { label: "Trung bình +", met: 6.0 },
    good: { label: "Khá", met: 7.0 },
    strong: { label: "Giỏi", met: 9.0 }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let state = loadState();
  let toastTimer;

  function defaultState() {
    return {
      version: 2,
      modelVersion: MODEL_VERSION,
      profile: { weightKg: null, heightCm: null, bmiStandard: "asian" },
      settings: { baselineKcal: 1600, targetDeficit: 400 },
      days: {},
      weights: []
    };
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  function uid() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadState() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalizeState(JSON.parse(current));
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const migrated = migrateV1(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (error) {
      console.warn("Rootbody không đọc được dữ liệu local.", error);
    }
    return defaultState();
  }

  function migrateV1(old) {
    const next = defaultState();
    next.settings.baselineKcal = safeNumber(old?.settings?.baselineKcal, 800, 4000, 1600);
    next.settings.targetDeficit = safeNumber(old?.settings?.targetDeficit, 100, 1000, 400);
    next.weights = normalizeWeights(old?.weights);
    if (next.weights.length) next.profile.weightKg = next.weights[next.weights.length - 1].kg;
    Object.entries(old?.days || {}).forEach(([date, day]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      next.days[date] = {
        meals: normalizeMeals(day?.meals),
        activities: Number(day?.activityKcal) > 0 ? [{
          id: uid(), type: "legacy", name: "Vận động từ V1", kcal: Math.round(Number(day.activityKcal)), steps: 0,
          minutes: null, met: null, createdAt: `${date}T12:00:00`
        }] : []
      };
    });
    return next;
  }

  function normalizeState(value) {
    const fresh = defaultState();
    if (!value || typeof value !== "object") return fresh;
    fresh.profile.weightKg = nullableNumber(value.profile?.weightKg, 30, 300);
    fresh.profile.heightCm = nullableNumber(value.profile?.heightCm, 120, 230);
    fresh.profile.bmiStandard = value.profile?.bmiStandard === "international" ? "international" : "asian";
    fresh.settings.baselineKcal = safeNumber(value.settings?.baselineKcal, 800, 4000, 1600);
    fresh.settings.targetDeficit = safeNumber(value.settings?.targetDeficit, 100, 1000, 400);
    fresh.weights = normalizeWeights(value.weights);
    Object.entries(value.days || {}).forEach(([date, day]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      fresh.days[date] = { meals: normalizeMeals(day?.meals), activities: normalizeActivities(day?.activities) };
    });
    return fresh;
  }

  function normalizeMeals(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(Boolean).map((item) => ({
      id: String(item.id || uid()),
      name: String(item.name || "Món ăn").slice(0, 60),
      kcal: safeNumber(item.kcal, 1, 5000, 1),
      serving: item.serving ? String(item.serving).slice(0, 60) : "",
      source: item.source === "sample" ? "sample" : "manual",
      createdAt: String(item.createdAt || new Date().toISOString())
    }));
  }

  function normalizeActivities(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(Boolean).map((item) => ({
      id: String(item.id || uid()), type: ACTIVITY_NAMES[item.type] ? item.type : "legacy",
      name: String(item.name || ACTIVITY_NAMES[item.type] || "Vận động").slice(0, 60),
      kcal: safeNumber(item.kcal, 0, 10000, 0), steps: safeNumber(item.steps, 0, 100000, 0),
      minutes: nullableNumber(item.minutes, 1, 600), met: nullableNumber(item.met, 1, 30),
      level: item.level && LEVELS[item.level] ? item.level : null,
      distanceKm: nullableNumber(item.distanceKm, 0, 100), speedKmh: nullableNumber(item.speedKmh, 0, 50),
      createdAt: String(item.createdAt || new Date().toISOString())
    }));
  }

  function normalizeWeights(items) {
    if (!Array.isArray(items)) return [];
    const byDate = new Map();
    items.forEach((item) => {
      const kg = Number(item?.kg);
      if (/^\d{4}-\d{2}-\d{2}$/.test(item?.date) && Number.isFinite(kg) && kg >= 30 && kg <= 300) byDate.set(item.date, { date: item.date, kg: Math.round(kg * 10) / 10 });
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  function safeNumber(value, min, max, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  }

  function nullableNumber(value, min, max) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
  }

  function saveState() {
    state.version = 2;
    state.modelVersion = MODEL_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function dayData(date = localDateKey()) {
    if (!state.days[date]) state.days[date] = { meals: [], activities: [] };
    if (!Array.isArray(state.days[date].meals)) state.days[date].meals = [];
    if (!Array.isArray(state.days[date].activities)) state.days[date].activities = [];
    return state.days[date];
  }

  function totals(day) {
    return {
      intake: (day?.meals || []).reduce((sum, item) => sum + Number(item.kcal || 0), 0),
      activity: (day?.activities || []).reduce((sum, item) => sum + Number(item.kcal || 0), 0),
      steps: (day?.activities || []).reduce((sum, item) => sum + Number(item.steps || 0), 0)
    };
  }

  function profileReady() {
    return Number.isFinite(state.profile.weightKg) && Number.isFinite(state.profile.heightCm);
  }

  function kcalToKg(kcal) { return kcal / KCAL_PER_KG; }

  function signedKg(value) {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) < 0.0005) return "0,000";
    return `${value < 0 ? "−" : "+"}${kg3.format(Math.abs(value))}`;
  }

  function signedKcal(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value < 0 ? "−" : "+"}${integer.format(Math.abs(Math.round(value)))}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function renderAll() {
    renderToday();
    renderActivity();
    renderProfile();
    renderHistory();
    prefillForms();
  }

  function renderToday() {
    const day = dayData();
    const sum = totals(day);
    const deficit = state.settings.baselineKcal + sum.activity - sum.intake;
    const complete = day.meals.length > 0;
    const targetBudget = state.settings.baselineKcal - state.settings.targetDeficit + sum.activity;
    const remaining = targetBudget - sum.intake;

    $("[data-today-label]").textContent = longDate.format(new Date());
    $("[data-baseline-value]").textContent = integer.format(state.settings.baselineKcal);
    $("[data-activity-value]").textContent = integer.format(sum.activity);
    $("[data-intake-value]").textContent = integer.format(sum.intake);
    $("[data-budget-remaining]").textContent = signedKcal(remaining).replace("+", "");
    $("[data-budget-context]").textContent = `Mục tiêu −${integer.format(state.settings.targetDeficit)}`;
    const progress = targetBudget > 0 ? clamp((sum.intake / targetBudget) * 100, 0, 100) : 100;
    $("[data-budget-fill]").style.width = `${progress}%`;
    $("[data-budget-progress]").setAttribute("aria-valuenow", String(Math.round(progress)));
    $(".profile-nudge").hidden = profileReady();

    const kgChange = -kcalToKg(deficit);
    if (!complete) {
      $("[data-kg-value]").textContent = "—";
      $("[data-deficit-kcal]").textContent = "— kcal";
      $("[data-seven-day]").textContent = "7 ngày: — kg";
      $("[data-deficit-status]").textContent = "Chưa đủ dữ liệu";
      $("[data-deficit-note]").textContent = "Ghi ít nhất một món để mở dự báo hôm nay.";
    } else {
      $("[data-kg-value]").textContent = signedKg(kgChange);
      $("[data-deficit-kcal]").textContent = `${signedKcal(deficit)} kcal thâm hụt`;
      $("[data-seven-day]").textContent = `7 ngày: ${signedKg(kgChange * 7)} kg`;
      if (deficit >= state.settings.targetDeficit) {
        $("[data-deficit-status]").textContent = "Đạt mục tiêu";
        $("[data-deficit-note]").textContent = "Theo dữ liệu đã ghi, hôm nay đang đạt mức thâm hụt đặt ra.";
      } else if (deficit > 0) {
        $("[data-deficit-status]").textContent = "Đang thâm hụt";
        $("[data-deficit-note]").textContent = `Còn ${integer.format(state.settings.targetDeficit - deficit)} kcal để chạm mục tiêu hôm nay.`;
      } else {
        $("[data-deficit-status]").textContent = "Đang dư năng lượng";
        $("[data-deficit-note]").textContent = `Đã vượt tiêu hao ước tính ${integer.format(Math.abs(deficit))} kcal.`;
      }
    }

    const grid = $("[data-food-grid]");
    grid.innerHTML = FOOD_SAMPLES.map((item) => `<button class="food-chip" type="button" data-food-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><span>${integer.format(item.kcal)} kcal</span><small>${escapeHtml(item.serving)}</small></button>`).join("");
    renderTodayLog(day);
  }

  function renderTodayLog(day) {
    const entries = [
      ...day.meals.map((item) => ({ ...item, kind: "meal", sort: item.createdAt })),
      ...day.activities.map((item) => ({ ...item, kind: "activity", sort: item.createdAt }))
    ].sort((a, b) => String(b.sort).localeCompare(String(a.sort)));
    const target = $("[data-today-log]");
    if (!entries.length) {
      target.innerHTML = '<div class="empty-state">Chưa có món ăn hoặc vận động nào hôm nay.</div>';
      return;
    }
    target.innerHTML = entries.map((item) => {
      const isMeal = item.kind === "meal";
      const detail = isMeal ? (item.serving || "Ước tính thủ công") : activityDetail(item);
      const kg = kcalToKg(item.kcal);
      return `<article class="log-item"><span class="log-mark">${isMeal ? "ĂN" : "TẬP"}</span><div class="log-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(detail)}</small></div><div class="log-number"><strong>${isMeal ? "+" : "−"}${integer.format(item.kcal)} kcal</strong><small>${isMeal ? "+" : "−"}${kg3.format(kg)} kg eq.</small></div><button class="delete-entry" type="button" data-delete-kind="${item.kind}" data-delete-id="${escapeHtml(item.id)}" aria-label="Xóa ${escapeHtml(item.name)}">×</button></article>`;
    }).join("");
  }

  function activityDetail(item) {
    const bits = [];
    if (item.minutes) bits.push(`${integer.format(item.minutes)} phút`);
    if (item.steps) bits.push(`${integer.format(item.steps)} bước`);
    if (item.level && LEVELS[item.level]) bits.push(LEVELS[item.level].label);
    if (item.distanceKm) bits.push(`~${number.format(item.distanceKm)} km`);
    return bits.join(" · ") || "Dữ liệu chuyển từ V1";
  }

  function renderActivity() {
    const day = dayData();
    const sum = totals(day);
    $("[data-today-short]").textContent = shortDate.format(new Date());
    $("[data-activity-steps]").textContent = integer.format(sum.steps);
    $("[data-activity-total]").textContent = integer.format(sum.activity);
    $("[data-activity-kg]").textContent = kg3.format(kcalToKg(sum.activity));
    const target = $("[data-activity-log]");
    if (!day.activities.length) {
      target.innerHTML = '<div class="empty-state">Chưa ghi buổi tập. Chọn một loại ở trên để bắt đầu.</div>';
      return;
    }
    target.innerHTML = [...day.activities].reverse().map((item) => `<article class="log-item"><span class="log-mark">${escapeHtml((item.type || "?").slice(0,1).toUpperCase())}</span><div class="log-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(activityDetail(item))}</small></div><div class="log-number"><strong>${integer.format(item.kcal)} kcal</strong><small>${kg3.format(kcalToKg(item.kcal))} kg eq.</small></div><button class="delete-entry" type="button" data-delete-kind="activity" data-delete-id="${escapeHtml(item.id)}" aria-label="Xóa ${escapeHtml(item.name)}">×</button></article>`).join("");
  }

  function renderProfile() {
    const { weightKg, heightCm, bmiStandard } = state.profile;
    $("[data-profile-baseline]").textContent = integer.format(state.settings.baselineKcal);
    $("[data-profile-target]").textContent = integer.format(state.settings.targetDeficit);
    if (!weightKg || !heightCm) {
      $("[data-bmi-value]").textContent = "—";
      $("[data-bmi-band]").textContent = "Chưa đủ dữ liệu";
      $("[data-bmi-standard]").textContent = "Nhập cân nặng và chiều cao";
      return;
    }
    const bmi = weightKg / ((heightCm / 100) ** 2);
    const band = bmiBand(bmi, bmiStandard);
    $("[data-bmi-value]").textContent = number.format(bmi);
    $("[data-bmi-band]").textContent = band;
    $("[data-bmi-standard]").textContent = bmiStandard === "asian" ? "Asian action points · screening" : "International classification · screening";
  }

  function bmiBand(bmi, standard) {
    if (bmi < 18.5) return "Dưới ngưỡng chuẩn";
    if (standard === "asian") {
      if (bmi < 23) return "Ngưỡng chuẩn";
      if (bmi < 27.5) return "Nguy cơ tăng";
      return "Nguy cơ cao";
    }
    if (bmi < 25) return "Ngưỡng chuẩn";
    if (bmi < 30) return "Thừa cân";
    return "Béo phì";
  }

  function renderHistory() {
    renderWeightChart();
    renderStepChart();
    const dates = Object.keys(state.days).sort().reverse();
    const target = $("[data-history-list]");
    if (!dates.length) {
      target.innerHTML = '<div class="empty-state">Lịch sử sẽ xuất hiện sau khi ghi món ăn hoặc vận động.</div>';
      return;
    }
    target.innerHTML = dates.slice(0, 30).map((date) => {
      const day = state.days[date];
      const sum = totals(day);
      const complete = day.meals.length > 0;
      const deficit = complete ? state.settings.baselineKcal + sum.activity - sum.intake : null;
      const parsed = parseDateKey(date);
      return `<article class="history-item"><div class="history-date"><strong>${String(parsed.getDate()).padStart(2,"0")}</strong><span>thg ${parsed.getMonth()+1}</span></div><div class="history-metrics"><div><span>ĐÃ ĂN</span><strong>${integer.format(sum.intake)} kcal</strong></div><div><span>BƯỚC</span><strong>${integer.format(sum.steps)}</strong></div><div><span>KG EQ.</span><strong>${deficit === null ? "—" : signedKg(-kcalToKg(deficit))}</strong></div></div></article>`;
    }).join("");
  }

  function renderWeightChart() {
    const items = state.weights.slice(-20);
    const target = $("[data-weight-chart]");
    const deltaTarget = $("[data-weight-delta]");
    if (!items.length) {
      target.innerHTML = '<div class="empty-state">Chưa có dữ liệu cân nặng.</div>';
      deltaTarget.textContent = "—";
      return;
    }
    const delta = items.length > 1 ? items[items.length - 1].kg - items[0].kg : 0;
    deltaTarget.textContent = items.length > 1 ? `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${number.format(Math.abs(delta))} kg` : `${number.format(items[0].kg)} kg`;
    const width = 360, height = 180, left = 30, right = 12, top = 16, bottom = 28;
    const values = items.map((item) => item.kg);
    let min = Math.min(...values), max = Math.max(...values);
    const pad = Math.max((max - min) * .2, .5);
    min -= pad; max += pad;
    const x = (index) => items.length === 1 ? (left + width - right) / 2 : left + (index / (items.length - 1)) * (width - left - right);
    const y = (value) => top + ((max - value) / (max - min)) * (height - top - bottom);
    const points = items.map((item, index) => `${x(index).toFixed(1)},${y(item.kg).toFixed(1)}`);
    const area = `M ${points[0]} ${points.slice(1).map((point) => `L ${point}`).join(" ")} L ${x(items.length-1)},${height-bottom} L ${x(0)},${height-bottom} Z`;
    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ cân nặng từ ${number.format(items[0].kg)} đến ${number.format(items[items.length-1].kg)} kg"><line class="chart-grid" x1="${left}" y1="${top}" x2="${width-right}" y2="${top}"/><line class="chart-grid" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"/><text class="chart-label" x="0" y="${top+3}">${number.format(max)}</text><text class="chart-label" x="0" y="${height-bottom+3}">${number.format(min)}</text><path class="chart-area" d="${area}"/><polyline class="weight-line" points="${points.join(" ")}"/>${items.map((item,index) => `<circle class="weight-dot" cx="${x(index)}" cy="${y(item.kg)}" r="3.5"><title>${shortDate.format(parseDateKey(item.date))}: ${number.format(item.kg)} kg</title></circle>`).join("")}<text class="chart-label" x="${left}" y="${height-7}">${shortDate.format(parseDateKey(items[0].date))}</text><text class="chart-label" text-anchor="end" x="${width-right}" y="${height-7}">${shortDate.format(parseDateKey(items[items.length-1].date))}</text></svg>`;
  }

  function renderStepChart() {
    const days = [];
    const now = new Date();
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12);
      const key = localDateKey(date);
      days.push({ date, key, steps: totals(state.days[key]).steps });
    }
    const total = days.reduce((sum, item) => sum + item.steps, 0);
    $("[data-step-average]").textContent = `${integer.format(Math.round(total / 14))} bước/ngày`;
    const max = Math.max(1000, ...days.map((item) => item.steps));
    const width = 360, height = 180, left = 31, right = 8, top = 16, bottom = 28;
    const usableWidth = width - left - right;
    const slot = usableWidth / days.length;
    const barWidth = Math.max(5, slot - 6);
    const base = height - bottom;
    const bars = days.map((item, index) => {
      const barHeight = item.steps ? Math.max(2, (item.steps / max) * (base - top)) : 1;
      const x = left + index * slot + (slot - barWidth) / 2;
      return `<rect class="step-bar" x="${x.toFixed(1)}" y="${(base-barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2"><title>${shortDate.format(item.date)}: ${integer.format(item.steps)} bước</title></rect>`;
    }).join("");
    $("[data-step-chart]").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ số bước 14 ngày, trung bình ${integer.format(Math.round(total/14))} bước mỗi ngày"><line class="chart-grid" x1="${left}" y1="${top}" x2="${width-right}" y2="${top}"/><line class="chart-grid" x1="${left}" y1="${base}" x2="${width-right}" y2="${base}"/><text class="chart-label" x="0" y="${top+3}">${integer.format(max)}</text><text class="chart-label" x="${left}" y="${height-7}">${shortDate.format(days[0].date)}</text><text class="chart-label" text-anchor="end" x="${width-right}" y="${height-7}">${shortDate.format(days[13].date)}</text>${bars}</svg>`;
  }

  function prefillForms() {
    const profileForm = $("[data-profile-form]");
    if (document.activeElement?.form !== profileForm) {
      profileForm.elements.weightKg.value = state.profile.weightKg || "";
      profileForm.elements.heightCm.value = state.profile.heightCm || "";
      profileForm.elements.bmiStandard.value = state.profile.bmiStandard;
    }
    const settingsForm = $("[data-settings-form]");
    settingsForm.elements.baselineKcal.value = state.settings.baselineKcal;
    settingsForm.elements.targetDeficit.value = state.settings.targetDeficit;
    $("[data-weight-form]").elements.date.value ||= localDateKey();
  }

  function walkingMet(speed) {
    if (speed < 3.2) return 2.3;
    if (speed < 4.0) return 2.8;
    if (speed < 4.8) return 3.0;
    if (speed < 5.6) return 3.8;
    if (speed < 6.4) return 4.8;
    return 5.5;
  }

  function runningMet(speed) {
    if (speed < 6.9) return 6.5;
    if (speed < 8.0) return 7.8;
    if (speed < 8.8) return 8.5;
    if (speed < 9.7) return 9.0;
    if (speed < 10.8) return 9.3;
    if (speed < 11.3) return 10.5;
    if (speed < 12.1) return 11.0;
    return 11.8;
  }

  function estimateActivity(type, steps, minutes, level) {
    const weight = Number(state.profile.weightKg);
    const height = Number(state.profile.heightCm);
    if (!weight) return { error: "Nhập cân nặng trong Cá nhân trước." };
    if (!Number.isFinite(minutes) || minutes < 1) return { error: "Nhập số phút hợp lệ." };
    let met, distanceKm = null, speedKmh = null;
    if (type === "badminton") {
      met = (LEVELS[level] || LEVELS.medium).met;
    } else {
      if (!height) return { error: "Nhập chiều cao trong Cá nhân trước." };
      if (!Number.isFinite(steps) || steps < 1) return { error: "Nhập số bước hợp lệ." };
      const stepFactor = type === "walk" ? 0.415 : 0.65;
      distanceKm = steps * (height / 100) * stepFactor / 1000;
      speedKmh = distanceKm / (minutes / 60);
      if ((type === "walk" && speedKmh > 10) || (type === "run" && speedKmh > 30)) return { error: "Bước/phút tạo tốc độ phi thực tế. Kiểm tra lại." };
      met = type === "walk" ? walkingMet(speedKmh) : runningMet(speedKmh);
    }
    const rawKcal = Math.max(0, (met - 1) * 3.5 * weight / 200 * minutes);
    const kcal = Math.floor(rawKcal / 10) * 10;
    return { kcal, met, distanceKm, speedKmh };
  }

  function updateActivityForm() {
    const form = $("[data-activity-form]");
    const type = form.elements.activityType.value;
    const isBadminton = type === "badminton";
    $("[data-steps-field]").hidden = isBadminton;
    $("[data-level-field]").hidden = !isBadminton;
    form.elements.steps.required = !isBadminton;
    $("[data-activity-dialog-title]").textContent = `Thêm ${ACTIVITY_NAMES[type].toLowerCase()}`;
    const result = estimateActivity(type, Number(form.elements.steps.value), Number(form.elements.minutes.value), form.elements.level.value);
    const preview = $("[data-activity-preview]");
    if (result.error) {
      preview.innerHTML = `<span>Ước tính</span><strong>—</strong><small>${escapeHtml(result.error)}</small>`;
    } else {
      const meta = result.speedKmh ? ` · ~${number.format(result.speedKmh)} km/h` : ` · ${LEVELS[form.elements.level.value].label}`;
      preview.innerHTML = `<span>MET ${number.format(result.met)}${meta}</span><strong>${integer.format(result.kcal)} kcal ròng</strong><small>${kg3.format(kcalToKg(result.kcal))} kg eq.</small>`;
    }
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (id === "settingsDialog") prefillForms();
    if (id === "weightDialog") {
      const form = $("[data-weight-form]");
      form.elements.date.value = localDateKey();
      form.elements.kg.value = state.profile.weightKg || "";
    }
    if (id === "activityDialog") updateActivityForm();
    if (!dialog.open) dialog.showModal();
  }

  function openActivityDialog(type) {
    if (!profileReady()) {
      showToast("Nhập cân nặng và chiều cao trước khi tính vận động.");
      navigate("profile");
      return;
    }
    const form = $("[data-activity-form]");
    form.reset();
    form.elements.activityType.value = type;
    form.elements.level.value = "medium";
    updateActivityForm();
    openDialog("activityDialog");
  }

  function navigate(view) {
    const target = document.querySelector(`[data-view="${view}"]`) ? view : "today";
    $$("[data-view]").forEach((section) => section.classList.toggle("is-active", section.dataset.view === target));
    $$(".tab[data-nav]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.nav === target));
    if (location.hash !== `#${target}`) history.replaceState(null, "", `#${target}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (target === "history") renderHistory();
  }

  function showToast(message) {
    const toast = $("[data-toast]");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) { event.preventDefault(); navigate(nav.dataset.nav); return; }
    const opener = event.target.closest("[data-open-dialog]");
    if (opener) { openDialog(opener.dataset.openDialog); return; }
    const closer = event.target.closest("[data-close-dialog]");
    if (closer) { document.getElementById(closer.dataset.closeDialog)?.close(); return; }
    const option = event.target.closest("[data-activity-type]");
    if (option) { openActivityDialog(option.dataset.activityType); return; }
    const foodButton = event.target.closest("[data-food-id]");
    if (foodButton) {
      const sample = FOOD_SAMPLES.find((item) => item.id === foodButton.dataset.foodId);
      if (!sample) return;
      dayData().meals.push({ id: uid(), name: sample.name, serving: sample.serving, kcal: sample.kcal, source: "sample", createdAt: new Date().toISOString() });
      saveState(); renderAll(); showToast(`Đã thêm ${sample.name}: ${sample.kcal} kcal.`); return;
    }
    const deleteButton = event.target.closest("[data-delete-kind]");
    if (deleteButton) {
      const day = dayData();
      const collection = deleteButton.dataset.deleteKind === "meal" ? "meals" : "activities";
      day[collection] = day[collection].filter((item) => item.id !== deleteButton.dataset.deleteId);
      saveState(); renderAll(); showToast("Đã xóa mục khỏi hôm nay.");
    }
  });

  $("[data-meal-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.mealName.value.trim();
    const kcal = Number(form.elements.mealKcal.value);
    if (!name || !Number.isFinite(kcal) || kcal < 1) return;
    dayData().meals.push({ id: uid(), name, serving: "Ước tính thủ công", kcal: Math.ceil(kcal / 10) * 10, source: "manual", createdAt: new Date().toISOString() });
    saveState(); form.reset(); $("#mealDialog").close(); renderAll(); showToast("Đã thêm món và làm tròn calorie lên.");
  });

  $("[data-activity-form]").addEventListener("input", updateActivityForm);
  $("[data-activity-form]").addEventListener("change", updateActivityForm);
  $("[data-activity-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.elements.activityType.value;
    const steps = type === "badminton" ? 0 : Number(form.elements.steps.value);
    const minutes = Number(form.elements.minutes.value);
    const level = form.elements.level.value;
    const result = estimateActivity(type, steps, minutes, level);
    if (result.error) { showToast(result.error); return; }
    dayData().activities.push({
      id: uid(), type, name: ACTIVITY_NAMES[type], kcal: result.kcal, steps, minutes,
      level: type === "badminton" ? level : null, met: result.met,
      distanceKm: result.distanceKm === null ? null : Math.round(result.distanceKm * 10) / 10,
      speedKmh: result.speedKmh === null ? null : Math.round(result.speedKmh * 10) / 10,
      createdAt: new Date().toISOString()
    });
    saveState(); form.reset(); $("#activityDialog").close(); renderAll(); showToast(`Đã cộng ${result.kcal} kcal vận động ròng.`);
  });

  $("[data-profile-form]").addEventListener("change", (event) => {
    if (event.target.name !== "bmiStandard") return;
    $("[data-bmi-help]").textContent = event.target.value === "asian" ? "Asian action points dùng mốc 23 và 27,5 để cảnh báo nguy cơ; công thức BMI không đổi." : "International dùng mốc 25 và 30; công thức BMI không đổi.";
  });

  $("[data-profile-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const weightKg = Number(form.elements.weightKg.value);
    const heightCm = Number(form.elements.heightCm.value);
    if (weightKg < 30 || weightKg > 300 || heightCm < 120 || heightCm > 230) return;
    state.profile = { weightKg: Math.round(weightKg * 10) / 10, heightCm: Math.round(heightCm * 10) / 10, bmiStandard: form.elements.bmiStandard.value === "international" ? "international" : "asian" };
    upsertWeight(localDateKey(), state.profile.weightKg);
    saveState(); renderAll(); showToast("Đã lưu hồ sơ và ghi cân hôm nay.");
  });

  $("[data-weight-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const date = form.elements.date.value;
    const kg = Number(form.elements.kg.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || kg < 30 || kg > 300) return;
    upsertWeight(date, kg);
    const latest = state.weights[state.weights.length - 1];
    if (latest) state.profile.weightKg = latest.kg;
    saveState(); $("#weightDialog").close(); renderAll(); showToast("Đã cập nhật chart cân nặng.");
  });

  function upsertWeight(date, kg) {
    const rounded = Math.round(Number(kg) * 10) / 10;
    const found = state.weights.find((item) => item.date === date);
    if (found) found.kg = rounded;
    else state.weights.push({ date, kg: rounded });
    state.weights.sort((a, b) => a.date.localeCompare(b.date));
  }

  $("[data-settings-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    state.settings.baselineKcal = safeNumber(form.elements.baselineKcal.value, 800, 4000, 1600);
    state.settings.targetDeficit = safeNumber(form.elements.targetDeficit.value, 100, 1000, 400);
    saveState(); $("#settingsDialog").close(); renderAll(); showToast("Đã cập nhật model năng lượng.");
  });

  window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));

  renderAll();
  navigate(location.hash.slice(1) || "today");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=2").catch((error) => console.warn("Service worker chưa sẵn sàng.", error)));
  }
})();
