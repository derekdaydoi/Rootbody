(() => {
  "use strict";

  const STORAGE_KEY = "rootbody.device.v2";
  const LEGACY_STORAGE_KEYS = ["rootbody.device.v1", "rootbody.v1", "rootbody.v2", "rootbody.v3", "rootbody.v4", "rootbody.v5"];
  const MODEL_VERSION = "0.6";
  const KCAL_PER_KG = 7700;
  const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  const kg3 = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const longDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });

  const foodData = window.ROOTBODY_FOOD_DATA || { foods: [], quickIds: [], cookingMethods: {}, mealTemplates: [] };
  const FOOD_INDEX = new Map(foodData.foods.map((item) => [item.id, item]));
  const FOOD_SAMPLES = foodData.quickIds.map((id) => FOOD_INDEX.get(id)).filter(Boolean);
  const CONFIDENCE_LABELS = { high: "Tin cậy cao", medium: "Tin cậy vừa", low: "Sai số rộng" };

  const ACTIVITY_NAMES = {
    walk: "Đi bộ", run: "Chạy", badminton: "Cầu lông",
    gym_bike: "Đạp xe", gym_treadmill: "Máy chạy", gym_stair: "Máy leo cầu thang",
    gym_shoulder: "Máy tập cơ vai", gym_alpha: "Máy đa năng (chưa xác minh)",
    gym_dumbbell: "Tạ đơn", gym_bench: "Nằm nâng ngực",
    gym_adductor: "Máy khép đùi", gym_abductor: "Máy mở đùi",
    gym_session: "Giáo án rootbody",
    legacy: "Vận động V1"
  };
  const LEVELS = {
    weak: { label: "Yếu", met: 3.5 },
    poor: { label: "Kém", met: 4.5 },
    medium: { label: "Trung bình", met: 5.5 },
    medium_plus: { label: "Trung bình +", met: 6.0 },
    good: { label: "Khá", met: 7.0 },
    strong: { label: "Giỏi", met: 9.0 }
  };
  const STRENGTH_LEVELS = {
    gym_light: { label: "Nhẹ · nghỉ nhiều", offset: -0.7 },
    gym_medium: { label: "Vừa · nghỉ tiêu chuẩn", offset: 0 },
    gym_heavy: { label: "Nặng · nghỉ ngắn", offset: 1.5 }
  };
  const ALL_LEVELS = { ...LEVELS, ...STRENGTH_LEVELS };
  const STRENGTH_TYPES = new Set(["gym_shoulder", "gym_alpha", "gym_dumbbell", "gym_bench", "gym_adductor", "gym_abductor"]);
  const STRENGTH_BASE_MET = {
    gym_shoulder: 3.5, gym_alpha: 3.5, gym_dumbbell: 4.0,
    gym_bench: 4.0, gym_adductor: 3.2, gym_abductor: 3.2
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let state = loadState();
  let toastTimer;
  let lockedScrollY = 0;
  let viewportCleanup = null;
  let selectedFoodId = null;
  let suggestionOffset = 0;

  function defaultState() {
    return {
      version: 1,
      modelVersion: MODEL_VERSION,
      profile: {
        name: "", age: null, biologicalSex: "unknown", weightKg: null, heightCm: null, waistCm: null,
        systolic: null, diastolic: null, restingHr: null, activityLevel: "moderate", smoking: "unknown",
        alcohol: "unknown", knownConditions: "", medications: "", familyHistory: "", bmiStandard: "asian"
      },
      settings: { baselineKcal: 1600, targetDeficit: 500 },
      days: {},
      weights: [],
      measurements: { waist: [], restingHr: [], bloodPressure: [] },
      labs: { hepatitisStatus: "unknown", measuredDate: "", alt: null, ast: null, ggt: null },
      coach: {
        settings: { goal: "recomp", daysPerWeek: 3, cardioDays: 1, sportDays: 1, priorityMuscles: [], minutes: 45, experience: "beginner", hasPain: false },
        ui: { activityTab: "today" },
        recoveryByDate: {},
        activeWorkout: null,
        workoutHistory: [],
        protocolLogs: []
      }
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
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalizeState(JSON.parse(current));
    } catch (error) {
      console.warn("rootbody không đọc được dữ liệu local.", error);
    }
    return defaultState();
  }

  function normalizeState(value) {
    const fresh = defaultState();
    if (!value || typeof value !== "object") return fresh;
    fresh.profile.name = String(value.profile?.name || "").trim().slice(0, 60);
    fresh.profile.age = nullableNumber(value.profile?.age, 18, 100);
    fresh.profile.biologicalSex = ["male", "female", "intersex", "unknown"].includes(value.profile?.biologicalSex) ? value.profile.biologicalSex : "unknown";
    fresh.profile.weightKg = nullableNumber(value.profile?.weightKg, 30, 300);
    fresh.profile.heightCm = nullableNumber(value.profile?.heightCm, 120, 230);
    fresh.profile.waistCm = nullableNumber(value.profile?.waistCm, 40, 250);
    fresh.profile.systolic = nullableNumber(value.profile?.systolic, 60, 260);
    fresh.profile.diastolic = nullableNumber(value.profile?.diastolic, 35, 160);
    fresh.profile.restingHr = nullableNumber(value.profile?.restingHr, 30, 220);
    fresh.profile.activityLevel = ["low", "moderate", "high"].includes(value.profile?.activityLevel) ? value.profile.activityLevel : "moderate";
    fresh.profile.smoking = ["never", "former", "current", "unknown"].includes(value.profile?.smoking) ? value.profile.smoking : "unknown";
    fresh.profile.alcohol = ["none", "one_three", "four_seven", "eight_plus", "unknown"].includes(value.profile?.alcohol) ? value.profile.alcohol : "unknown";
    fresh.profile.knownConditions = String(value.profile?.knownConditions || "").trim().slice(0, 500);
    fresh.profile.medications = String(value.profile?.medications || "").trim().slice(0, 500);
    fresh.profile.familyHistory = String(value.profile?.familyHistory || "").trim().slice(0, 500);
    fresh.profile.bmiStandard = value.profile?.bmiStandard === "international" ? "international" : "asian";
    fresh.settings.baselineKcal = safeNumber(value.settings?.baselineKcal, 800, 4000, 1600);
    fresh.settings.targetDeficit = safeNumber(value.settings?.targetDeficit, 100, 1000, 500);
    fresh.weights = normalizeWeights(value.weights);
    fresh.measurements = normalizeMeasurements(value.measurements);
    fresh.labs = normalizeLabs(value.labs);
    Object.entries(value.days || {}).forEach(([date, day]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      fresh.days[date] = { meals: normalizeMeals(day?.meals), activities: normalizeActivities(day?.activities) };
    });
    fresh.coach = normalizeCoach(value.coach);
    return fresh;
  }

  function normalizeMeasurements(value) {
    const base = { waist: [], restingHr: [], bloodPressure: [] };
    if (!value || typeof value !== "object") return base;
    const byDate = (items, mapper) => {
      const found = new Map();
      (Array.isArray(items) ? items : []).forEach((item) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item?.date)) return;
        const next = mapper(item);
        if (next) found.set(item.date, { date: item.date, ...next });
      });
      return [...found.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-180);
    };
    base.waist = byDate(value.waist, (item) => {
      const cm = nullableNumber(item.cm, 40, 250);
      return cm === null ? null : { cm: Math.round(cm * 10) / 10 };
    });
    base.restingHr = byDate(value.restingHr, (item) => {
      const bpm = nullableNumber(item.bpm, 30, 220);
      return bpm === null ? null : { bpm: Math.round(bpm) };
    });
    base.bloodPressure = byDate(value.bloodPressure, (item) => {
      const systolic = nullableNumber(item.systolic, 60, 260);
      const diastolic = nullableNumber(item.diastolic, 35, 160);
      return systolic === null || diastolic === null ? null : { systolic: Math.round(systolic), diastolic: Math.round(diastolic) };
    });
    return base;
  }

  function normalizeLabs(value) {
    const marker = (item) => {
      if (!item || typeof item !== "object") return null;
      const result = nullableNumber(item.value, 0, 10000);
      if (result === null) return null;
      return {
        value: Math.round(result * 10) / 10,
        unit: String(item.unit || "U/L").slice(0, 20),
        refLow: nullableNumber(item.refLow, 0, 10000),
        refHigh: nullableNumber(item.refHigh, 0, 10000)
      };
    };
    return {
      hepatitisStatus: ["unknown", "not_tested", "negative", "positive"].includes(value?.hepatitisStatus) ? value.hepatitisStatus : "unknown",
      measuredDate: /^\d{4}-\d{2}-\d{2}$/.test(value?.measuredDate) ? value.measuredDate : "",
      alt: marker(value?.alt), ast: marker(value?.ast), ggt: marker(value?.ggt)
    };
  }

  function normalizeCoach(value) {
    const base = defaultState().coach;
    if (!value || typeof value !== "object") return base;
    const goal = ["fat", "muscle", "recomp"].includes(value.settings?.goal) ? value.settings.goal : "recomp";
    const daysPerWeek = [2, 3, 4].includes(Number(value.settings?.daysPerWeek)) ? Number(value.settings.daysPerWeek) : 3;
    const cardioDays = [0, 1, 2, 3].includes(Number(value.settings?.cardioDays)) ? Number(value.settings.cardioDays) : goal === "fat" ? 2 : goal === "recomp" ? 1 : 0;
    const sportDays = [0, 1, 2].includes(Number(value.settings?.sportDays)) ? Number(value.settings.sportDays) : 1;
    const validMuscles = new Set(["chest", "lats", "upper_back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "adductors", "calves", "core"]);
    const priorityMuscles = Array.isArray(value.settings?.priorityMuscles) ? [...new Set(value.settings.priorityMuscles.filter((item) => validMuscles.has(item)))].slice(0, 2) : [];
    const minutes = [30, 45, 60].includes(Number(value.settings?.minutes)) ? Number(value.settings.minutes) : 45;
    const experience = value.settings?.experience === "intermediate" ? "intermediate" : "beginner";
    const activityTab = ["today", "plan"].includes(value.ui?.activityTab) ? value.ui.activityTab : "today";
    const recoveryByDate = {};
    Object.entries(value.recoveryByDate || {}).forEach(([date, item]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !item || typeof item !== "object") return;
      recoveryByDate[date] = {
        sleepHours: safeNumber(item.sleepHours, 0, 16, 7),
        sleepContinuity: ["continuous", "woke_once", "fragmented"].includes(item.sleepContinuity) ? item.sleepContinuity : "continuous",
        energy: safeNumber(item.energy, 1, 5, 3),
        soreness: safeNumber(item.soreness, 0, 10, 3),
        illness: Boolean(item.illness), sharpPain: Boolean(item.sharpPain), redFlag: Boolean(item.redFlag),
        checkedAt: String(item.checkedAt || `${date}T12:00:00`)
      };
    });
    const workoutHistory = Array.isArray(value.workoutHistory) ? value.workoutHistory.filter(Boolean).slice(-100).map((item) => ({
      sessionId: String(item.sessionId || uid()), name: String(item.name || "Giáo án rootbody").slice(0, 80),
      goal: ["fat", "muscle", "recomp"].includes(item.goal) ? item.goal : "recomp",
      minutes: safeNumber(item.minutes, 1, 300, 45), completedAt: String(item.completedAt || new Date().toISOString()),
      completedSets: safeNumber(item.completedSets, 0, 100, 0), kcal: safeNumber(item.kcal, 0, 5000, 0)
    })) : [];
    const normalizeProtocolCheckin = (checkin) => checkin && typeof checkin === "object" ? {
      calm: safeNumber(checkin.calm, 1, 5, 3),
      focus: safeNumber(checkin.focus, 1, 5, 3),
      energy: safeNumber(checkin.energy, 1, 5, 3)
    } : null;
    const protocolLogs = Array.isArray(value.protocolLogs) ? value.protocolLogs.filter(Boolean).slice(-200).map((item) => ({
      id: String(item.id || "").slice(0, 60),
      completedAt: String(item.completedAt || new Date().toISOString()),
      before: normalizeProtocolCheckin(item.before),
      after: normalizeProtocolCheckin(item.after),
      retentions: Array.isArray(item.retentions) ? item.retentions.slice(0, 3).map((seconds) => safeNumber(seconds, 0, 180, 0)) : []
    })).filter((item) => item.id) : [];
    return {
      settings: { goal, daysPerWeek, cardioDays, sportDays, priorityMuscles, minutes, experience, hasPain: Boolean(value.settings?.hasPain) },
      ui: { activityTab }, recoveryByDate,
      activeWorkout: normalizeActiveWorkout(value.activeWorkout), workoutHistory, protocolLogs
    };
  }

  function normalizeActiveWorkout(value) {
    if (!value || typeof value !== "object" || !value.sessionId || !Array.isArray(value.exercises)) return null;
    return {
      sessionId: String(value.sessionId), templateId: String(value.templateId || "full_a"),
      name: String(value.name || "Giáo án rootbody").slice(0, 80),
      goal: ["fat", "muscle", "recomp"].includes(value.goal) ? value.goal : "recomp",
      startedAt: String(value.startedAt || new Date().toISOString()),
      exerciseIndex: safeNumber(value.exerciseIndex, 0, Math.max(0, value.exercises.length), 0),
      reduced: Boolean(value.reduced),
      exercises: value.exercises.slice(0, 12).map((exercise) => ({
        id: String(exercise.id || "").slice(0, 60), name: String(exercise.name || "Bài tập").slice(0, 80),
        equipment: String(exercise.equipment || "core").slice(0, 40), kind: ["strength", "timed", "cardio"].includes(exercise.kind) ? exercise.kind : "strength",
        sets: safeNumber(exercise.sets, 1, 8, 2), reps: String(exercise.reps || "8–12").slice(0, 30),
        rir: safeNumber(exercise.rir, 0, 6, 2), rest: safeNumber(exercise.rest, 0, 300, 60),
        cue: String(exercise.cue || "").slice(0, 240), skipped: Boolean(exercise.skipped),
        logs: Array.isArray(exercise.logs) ? exercise.logs.slice(0, 8).map((log) => ({
          load: nullableNumber(log.load, 0, 1000), reps: nullableNumber(log.reps, 0, 200),
          effort: nullableNumber(log.effort, 0, 10), completedAt: String(log.completedAt || new Date().toISOString())
        })) : []
      }))
    };
  }

  function normalizeMeals(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(Boolean).map((item) => {
      const kcal = safeNumber(item.kcal, 1, 5000, 1);
      return {
        id: String(item.id || uid()),
        name: String(item.name || "Món ăn").slice(0, 80),
        kcal,
        kcalLow: safeNumber(item.kcalLow, 0, 5000, kcal),
        kcalHigh: safeNumber(item.kcalHigh, 1, 6000, kcal),
        proteinG: safeNumber(item.proteinG, 0, 500, 0),
        confidence: ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "low",
        serving: item.serving ? String(item.serving).slice(0, 180) : "",
        source: ["sample", "estimator", "suggestion"].includes(item.source) ? item.source : "manual",
        createdAt: String(item.createdAt || new Date().toISOString())
      };
    });
  }

  function normalizeActivities(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(Boolean).map((item) => ({
      id: String(item.id || uid()), type: ACTIVITY_NAMES[item.type] ? item.type : "legacy",
      name: String(item.name || ACTIVITY_NAMES[item.type] || "Vận động").slice(0, 60),
      kcal: safeNumber(item.kcal, 0, 10000, 0), steps: safeNumber(item.steps, 0, 100000, 0),
      minutes: nullableNumber(item.minutes, 1, 600), met: nullableNumber(item.met, 1, 30),
      level: item.level && ALL_LEVELS[item.level] ? item.level : null,
      resistance: nullableNumber(item.resistance, 1, 30), cadenceRpm: nullableNumber(item.cadenceRpm, 30, 140),
      inclinePct: nullableNumber(item.inclinePct, 0, 20),
      distanceKm: nullableNumber(item.distanceKm, 0, 100), speedKmh: nullableNumber(item.speedKmh, 0, 50),
      sourceWorkoutSessionId: item.sourceWorkoutSessionId ? String(item.sourceWorkoutSessionId).slice(0, 100) : null,
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
    state.version = 1;
    state.modelVersion = MODEL_VERSION;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("rootbody không lưu được dữ liệu local.", error);
      showToast("Không lưu được dữ liệu. Kiểm tra dung lượng trình duyệt.");
      return false;
    }
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
      protein: (day?.meals || []).reduce((sum, item) => sum + Number(item.proteinG || 0), 0),
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

  function normalizeSearch(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
  }

  function roundUpTen(value) { return Math.ceil(Number(value || 0) / 10) * 10; }

  function proteinTarget() {
    const weight = Number(state.profile.weightKg);
    return Number.isFinite(weight) ? Math.round(clamp(weight * 1.6, 80, 180)) : 100;
  }

  function foodEstimate(food, amount = 1, methodId = "as_served") {
    const multiplier = clamp(Number(amount) || 1, 0.25, 5);
    const method = food.allowCooking
      ? (foodData.cookingMethods[methodId] || foodData.cookingMethods.as_served)
      : foodData.cookingMethods.as_served;
    const nominal = food.kcal * multiplier + method.kcal * multiplier;
    const low = food.low * multiplier + method.low * multiplier;
    const high = food.high * multiplier + method.high * multiplier;
    const factor = food.confidence === "high" ? 0.25 : food.confidence === "medium" ? 0.4 : 0.55;
    return {
      kcal: roundUpTen(nominal + Math.max(0, high - nominal) * factor),
      nominal: Math.round(nominal),
      low: Math.round(low),
      high: Math.round(high),
      protein: Math.round(food.protein * multiplier),
      confidence: food.confidence,
      method: method.name,
      amount: multiplier
    };
  }

  function mealFromFood(food, amount = 1, methodId = "as_served", source = "estimator") {
    const estimate = foodEstimate(food, amount, methodId);
    const portion = amount === 1 ? food.serving : `${String(amount).replace(".", ",")} × ${food.serving}`;
    const methodCopy = food.allowCooking && methodId !== "as_served" ? ` · ${estimate.method}` : "";
    return {
      id: uid(), name: food.name, serving: `${portion}${methodCopy}`,
      kcal: estimate.kcal, kcalLow: estimate.low, kcalHigh: estimate.high,
      proteinG: estimate.protein, confidence: estimate.confidence, source,
      createdAt: new Date().toISOString()
    };
  }

  function quickMeal(food) {
    return {
      id: uid(), name: food.name, serving: food.serving,
      kcal: roundUpTen(food.kcal), kcalLow: food.low, kcalHigh: food.high,
      proteinG: food.protein, confidence: food.confidence, source: "sample",
      createdAt: new Date().toISOString()
    };
  }

  function templateNutrition(template) {
    const details = template.items.map((part) => {
      const food = FOOD_INDEX.get(part.id);
      if (!food) return null;
      return { food, amount: part.amount, estimate: foodEstimate(food, part.amount, "as_served") };
    }).filter(Boolean);
    const nominal = details.reduce((sum, item) => sum + item.estimate.nominal, 0);
    const low = details.reduce((sum, item) => sum + item.estimate.low, 0);
    const high = details.reduce((sum, item) => sum + item.estimate.high, 0);
    const protein = details.reduce((sum, item) => sum + item.estimate.protein, 0);
    return {
      kcal: roundUpTen(nominal + Math.max(0, high - nominal) * 0.35),
      nominal, low, high, protein,
      serving: details.map(({ food, amount }) => `${amount === 1 ? "" : `${String(amount).replace(".", ",")} × `}${food.name}`).join(" · ")
    };
  }

  function mealFromTemplate(template) {
    const nutrition = templateNutrition(template);
    return {
      id: uid(), name: template.name, serving: nutrition.serving,
      kcal: nutrition.kcal, kcalLow: nutrition.low, kcalHigh: nutrition.high,
      proteinG: nutrition.protein, confidence: "medium", source: "suggestion",
      createdAt: new Date().toISOString()
    };
  }

  function renderMealSuggestions(day, sum, targetBudget, remaining) {
    const targetProtein = proteinTarget();
    const proteinRemaining = Math.max(0, targetProtein - sum.protein);
    const mealsLeft = Math.max(1, 3 - day.meals.length);
    const idealKcal = clamp(Math.max(0, remaining) / mealsLeft, 280, 700);
    const idealProtein = clamp(proteinRemaining / mealsLeft, 20, 50);
    const candidates = foodData.mealTemplates.map((template) => ({ template, nutrition: templateNutrition(template) }));
    candidates.sort((a, b) => {
      const score = (item) => {
        const over = Math.max(0, item.nutrition.kcal - Math.max(250, remaining));
        return Math.abs(item.nutrition.kcal - idealKcal) + over * 3 - Math.min(item.nutrition.protein, idealProtein) * 4;
      };
      return score(a) - score(b);
    });
    const chosen = [];
    for (let index = 0; index < candidates.length && chosen.length < 3; index += 1) {
      chosen.push(candidates[(index + suggestionOffset) % candidates.length]);
    }

    $("[data-protein-consumed]").textContent = integer.format(sum.protein);
    $("[data-protein-target]").textContent = integer.format(targetProtein);
    $("[data-protein-fill]").style.width = `${clamp(sum.protein / targetProtein * 100, 0, 100)}%`;
    $("[data-meal-budget]").textContent = remaining > 0 ? `${integer.format(remaining)} kcal còn lại` : `Vượt ${integer.format(Math.abs(remaining))} kcal`;
    $("[data-meal-guidance]").textContent = remaining <= 0
      ? "Ngân sách calorie đã hết. Nếu vẫn đói, ưu tiên một bữa nhỏ giàu đạm và rau; không nhịn cực đoan để bù."
      : `Mỗi bữa tiếp theo nên quanh ${integer.format(idealKcal)} kcal và ${integer.format(idealProtein)} g protein.`;
    $("[data-meal-suggestions]").innerHTML = chosen.map(({ template, nutrition }) => `
      <article class="meal-suggestion-card">
        <div class="meal-suggestion-top"><span>${integer.format(nutrition.protein)} g protein</span><strong>${integer.format(nutrition.kcal)} kcal</strong></div>
        <h3>${escapeHtml(template.name)}</h3>
        <p>${escapeHtml(template.description)}</p>
        <small>${escapeHtml(nutrition.serving)} · khoảng ${integer.format(nutrition.low)}–${integer.format(nutrition.high)} kcal</small>
        <button class="meal-add-button" type="button" data-suggested-meal="${escapeHtml(template.id)}">Thêm bữa này</button>
      </article>`).join("");
  }

  function renderFoodSearch(query = "") {
    const normalized = normalizeSearch(query);
    const results = foodData.foods.filter((food) => {
      if (!normalized) return true;
      return normalizeSearch(`${food.name} ${food.keywords} ${food.category}`).includes(normalized);
    }).slice(0, 12);
    const target = $("[data-food-results]");
    if (!results.length) {
      target.innerHTML = '<div class="empty-state">Chưa có món khớp. Dùng phần “Nhập calorie thủ công” bên dưới.</div>';
      return;
    }
    target.innerHTML = results.map((food) => `<button class="food-result${food.id === selectedFoodId ? " is-selected" : ""}" type="button" data-select-food="${escapeHtml(food.id)}"><span><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(food.serving)} · ${escapeHtml(food.category)}</small></span><b>${integer.format(food.kcal)} kcal</b></button>`).join("");
  }

  function selectFood(id) {
    const food = FOOD_INDEX.get(id);
    if (!food) return;
    selectedFoodId = id;
    const form = $("[data-food-estimator-form]");
    form.elements.portion.value = "1";
    form.elements.cookingMethod.value = "as_served";
    $("[data-food-selection]").hidden = false;
    $("[data-selected-food-name]").textContent = food.name;
    $("[data-selected-food-serving]").textContent = food.serving;
    $("[data-cooking-field]").hidden = !food.allowCooking;
    $("[data-add-estimated-food]").disabled = false;
    renderFoodSearch(form.elements.foodSearch.value);
    updateFoodEstimatePreview();
  }

  function updateFoodEstimatePreview() {
    const food = FOOD_INDEX.get(selectedFoodId);
    if (!food) return;
    const form = $("[data-food-estimator-form]");
    const estimate = foodEstimate(food, Number(form.elements.portion.value), form.elements.cookingMethod.value);
    $("[data-food-estimate-kcal]").textContent = `${integer.format(estimate.kcal)} kcal`;
    $("[data-food-estimate-range]").textContent = `Khoảng ${integer.format(estimate.low)}–${integer.format(estimate.high)} kcal`;
    $("[data-food-estimate-protein]").textContent = `${integer.format(estimate.protein)} g protein · ${CONFIDENCE_LABELS[estimate.confidence]}`;
  }

  function openMealEstimator() {
    selectedFoodId = null;
    const form = $("[data-food-estimator-form]");
    form.reset();
    $("[data-food-selection]").hidden = true;
    $("[data-add-estimated-food]").disabled = true;
    renderFoodSearch();
    openDialog("mealDialog");
  }

  function renderAll() {
    renderToday();
    renderActivity();
    renderProfile();
    renderHistory();
    prefillForms();
    window.RootbodyCoach?.render?.();
    window.dispatchEvent(new CustomEvent("rootbody:render", { detail: { version: state.version } }));
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
      $("[data-deficit-kcal]").textContent = deficit >= 0
        ? `${integer.format(deficit)} kcal thâm hụt`
        : `${integer.format(Math.abs(deficit))} kcal dư`;
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

    renderMealSuggestions(day, sum, targetBudget, remaining);
    const grid = $("[data-food-grid]");
    grid.innerHTML = FOOD_SAMPLES.map((item) => `<button class="food-chip" type="button" data-food-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><span>${integer.format(item.kcal)} kcal · ${integer.format(item.protein)} g đạm</span><small>${escapeHtml(item.serving)} · ${escapeHtml(CONFIDENCE_LABELS[item.confidence])}</small></button>`).join("");
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
      const mealDetail = [item.serving || "Ước tính thủ công", item.proteinG ? `${integer.format(item.proteinG)} g protein` : "", item.confidence ? CONFIDENCE_LABELS[item.confidence] : ""].filter(Boolean).join(" · ");
      const detail = isMeal ? mealDetail : activityDetail(item);
      const kg = kcalToKg(item.kcal);
      return `<article class="log-item"><span class="log-mark">${isMeal ? "ĂN" : "TẬP"}</span><div class="log-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(detail)}</small></div><div class="log-number"><strong>${isMeal ? "+" : "−"}${integer.format(item.kcal)} kcal</strong><small>${isMeal ? "+" : "−"}${kg3.format(kg)} kg eq.</small></div><button class="delete-entry" type="button" data-delete-kind="${item.kind}" data-delete-id="${escapeHtml(item.id)}" aria-label="Xóa ${escapeHtml(item.name)}">×</button></article>`;
    }).join("");
  }

  function activityDetail(item) {
    const bits = [];
    if (item.minutes) bits.push(`${integer.format(item.minutes)} phút`);
    if (item.steps) bits.push(`${integer.format(item.steps)} bước`);
    if (item.level && ALL_LEVELS[item.level]) bits.push(ALL_LEVELS[item.level].label);
    if (item.resistance) bits.push(`level ${integer.format(item.resistance)}/30`);
    if (item.cadenceRpm) bits.push(`${integer.format(item.cadenceRpm)} RPM`);
    if (item.type === "gym_treadmill" && Number.isFinite(item.inclinePct)) bits.push(`dốc ${number.format(item.inclinePct)}%`);
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
    const dates = Object.keys(state.days)
      .filter((date) => (state.days[date]?.meals?.length || 0) + (state.days[date]?.activities?.length || 0) > 0)
      .sort()
      .reverse();
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
      profileForm.elements.name.value = state.profile.name || "";
      profileForm.elements.age.value = state.profile.age || "";
      profileForm.elements.biologicalSex.value = state.profile.biologicalSex;
      profileForm.elements.weightKg.value = state.profile.weightKg || "";
      profileForm.elements.heightCm.value = state.profile.heightCm || "";
      profileForm.elements.waistCm.value = state.profile.waistCm || "";
      profileForm.elements.systolic.value = state.profile.systolic || "";
      profileForm.elements.diastolic.value = state.profile.diastolic || "";
      profileForm.elements.restingHr.value = state.profile.restingHr || "";
      profileForm.elements.activityLevel.value = state.profile.activityLevel;
      profileForm.elements.smoking.value = state.profile.smoking;
      profileForm.elements.alcohol.value = state.profile.alcohol;
      profileForm.elements.knownConditions.value = state.profile.knownConditions || "";
      profileForm.elements.medications.value = state.profile.medications || "";
      profileForm.elements.familyHistory.value = state.profile.familyHistory || "";
      profileForm.elements.bmiStandard.value = state.profile.bmiStandard;
    }
    const settingsForm = $("[data-settings-form]");
    settingsForm.elements.baselineKcal.value = state.settings.baselineKcal;
    settingsForm.elements.targetDeficit.value = state.settings.targetDeficit;
    const weightDate = $("[data-weight-form]").elements.date;
    weightDate.max = localDateKey();
    weightDate.value ||= localDateKey();
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

  function treadmillMet(speedKmh, inclinePct) {
    const speedMpm = speedKmh * 1000 / 60;
    const grade = inclinePct / 100;
    const oxygen = speedKmh < 8
      ? 3.5 + 0.1 * speedMpm + 1.8 * speedMpm * grade
      : 3.5 + 0.2 * speedMpm + 0.9 * speedMpm * grade;
    return clamp(oxygen / 3.5, 2, 18);
  }

  function bikeMet(resistance, cadenceRpm) {
    const resistanceMet = 3.5 + ((resistance - 1) / 29) * 5.5;
    const cadenceAdjustment = clamp((cadenceRpm - 70) * 0.025, -0.75, 1.5);
    return clamp(resistanceMet + cadenceAdjustment, 3.5, 10.5);
  }

  function strengthMet(type, intensity) {
    const base = STRENGTH_BASE_MET[type] || 3.5;
    return clamp(base + (STRENGTH_LEVELS[intensity] || STRENGTH_LEVELS.gym_medium).offset, 2.5, 6.0);
  }

  function estimateNetKcal(met, weightKg, minutes) {
    const rawKcal = Math.max(0, (Number(met) - 1) * 3.5 * Number(weightKg) / 200 * Number(minutes));
    return Math.floor(rawKcal / 10) * 10;
  }

  function readActivityInput(form) {
    return {
      steps: Number(form.elements.steps.value), minutes: Number(form.elements.minutes.value),
      level: form.elements.level.value, intensity: form.elements.gymIntensity.value,
      resistance: Number(form.elements.resistance.value), cadenceRpm: Number(form.elements.cadenceRpm.value),
      treadmillSpeed: Number(form.elements.treadmillSpeed.value), inclinePct: Number(form.elements.inclinePct.value)
    };
  }

  function estimateActivity(type, input) {
    const { steps, minutes, level, intensity, resistance, cadenceRpm, treadmillSpeed, inclinePct } = input;
    const weight = Number(state.profile.weightKg);
    const height = Number(state.profile.heightCm);
    if (!weight) return { error: "Nhập cân nặng trong Cá nhân trước." };
    if (!Number.isFinite(minutes) || minutes < 1) return { error: "Nhập số phút hợp lệ." };
    let met, distanceKm = null, speedKmh = null;
    if (type === "badminton") {
      met = (LEVELS[level] || LEVELS.medium).met;
    } else if (type === "gym_bike") {
      if (!Number.isFinite(resistance) || resistance < 1 || resistance > 30) return { error: "Level xe phải từ 1 đến 30." };
      if (!Number.isFinite(cadenceRpm) || cadenceRpm < 30 || cadenceRpm > 140) return { error: "Nhịp đạp phải từ 30 đến 140 RPM." };
      met = bikeMet(resistance, cadenceRpm);
    } else if (type === "gym_treadmill") {
      if (!Number.isFinite(treadmillSpeed) || treadmillSpeed < 1 || treadmillSpeed > 25) return { error: "Tốc độ máy phải từ 1 đến 25 km/h." };
      if (!Number.isFinite(inclinePct) || inclinePct < 0 || inclinePct > 20) return { error: "Độ dốc phải từ 0 đến 20%." };
      speedKmh = treadmillSpeed;
      distanceKm = treadmillSpeed * minutes / 60;
      met = treadmillMet(treadmillSpeed, inclinePct);
    } else if (type === "gym_stair") {
      met = ({ gym_light: 4.5, gym_medium: 6.0, gym_heavy: 8.0 })[intensity] || 6.0;
    } else if (STRENGTH_TYPES.has(type)) {
      met = strengthMet(type, intensity);
    } else {
      if (!height) return { error: "Nhập chiều cao trong Cá nhân trước." };
      if (!Number.isFinite(steps) || steps < 1) return { error: "Nhập số bước hợp lệ." };
      const stepFactor = type === "walk" ? 0.415 : 0.65;
      distanceKm = steps * (height / 100) * stepFactor / 1000;
      speedKmh = distanceKm / (minutes / 60);
      if ((type === "walk" && speedKmh > 10) || (type === "run" && speedKmh > 30)) return { error: "Bước/phút tạo tốc độ phi thực tế. Kiểm tra lại." };
      met = type === "walk" ? walkingMet(speedKmh) : runningMet(speedKmh);
    }
    const kcal = estimateNetKcal(met, weight, minutes);
    return { kcal, met, distanceKm, speedKmh };
  }

  function updateActivityForm() {
    const form = $("[data-activity-form]");
    const type = form.elements.activityType.value;
    const isBadminton = type === "badminton";
    const usesSteps = type === "walk" || type === "run";
    const isBike = type === "gym_bike";
    const isTreadmill = type === "gym_treadmill";
    const isStair = type === "gym_stair";
    const isStrength = STRENGTH_TYPES.has(type);
    $("[data-steps-field]").hidden = !usesSteps;
    $("[data-level-field]").hidden = !isBadminton;
    $("[data-strength-field]").hidden = !(isStrength || isStair);
    $("[data-bike-resistance-field]").hidden = !isBike;
    $("[data-bike-cadence-field]").hidden = !isBike;
    $("[data-treadmill-speed-field]").hidden = !isTreadmill;
    $("[data-treadmill-incline-field]").hidden = !isTreadmill;
    form.elements.steps.required = usesSteps;
    form.elements.resistance.required = isBike;
    form.elements.cadenceRpm.required = isBike;
    form.elements.treadmillSpeed.required = isTreadmill;
    form.elements.inclinePct.required = isTreadmill;
    $("[data-activity-dialog-title]").textContent = `Thêm ${ACTIVITY_NAMES[type].toLowerCase()}`;
    const input = readActivityInput(form);
    const result = estimateActivity(type, input);
    const preview = $("[data-activity-preview]");
    if (result.error) {
      preview.innerHTML = `<span>Ước tính</span><strong>—</strong><small>${escapeHtml(result.error)}</small>`;
    } else {
      let meta = "";
      if (type === "badminton") meta = ` · ${LEVELS[input.level].label}`;
      else if (type === "gym_bike") meta = ` · level ${integer.format(input.resistance)}/30 · ${integer.format(input.cadenceRpm)} RPM`;
      else if (type === "gym_treadmill") meta = ` · ${number.format(input.treadmillSpeed)} km/h · dốc ${number.format(input.inclinePct)}%`;
      else if (isStrength || isStair) meta = ` · ${STRENGTH_LEVELS[input.intensity].label}`;
      else if (result.speedKmh) meta = ` · ~${number.format(result.speedKmh)} km/h`;
      preview.innerHTML = `<span>MET ${number.format(result.met)}${meta}</span><strong>${integer.format(result.kcal)} kcal ròng</strong><small>${kg3.format(kcalToKg(result.kcal))} kg eq.</small>`;
    }
  }

  function syncVisualViewport() {
    const viewport = window.visualViewport;
    document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(viewport?.height || window.innerHeight)}px`);
  }

  function lockPageForDialog(dialog) {
    if (document.body.classList.contains("sheet-open")) return;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.dataset.rootbodyScrollY = String(lockedScrollY);
    document.body.classList.add("sheet-open");
    document.body.style.position = "fixed";
    document.body.style.top = `${-lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    syncVisualViewport();

    const revealField = (event) => {
      if (!dialog.contains(event.target) || !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      syncVisualViewport();
      setTimeout(() => event.target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }), 280);
    };
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);
    document.addEventListener("focusin", revealField);
    viewportCleanup = () => {
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
      document.removeEventListener("focusin", revealField);
    };
  }

  function unlockPageAfterDialog() {
    if (!document.body.classList.contains("sheet-open")) return;
    const restoreY = Number(document.body.dataset.rootbodyScrollY || lockedScrollY || 0);
    document.body.classList.remove("sheet-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    delete document.body.dataset.rootbodyScrollY;
    document.documentElement.style.removeProperty("--visual-viewport-height");
    viewportCleanup?.();
    viewportCleanup = null;
    requestAnimationFrame(() => window.scrollTo({ top: restoreY, left: 0, behavior: "auto" }));
  }

  function closeDialog(dialogOrId) {
    const dialog = typeof dialogOrId === "string" ? document.getElementById(dialogOrId) : dialogOrId;
    if (dialog?.open) dialog.close();
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (id === "settingsDialog") prefillForms();
    if (id === "weightDialog") {
      const form = $("[data-weight-form]");
      form.elements.date.value = localDateKey();
      form.elements.date.max = localDateKey();
      form.elements.kg.value = state.profile.weightKg || "";
    }
    if (id === "activityDialog") updateActivityForm();
    if (!dialog.open) {
      lockPageForDialog(dialog);
      dialog.addEventListener("close", unlockPageAfterDialog, { once: true });
      dialog.showModal();
    }
  }

  function openActivityDialog(type) {
    if (!profileReady()) {
      showToast("Nhập cân nặng và chiều cao trước khi tính vận động.");
      navigate("you");
      setTimeout(() => openDialog("profileDialog"), 40);
      return;
    }
    const form = $("[data-activity-form]");
    form.reset();
    form.elements.activityType.value = type;
    form.elements.level.value = "medium";
    form.elements.gymIntensity.value = "gym_medium";
    updateActivityForm();
    openDialog("activityDialog");
  }

  function navigate(view) {
    const aliases = { history: "trends", activity: "training", profile: "you" };
    const requested = aliases[view] || view;
    const target = document.querySelector(`[data-view="${requested}"]`) ? requested : "today";
    $$("[data-view]").forEach((section) => section.classList.toggle("is-active", section.dataset.view === target));
    $$(".tab[data-nav]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.nav === target));
    if (location.hash !== `#${target}`) history.replaceState(null, "", `#${target}`);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (target === "trends") renderHistory();
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
    if (opener) {
      if (opener.dataset.openDialog === "activityDialog") openActivityDialog("walk");
      else if (opener.dataset.openDialog === "mealDialog") openMealEstimator();
      else openDialog(opener.dataset.openDialog);
      return;
    }
    const closer = event.target.closest("[data-close-dialog]");
    if (closer) { closeDialog(closer.dataset.closeDialog); return; }
    const option = event.target.closest("[data-activity-type]");
    if (option) { openActivityDialog(option.dataset.activityType); return; }
    const foodButton = event.target.closest("[data-food-id]");
    if (foodButton) {
      const sample = FOOD_SAMPLES.find((item) => item.id === foodButton.dataset.foodId);
      if (!sample) return;
      const meal = quickMeal(sample);
      dayData().meals.push(meal);
      saveState(); renderAll(); showToast(`Đã thêm ${sample.name}: ${meal.kcal} kcal.`); return;
    }
    const foodResult = event.target.closest("[data-select-food]");
    if (foodResult) { selectFood(foodResult.dataset.selectFood); return; }
    const suggestion = event.target.closest("[data-suggested-meal]");
    if (suggestion) {
      const template = foodData.mealTemplates.find((item) => item.id === suggestion.dataset.suggestedMeal);
      if (!template) return;
      const meal = mealFromTemplate(template);
      dayData().meals.push(meal);
      suggestionOffset = 0;
      saveState(); renderAll(); showToast(`Đã thêm ${template.name}: ${meal.kcal} kcal.`); return;
    }
    const refreshMeals = event.target.closest("[data-refresh-meals]");
    if (refreshMeals) {
      suggestionOffset = (suggestionOffset + 3) % Math.max(1, foodData.mealTemplates.length);
      const day = dayData();
      const sum = totals(day);
      const targetBudget = state.settings.baselineKcal - state.settings.targetDeficit + sum.activity;
      renderMealSuggestions(day, sum, targetBudget, targetBudget - sum.intake);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-kind]");
    if (deleteButton) {
      const day = dayData();
      const collection = deleteButton.dataset.deleteKind === "meal" ? "meals" : "activities";
      day[collection] = day[collection].filter((item) => item.id !== deleteButton.dataset.deleteId);
      saveState(); renderAll(); showToast("Đã xóa mục khỏi hôm nay.");
    }
  });

  $("[data-food-search]").addEventListener("input", (event) => renderFoodSearch(event.target.value));
  $("[data-food-estimator-form]").addEventListener("input", updateFoodEstimatePreview);
  $("[data-food-estimator-form]").addEventListener("change", updateFoodEstimatePreview);
  $("[data-food-estimator-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const food = FOOD_INDEX.get(selectedFoodId);
    if (!food) { showToast("Chọn một món trước."); return; }
    const meal = mealFromFood(food, Number(form.elements.portion.value), form.elements.cookingMethod.value);
    dayData().meals.push(meal);
    saveState(); form.reset(); closeDialog("mealDialog"); renderAll(); showToast(`Đã thêm ${food.name}: ${meal.kcal} kcal.`);
  });

  $("[data-manual-meal-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.mealName.value.trim();
    const kcal = Number(form.elements.mealKcal.value);
    const protein = Number(form.elements.mealProtein.value || 0);
    if (!name || !Number.isFinite(kcal) || kcal < 1 || !Number.isFinite(protein) || protein < 0) return;
    const counted = roundUpTen(kcal);
    dayData().meals.push({ id: uid(), name, serving: "Người dùng nhập calorie", kcal: counted, kcalLow: counted, kcalHigh: counted, proteinG: Math.round(protein), confidence: "low", source: "manual", createdAt: new Date().toISOString() });
    saveState(); form.reset(); closeDialog("mealDialog"); renderAll(); showToast("Đã thêm món thủ công và làm tròn calorie lên.");
  });

  $("[data-activity-form]").addEventListener("input", updateActivityForm);
  $("[data-activity-form]").addEventListener("change", updateActivityForm);
  $("[data-activity-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.elements.activityType.value;
    const input = readActivityInput(form);
    const steps = type === "walk" || type === "run" ? input.steps : 0;
    const result = estimateActivity(type, input);
    if (result.error) { showToast(result.error); return; }
    const level = type === "badminton" ? input.level : (STRENGTH_TYPES.has(type) || type === "gym_stair") ? input.intensity : null;
    dayData().activities.push({
      id: uid(), type, name: ACTIVITY_NAMES[type], kcal: result.kcal, steps, minutes: input.minutes,
      level, met: result.met,
      resistance: type === "gym_bike" ? input.resistance : null,
      cadenceRpm: type === "gym_bike" ? input.cadenceRpm : null,
      inclinePct: type === "gym_treadmill" ? input.inclinePct : null,
      distanceKm: result.distanceKm === null ? null : Math.round(result.distanceKm * 10) / 10,
      speedKmh: result.speedKmh === null ? null : Math.round(result.speedKmh * 10) / 10,
      createdAt: new Date().toISOString()
    });
    saveState(); form.reset(); closeDialog("activityDialog"); renderAll(); showToast(`Đã cộng ${result.kcal} kcal vận động ròng.`);
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
    const optional = (name) => form.elements[name].value === "" ? null : Number(form.elements[name].value);
    const systolic = optional("systolic");
    const diastolic = optional("diastolic");
    if ((systolic === null) !== (diastolic === null)) {
      showToast("Huyết áp cần đủ cả tâm thu và tâm trương.");
      return;
    }
    state.profile = {
      name: form.elements.name.value.trim().slice(0, 60),
      age: optional("age"),
      biologicalSex: ["male", "female", "intersex"].includes(form.elements.biologicalSex.value) ? form.elements.biologicalSex.value : "unknown",
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(heightCm * 10) / 10,
      waistCm: optional("waistCm"),
      systolic,
      diastolic,
      restingHr: optional("restingHr"),
      activityLevel: ["low", "moderate", "high"].includes(form.elements.activityLevel.value) ? form.elements.activityLevel.value : "moderate",
      smoking: ["never", "former", "current"].includes(form.elements.smoking.value) ? form.elements.smoking.value : "unknown",
      alcohol: ["none", "one_three", "four_seven", "eight_plus"].includes(form.elements.alcohol.value) ? form.elements.alcohol.value : "unknown",
      knownConditions: form.elements.knownConditions.value.trim().slice(0, 500),
      medications: form.elements.medications.value.trim().slice(0, 500),
      familyHistory: form.elements.familyHistory.value.trim().slice(0, 500),
      bmiStandard: form.elements.bmiStandard.value === "international" ? "international" : "asian"
    };
    upsertWeight(localDateKey(), state.profile.weightKg);
    upsertProfileMeasurement("waist", localDateKey(), state.profile.waistCm === null ? null : { cm: state.profile.waistCm });
    upsertProfileMeasurement("restingHr", localDateKey(), state.profile.restingHr === null ? null : { bpm: state.profile.restingHr });
    upsertProfileMeasurement("bloodPressure", localDateKey(), state.profile.systolic === null || state.profile.diastolic === null ? null : { systolic: state.profile.systolic, diastolic: state.profile.diastolic });
    saveState(); closeDialog("profileDialog"); renderAll(); navigate("today"); showToast("Đã lưu hồ sơ và cập nhật chỉ số hôm nay.");
  });

  function upsertProfileMeasurement(kind, date, payload) {
    if (!state.measurements?.[kind] || !payload) return;
    const found = state.measurements[kind].find((item) => item.date === date);
    if (found) Object.assign(found, payload);
    else state.measurements[kind].push({ date, ...payload });
    state.measurements[kind].sort((a, b) => a.date.localeCompare(b.date));
  }

  $("[data-weight-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const date = form.elements.date.value;
    const kg = Number(form.elements.kg.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > localDateKey() || kg < 30 || kg > 300) {
      showToast("Ngày cân hoặc cân nặng không hợp lệ.");
      return;
    }
    upsertWeight(date, kg);
    const latest = state.weights[state.weights.length - 1];
    if (latest) state.profile.weightKg = latest.kg;
    saveState(); closeDialog("weightDialog"); renderAll(); showToast("Đã cập nhật chart cân nặng.");
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
    const baseline = safeNumber(form.elements.baselineKcal.value, 800, 4000, 1600);
    const target = safeNumber(form.elements.targetDeficit.value, 100, 1000, 500);
    if (target >= baseline) {
      showToast("Mục tiêu thâm hụt phải thấp hơn calo nền.");
      return;
    }
    state.settings.baselineKcal = baseline;
    state.settings.targetDeficit = target;
    saveState(); closeDialog("settingsDialog"); renderAll(); showToast("Đã cập nhật model năng lượng.");
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) closeDialog(dialog);
    });
  });

  window.RootbodyCore = Object.freeze({
    getState: () => state,
    save: (shouldRender = true) => {
      const saved = saveState();
      if (shouldRender) renderAll();
      return saved;
    },
    addActivity: (activity, date = localDateKey()) => {
      const normalized = normalizeActivities([activity])[0];
      if (!normalized) return false;
      const day = dayData(date);
      if (normalized.sourceWorkoutSessionId && day.activities.some((item) => item.sourceWorkoutSessionId === normalized.sourceWorkoutSessionId)) return false;
      day.activities.push(normalized);
      saveState();
      renderAll();
      return true;
    },
    profileReady,
    localDateKey,
    calculateNetKcal: (met, minutes) => estimateNetKcal(met, state.profile.weightKg, minutes),
    openDialog,
    closeDialog,
    showToast,
    navigate,
    renderAll
  });

  window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));

  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (error) {}
  const resetInitialScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(resetInitialScroll);
  setTimeout(resetInitialScroll, 80);

  renderAll();
  navigate(location.hash.slice(1) || "today");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=71").catch((error) => console.warn("Service worker chưa sẵn sàng.", error)));
  }
})();

