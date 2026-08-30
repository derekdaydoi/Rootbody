(() => {
  "use strict";

  const core = window.RootbodyCore;
  const catalog = window.ROOTBODY_COACH_DATA;
  if (!core || !catalog) {
    console.warn("Rootbody Coach chưa tải đủ dữ liệu.");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const int = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  let selectedTemplate = null;
  let currentExerciseId = null;
  let currentProtocolId = null;
  let pendingWorkoutStart = false;
  let returnToWorkout = false;
  let protocolTimerInterval = null;
  let protocolTimerEndAt = 0;
  let protocolTimerRemaining = 0;
  const WIM_BREATH_MS = 4000;
  const WIM_BREATHS = 30;
  const WIM_RECOVERY_MS = 15000;
  const WIM_RETENTION_CAP_MS = 180000;
  const WIM_ROUNDS = 3;
  let wimInterval = null;
  let wimPhase = "ready";
  let wimRound = 1;
  let wimPhaseStartedAt = 0;
  let wimRetentions = [];

  function state() { return core.getState(); }
  function coach() { return state().coach; }
  function settings() { return coach().settings; }

  function recoveryStatus(entry = coach().recoveryByDate[core.localDateKey()]) {
    if (!entry) return { state: "unset", label: "Chưa check-in", reason: "Chưa có dữ liệu phục hồi cho hôm nay.", adjustment: "Check-in là điều kiện bắt đầu giáo án." };
    if (entry.redFlag || entry.sharpPain || entry.illness) {
      const reason = entry.redFlag ? "Có dấu hiệu đau/tức ngực, khó thở bất thường hoặc choáng." : entry.sharpPain ? "Có đau nhói hoặc đau tăng dần." : "Đang sốt hoặc không khỏe.";
      return { state: "blocked", label: "Không tập cường độ cao", reason, adjustment: "Dừng. Triệu chứng nghiêm trọng hoặc không giảm cần hỗ trợ y tế phù hợp." };
    }
    const triggers = [];
    if (entry.sleepHours < 6) triggers.push(`ngủ ${entry.sleepHours} giờ`);
    if (entry.energy <= 2) triggers.push(`năng lượng ${entry.energy}/5`);
    if (entry.soreness >= 7) triggers.push(`đau mỏi ${entry.soreness}/10`);
    if (triggers.length) return { state: "reduced", label: "Giảm volume hôm nay", reason: `Tín hiệu: ${triggers.join(" · ")}.`, adjustment: "−1 set mỗi bài · RIR 3 · bỏ conditioning finisher." };
    return { state: "ready", label: "Sẵn sàng theo kế hoạch", reason: "Không có red flag và các chỉ báo chủ quan nằm trong vùng bình thường.", adjustment: "Giữ nguyên set/reps/RIR đã lập." };
  }

  function scheduleFor(config = settings()) {
    return catalog.schedules[config.goal]?.[config.daysPerWeek] || catalog.schedules.recomp[3];
  }

  function nextSession() {
    const schedule = scheduleFor();
    const completed = coach().workoutHistory.length;
    const index = completed % schedule.length;
    const templateId = schedule[index];
    return { templateId, index, total: schedule.length, template: catalog.sessions[templateId] };
  }

  function prescriptionFor(exercise, config = settings()) {
    const goal = catalog.goals[config.goal] || catalog.goals.recomp;
    if (exercise.kind === "cardio") return goal.cardio;
    if (exercise.role === "core") return goal.core;
    if (exercise.role === "accessory") return goal.accessory;
    return goal.compound;
  }

  function planExercises(templateId, { reduced = false } = {}) {
    const config = settings();
    const template = catalog.sessions[templateId] || catalog.sessions.full_a;
    const maxExercises = config.minutes === 30 ? 4 : 6;
    const priorityMuscles = new Set(config.priorityMuscles || []);
    let ids = template.exerciseIds.slice();
    if (config.goal !== "fat" && ids.length > maxExercises && priorityMuscles.size) {
      const selected = ids.slice(0, maxExercises);
      const omitted = ids.slice(maxExercises);
      priorityMuscles.forEach((muscle) => {
        if (selected.some((id) => catalog.exercises[id]?.muscles?.includes(muscle))) return;
        const candidate = omitted.find((id) => catalog.exercises[id]?.muscles?.includes(muscle));
        if (!candidate) return;
        const replaceAt = [...selected].reverse().findIndex((id) => catalog.exercises[id]?.role !== "compound");
        const index = replaceAt < 0 ? selected.length - 1 : selected.length - 1 - replaceAt;
        selected[index] = candidate;
      });
      ids = selected;
    } else ids = ids.slice(0, maxExercises);
    if (reduced) ids = ids.filter((id) => catalog.exercises[id]?.kind !== "cardio");
    return ids.map((id) => {
      const exercise = catalog.exercises[id];
      const prescription = prescriptionFor(exercise, config);
      let sets = prescription.sets;
      const prioritized = config.goal !== "fat" && exercise.kind === "strength" && (exercise.muscles || []).some((muscle) => priorityMuscles.has(muscle));
      if (config.minutes === 30) sets = Math.max(1, sets - 1);
      if (config.minutes === 60 && exercise.role === "compound") sets = Math.min(4, sets + 1);
      if (prioritized) sets = Math.min(5, sets + 1);
      if (reduced) sets = Math.max(1, sets - 1);
      return {
        id,
        name: exercise.name,
        equipment: exercise.equipment,
        kind: exercise.kind,
        sets,
        reps: exercise.kind === "timed" ? "20–45 giây" : prescription.reps,
        rir: reduced ? Math.max(3, prescription.rir) : prescription.rir,
        rest: prescription.rest,
        cue: exercise.cue,
        prioritized,
        logs: [],
        skipped: false
      };
    });
  }

  function prescriptionText(exercise) {
    if (exercise.kind === "cardio") return `${exercise.reps} · RPE 4–6`;
    return `${exercise.sets} × ${exercise.reps} · RIR ${exercise.rir} · nghỉ ${exercise.rest}s`;
  }

  function switchTab(tab, persist = true) {
    const safeTab = ["today", "plan", "lab"].includes(tab) ? tab : "today";
    coach().ui.activityTab = safeTab;
    $$('[data-activity-tab]').forEach((button) => {
      const active = button.dataset.activityTab === safeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $$('[data-activity-panel]').forEach((panel) => { panel.hidden = panel.dataset.activityPanel !== safeTab; });
    if (persist) core.save(false);
  }

  function renderOverview() {
    const info = nextSession();
    const active = coach().activeWorkout;
    const recovery = recoveryStatus();
    const goal = catalog.goals[settings().goal];
    $("[data-coach-session-index]").textContent = active ? "Đang thực hiện" : `Buổi ${info.index + 1}/${info.total}`;
    $("[data-today-workout-title]").textContent = active ? active.name : info.template.name;
    const exerciseCount = active ? active.exercises.length : planExercises(info.templateId).length;
    $("[data-today-workout-meta]").textContent = `${exerciseCount} bài · khoảng ${settings().minutes} phút · RIR ${settings().goal === "muscle" ? "1–3" : "2–3"}`;
    $("[data-coach-goal-label]").textContent = goal.name;
    $("[data-coach-recovery-label]").textContent = recovery.label;
    const cta = $("[data-start-workout]");
    cta.textContent = active ? "Tiếp tục buổi tập" : recovery.state === "blocked" ? "Buổi tập đang bị chặn" : "Bắt đầu buổi tập";
    cta.disabled = recovery.state === "blocked" || settings().hasPain;
    renderTodayExercises(active?.exercises || planExercises(info.templateId));
  }

  function renderTodayExercises(exercises) {
    $("[data-today-equipment]").innerHTML = exercises.map((exercise) => {
      const source = catalog.exercises[exercise.id];
      if (!source) return "";
      return `<button class="exercise-art-card" type="button" data-coach-action="exercise-guide" data-exercise-id="${escapeHtml(exercise.id)}"><img src="${escapeHtml(source.formImage || source.image)}" alt="Minh họa kỹ thuật bài ${escapeHtml(source.name)}"><span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(prescriptionText(exercise))}</small></span></button>`;
    }).join("");
  }

  function renderRecovery() {
    const entry = coach().recoveryByDate[core.localDateKey()];
    const result = recoveryStatus(entry);
    const card = $("[data-recovery-gate]");
    card.dataset.recoveryState = result.state;
    $("[data-recovery-status]").textContent = result.label;
    $("[data-recovery-reason]").textContent = result.reason;
    $("[data-recovery-adjustment]").textContent = result.adjustment;
    const metrics = $("[data-recovery-metrics]");
    metrics.hidden = !entry;
    if (entry) {
      $("[data-recovery-sleep]").textContent = `${String(entry.sleepHours).replace(".", ",")}h`;
      $("[data-recovery-energy]").textContent = `${entry.energy}/5`;
      $("[data-recovery-soreness]").textContent = `${entry.soreness}/10`;
    }
  }

  function renderRecommendations() {
    const config = settings();
    const goal = catalog.goals[config.goal] || catalog.goals.recomp;
    $$('[data-recommendation-goal]').forEach((button) => {
      const active = button.dataset.recommendationGoal === config.goal;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const selectedMuscles = new Set(config.priorityMuscles || []);
    const count = $("[data-recommendation-muscle-count]");
    if (count) count.textContent = `${selectedMuscles.size}/2 nhóm`;
    const muscles = $("[data-recommendation-muscles]");
    if (muscles) muscles.innerHTML = Object.entries(catalog.muscleGroups).map(([id, muscle]) => {
      const active = selectedMuscles.has(id);
      return `<button class="muscle-option${active ? " is-active" : ""}" type="button" data-recommendation-muscle="${escapeHtml(id)}" aria-pressed="${active}"><span>${escapeHtml(muscle.short)}</span></button>`;
    }).join("");

    const scored = Object.entries(catalog.exercises).map(([id, exercise], index) => {
      const muscleMatch = (exercise.muscles || []).some((muscle) => selectedMuscles.has(muscle));
      const cardio = exercise.kind === "cardio";
      let score = exercise.role === "compound" ? 35 : exercise.role === "accessory" ? 20 : 12;
      if (muscleMatch) score += 120;
      if (config.goal === "fat") score += cardio ? 100 : exercise.role === "compound" ? 35 : 0;
      if (config.goal === "recomp") score += cardio ? 38 : 45;
      if (config.goal === "muscle") score += cardio ? -200 : 70;
      return { id, exercise, score, index };
    }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, config.goal === "muscle" ? 10 : 9);

    const note = $("[data-recommendation-note]");
    if (note) note.textContent = goal.blurb.replace(/\b\d+ buổi\b/gi, "các buổi");
    const list = $("[data-recommendation-exercises]");
    if (!list) return;
    list.innerHTML = scored.map(({ id, exercise }) => {
      const prescription = prescriptionFor(exercise, config);
      const planned = { ...exercise, id, sets: prescription.sets, reps: exercise.kind === "timed" ? "20–45 giây" : prescription.reps, rir: prescription.rir, rest: prescription.rest };
      const muscleNames = (exercise.muscles || []).slice(0, 3).map((muscle) => catalog.muscleGroups[muscle]?.short).filter(Boolean).join(" · ");
      return `<button class="rb-exercise-card" type="button" data-coach-action="exercise-guide" data-exercise-id="${escapeHtml(id)}"><span class="rb-exercise-image"><img src="${escapeHtml(exercise.formImage || exercise.image)}" alt="Minh họa bài ${escapeHtml(exercise.name)}"></span><span class="rb-exercise-info"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(muscleNames)}</small><b>${escapeHtml(prescriptionText(planned))}</b></span><span class="rb-exercise-arrow" aria-hidden="true">↗</span></button>`;
    }).join("");
  }

  function renderPlan() {
    const config = settings();
    const goal = catalog.goals[config.goal];
    $$('[data-goal-option]').forEach((button) => {
      const active = button.dataset.goalOption === config.goal;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("[data-plan-frequency]").value = String(config.daysPerWeek);
    $("[data-plan-cardio]").value = String(config.cardioDays);
    $("[data-plan-sport]").value = String(config.sportDays);
    $("[data-plan-duration]").value = String(config.minutes);
    $("[data-plan-experience]").value = config.experience;
    $("[data-plan-limitations]").checked = config.hasPain;
    $("[data-plan-title]").textContent = goal.name;
    $("[data-plan-description]").textContent = goal.blurb;
    $("[data-plan-days]").textContent = config.daysPerWeek;
    $("[data-plan-cardio-stat]").textContent = config.cardioDays;
    $("[data-plan-sport-stat]").textContent = config.sportDays;
    $("[data-plan-minutes]").textContent = config.minutes;
    $("[data-plan-rir]").textContent = config.goal === "muscle" ? "1–3" : "2–3";
    $("[data-progression-rule]").textContent = catalog.progression;

    const prioritySection = $("[data-muscle-priority-section]");
    prioritySection.hidden = config.goal === "fat";
    const selectedMuscles = new Set(config.priorityMuscles || []);
    $("[data-muscle-priority-count]").textContent = `${selectedMuscles.size}/2 nhóm`;
    $("[data-muscle-options]").innerHTML = Object.entries(catalog.muscleGroups).map(([id, muscle]) => {
      const active = selectedMuscles.has(id);
      return `<button class="muscle-option${active ? " is-active" : ""}" type="button" data-muscle-option="${escapeHtml(id)}" aria-pressed="${active}"><span>${escapeHtml(muscle.short)}</span><small>${active ? "Đang ưu tiên" : "Maintenance mặc định"}</small></button>`;
    }).join("");

    const schedule = scheduleFor(config);
    if (!selectedTemplate || !schedule.includes(selectedTemplate)) selectedTemplate = schedule[0];
    const strengthCards = schedule.map((templateId, index) => {
      const template = catalog.sessions[templateId];
      const active = templateId === selectedTemplate;
      return `<button class="session-day${active ? " is-active" : ""}" type="button" data-coach-action="select-session" data-plan-session="${escapeHtml(templateId)}" aria-pressed="${active}"><span>Tạ · buổi ${index + 1}</span><strong>${escapeHtml(template.name)}</strong><small>${planExercises(templateId).length} bài</small></button>`;
    });
    const conditioningCards = [];
    if (config.cardioDays > 0) conditioningCards.push(`<article class="session-day mix-day"><span>Cardio · ${config.cardioDays} buổi</span><strong>Zone 2 / steady</strong><small>${escapeHtml(goal.cardio.reps)} · RPE 4–6</small></article>`);
    if (config.sportDays > 0) conditioningCards.push(`<article class="session-day mix-day"><span>Thể thao · ${config.sportDays} buổi</span><strong>Môn người dùng chọn</strong><small>45–90 phút · tính tải theo thực tế</small></article>`);
    $("[data-plan-week]").innerHTML = [...strengthCards, ...conditioningCards].join("");
    renderPlanExercises(selectedTemplate);
  }

  function renderPlanExercises(templateId) {
    const template = catalog.sessions[templateId] || catalog.sessions.full_a;
    const items = planExercises(templateId);
    $("[data-selected-session-title]").textContent = template.name;
    $("[data-plan-exercises]").innerHTML = items.map((exercise, index) => {
      const machine = catalog.equipment[exercise.equipment];
      const source = catalog.exercises[exercise.id];
      return `<article class="exercise-row${exercise.prioritized ? " is-priority" : ""}" data-plan-exercise data-exercise-id="${escapeHtml(exercise.id)}"><span class="exercise-index">${String(index + 1).padStart(2, "0")}</span><img src="${escapeHtml(source.formImage || source.image)}" alt="Minh họa kỹ thuật bài ${escapeHtml(source.name)}"><div class="exercise-copy"><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(prescriptionText(exercise))}</small><span>${escapeHtml(machine.name)}${exercise.prioritized ? " · +1 set ưu tiên" : ""}</span></div><button class="row-action" type="button" data-coach-action="exercise-guide" data-exercise-id="${escapeHtml(exercise.id)}" aria-label="Xem minh họa bài ${escapeHtml(exercise.name)}">↗</button></article>`;
    }).join("");
  }

  function renderLab() {
    const logs = coach().protocolLogs;
    const meditation = catalog.protocols.find((protocol) => protocol.category === "meditation");
    const lastMeditation = meditation ? [...logs].reverse().find((item) => item.id === meditation.id) : null;
    const status = $("[data-meditation-status]");
    if (status) {
      if (lastMeditation?.before && lastMeditation?.after) {
        const delta = (key) => lastMeditation.after[key] - lastMeditation.before[key];
        const signed = (value) => value > 0 ? `+${value}` : String(value);
        status.textContent = `Δ bình tĩnh ${signed(delta("calm"))} · focus ${signed(delta("focus"))} · tỉnh táo ${signed(delta("energy"))}`;
      } else if (lastMeditation) status.textContent = "Đã hoàn thành phiên gần nhất";
      else status.textContent = "Chưa có phiên";
    }
    const visibleIds = new Set(["caffeine_guardrail", "daylight", "wim_hof"]);
    $("[data-protocol-list]").innerHTML = catalog.protocols.filter((protocol) => visibleIds.has(protocol.id)).map((protocol) => {
      const last = [...logs].reverse().find((item) => item.id === protocol.id);
      const status = last ? `Đã làm ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(last.completedAt))}` : protocol.tag;
      return `<article class="protocol-card" data-protocol-card><div class="protocol-card-head"><span class="grade-badge grade-${protocol.grade.toLowerCase()}" data-protocol-evidence>${protocol.grade}</span><span>${escapeHtml(status)}</span></div><h2>${escapeHtml(protocol.title)}</h2><p>${escapeHtml(protocol.dose)}</p><small>${escapeHtml(protocol.summary)}</small><button class="secondary-button" type="button" data-coach-action="protocol" data-protocol-id="${escapeHtml(protocol.id)}">Mở protocol</button></article>`;
    }).join("");
  }

  function render() {
    if (!$("[data-activity-tabs]")) return;
    switchTab(coach().ui.activityTab, false);
    renderOverview();
    renderRecovery();
    renderPlan();
    renderRecommendations();
    renderLab();
  }

  function openRecovery() {
    const form = $("[data-recovery-form]");
    const entry = coach().recoveryByDate[core.localDateKey()];
    form.elements.sleepHours.value = entry?.sleepHours ?? 7;
    form.elements.sleepContinuity.value = entry?.sleepContinuity || "continuous";
    form.elements.energy.value = entry?.energy ?? 3;
    form.elements.soreness.value = entry?.soreness ?? 3;
    form.elements.illness.checked = Boolean(entry?.illness);
    form.elements.sharpPain.checked = Boolean(entry?.sharpPain);
    form.elements.redFlag.checked = Boolean(entry?.redFlag);
    $("[data-soreness-output]").textContent = `${form.elements.soreness.value}/10`;
    core.openDialog("recoveryDialog");
  }

  function saveRecovery(form) {
    const sleepHours = Number(String(form.elements.sleepHours.value).replace(",", "."));
    const energy = Number(form.elements.energy.value);
    const soreness = Number(form.elements.soreness.value);
    if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 16) {
      core.showToast("Thời lượng ngủ phải từ 0 đến 16 giờ.");
      return;
    }
    coach().recoveryByDate[core.localDateKey()] = {
      sleepHours: Math.round(sleepHours * 2) / 2,
      sleepContinuity: ["continuous", "woke_once", "fragmented"].includes(form.elements.sleepContinuity.value) ? form.elements.sleepContinuity.value : "continuous",
      energy,
      soreness,
      illness: form.elements.illness.checked,
      sharpPain: form.elements.sharpPain.checked,
      redFlag: form.elements.redFlag.checked,
      checkedAt: new Date().toISOString()
    };
    core.save(false);
    core.closeDialog("recoveryDialog");
    render();
    const result = recoveryStatus();
    if (pendingWorkoutStart) {
      pendingWorkoutStart = false;
      if (result.state === "blocked") core.showToast("Safety gate đang chặn buổi tập.");
      else setTimeout(startOrResumeWorkout, 40);
    } else {
      core.showToast(result.state === "reduced" ? "Đã giảm volume cho hôm nay." : result.state === "blocked" ? "Safety gate đang chặn buổi tập." : "Đã lưu check-in hôm nay.");
    }
  }

  function startOrResumeWorkout() {
    if (!core.profileReady()) {
      core.showToast("Nhập cân nặng và chiều cao trước khi bắt đầu.");
      core.navigate("you");
      setTimeout(() => core.openDialog("profileDialog"), 40);
      return;
    }
    if (settings().hasPain) {
      core.showToast("Đau nhói/chấn thương đang bật: chưa bắt đầu giáo án.");
      switchTab("plan");
      return;
    }
    if (coach().activeWorkout) {
      renderWorkout();
      core.openDialog("workoutDialog");
      return;
    }
    const recovery = recoveryStatus();
    if (recovery.state === "unset") {
      pendingWorkoutStart = true;
      openRecovery();
      return;
    }
    if (recovery.state === "blocked") {
      core.showToast("Safety gate đang chặn buổi tập.");
      return;
    }
    const info = nextSession();
    coach().activeWorkout = {
      sessionId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      templateId: info.templateId,
      name: info.template.name,
      goal: settings().goal,
      startedAt: new Date().toISOString(),
      exerciseIndex: 0,
      reduced: recovery.state === "reduced",
      exercises: planExercises(info.templateId, { reduced: recovery.state === "reduced" })
    };
    core.save(false);
    render();
    renderWorkout();
    core.openDialog("workoutDialog");
  }

  function renderWorkout() {
    const active = coach().activeWorkout;
    if (!active) return;
    $("[data-workout-session-title]").textContent = active.name;
    const completedExercises = active.exercises.filter((exercise) => exercise.skipped || exercise.logs.length >= exercise.sets).length;
    $("[data-workout-progress]").textContent = `${completedExercises}/${active.exercises.length} bài · ${catalog.goals[active.goal].name}`;
    $("[data-workout-progress-fill]").style.width = `${Math.round(completedExercises / Math.max(1, active.exercises.length) * 100)}%`;
    const finished = active.exerciseIndex >= active.exercises.length;
    $("[data-workout-active]").hidden = finished;
    $("[data-workout-summary]").hidden = !finished;
    if (finished) {
      const completedSets = active.exercises.reduce((sum, exercise) => sum + exercise.logs.length, 0);
      const skipped = active.exercises.filter((exercise) => exercise.skipped).length;
      $("[data-workout-summary-copy]").textContent = `${completedSets} set hoàn tất${skipped ? ` · ${skipped} bài bỏ qua` : ""}. Calorie được tính một lần theo thời lượng toàn buổi.`;
      const minuteInput = $("[data-workout-minutes]");
      minuteInput.value = settings().minutes;
      updateWorkoutKcalPreview();
      return;
    }
    const exercise = active.exercises[active.exerciseIndex];
    const source = catalog.exercises[exercise.id];
    const setNumber = Math.min(exercise.sets, exercise.logs.length + 1);
    $("[data-workout-round]").textContent = `Set ${setNumber}/${exercise.sets}`;
    $("[data-current-exercise-name]").textContent = exercise.name;
    $("[data-current-prescription]").textContent = prescriptionText(exercise);
    $("[data-current-cue]").textContent = exercise.cue;
    $("[data-current-equipment-image]").src = source.formImage || source.image;
    $("[data-current-equipment-image]").alt = `Minh họa kỹ thuật bài ${source.name}`;
    currentExerciseId = exercise.id;
    $("[data-rest-remaining]").textContent = exercise.rest ? `${exercise.rest} giây` : "Không áp dụng";
    $("[data-set-list]").innerHTML = exercise.logs.map((log, index) => {
      const value = exercise.kind === "cardio" ? `${log.reps} phút · RPE ${log.effort}` : exercise.kind === "timed" ? `${log.reps} giây · RIR ${log.effort}` : `${log.load || 0} kg × ${log.reps} · RIR ${log.effort}`;
      return `<span><b>Set ${index + 1}</b>${escapeHtml(value)}</span>`;
    }).join("");
    const loadField = $("[data-load-field]");
    loadField.hidden = exercise.kind !== "strength";
    $("[data-reps-label]").textContent = exercise.kind === "cardio" ? "Phút" : exercise.kind === "timed" ? "Giây" : "Reps";
    $("[data-effort-label]").textContent = exercise.kind === "cardio" ? "RPE" : "RIR";
    $("[data-set-load]").value = "";
    $("[data-set-reps]").value = "";
    $("[data-set-rir]").value = exercise.kind === "cardio" ? 5 : exercise.rir;
    $("[data-set-rir]").min = exercise.kind === "cardio" ? 1 : 0;
    $("[data-set-rir]").max = exercise.kind === "cardio" ? 10 : 5;
  }

  function parseLocaleNumber(value) {
    const parsed = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function completeSet() {
    const active = coach().activeWorkout;
    if (!active || active.exerciseIndex >= active.exercises.length) return;
    const exercise = active.exercises[active.exerciseIndex];
    const load = parseLocaleNumber($("[data-set-load]").value || "0");
    const reps = parseLocaleNumber($("[data-set-reps]").value);
    const effort = parseLocaleNumber($("[data-set-rir]").value);
    const maxReps = exercise.kind === "cardio" ? 90 : exercise.kind === "timed" ? 300 : 200;
    const maxEffort = exercise.kind === "cardio" ? 10 : 5;
    if (exercise.kind === "strength" && (load === null || load < 0 || load > 1000)) { core.showToast("Mức tạ phải từ 0 đến 1.000 kg."); return; }
    if (reps === null || reps < 1 || reps > maxReps) { core.showToast(exercise.kind === "cardio" ? "Nhập 1–90 phút." : exercise.kind === "timed" ? "Nhập 1–300 giây." : "Nhập 1–200 reps."); return; }
    if (effort === null || effort < (exercise.kind === "cardio" ? 1 : 0) || effort > maxEffort) { core.showToast(exercise.kind === "cardio" ? "RPE phải từ 1 đến 10." : "RIR phải từ 0 đến 5."); return; }
    exercise.logs.push({ load: exercise.kind === "strength" ? load : null, reps, effort, completedAt: new Date().toISOString() });
    if (exercise.logs.length >= exercise.sets) active.exerciseIndex += 1;
    core.save(false);
    renderWorkout();
  }

  function skipExercise() {
    const active = coach().activeWorkout;
    if (!active || active.exerciseIndex >= active.exercises.length) return;
    active.exercises[active.exerciseIndex].skipped = true;
    active.exerciseIndex += 1;
    core.save(false);
    renderWorkout();
  }

  function updateWorkoutKcalPreview() {
    const active = coach().activeWorkout;
    if (!active) return;
    const minutes = Number($("[data-workout-minutes]").value);
    const baseMet = catalog.goals[active.goal].met - (active.reduced ? 0.3 : 0);
    const kcal = Number.isFinite(minutes) && minutes >= 5 ? core.calculateNetKcal(baseMet, minutes) : 0;
    $("[data-workout-kcal-preview]").textContent = `${int.format(kcal)} kcal ròng`;
  }

  function finishWorkout() {
    const active = coach().activeWorkout;
    if (!active) return;
    const minutes = Number($("[data-workout-minutes]").value);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 300) { core.showToast("Thời lượng phải từ 5 đến 300 phút."); return; }
    const met = catalog.goals[active.goal].met - (active.reduced ? 0.3 : 0);
    const kcal = core.calculateNetKcal(met, minutes);
    const completedSets = active.exercises.reduce((sum, exercise) => sum + exercise.logs.length, 0);
    if (!coach().workoutHistory.some((item) => item.sessionId === active.sessionId)) {
      coach().workoutHistory.push({ sessionId: active.sessionId, name: active.name, goal: active.goal, minutes, completedSets, kcal, completedAt: new Date().toISOString() });
    }
    coach().activeWorkout = null;
    const added = core.addActivity({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "gym_session",
      name: `${active.name} · ${catalog.goals[active.goal].name}`,
      kcal,
      steps: 0,
      minutes,
      level: "gym_medium",
      met,
      sourceWorkoutSessionId: active.sessionId,
      createdAt: new Date().toISOString()
    });
    if (!added) core.save(true);
    core.closeDialog("workoutDialog");
    render();
    core.showToast(`Đã ghi một buổi: ${int.format(kcal)} kcal ròng.`);
  }

  function openExerciseGuide(id, fromWorkout = false) {
    const exercise = catalog.exercises[id];
    if (!exercise) return;
    const machine = catalog.equipment[exercise.equipment];
    if (!machine) return;
    currentExerciseId = id;
    $("[data-equipment-title]").textContent = exercise.name;
    const image = $("[data-equipment-image]");
    image.src = exercise.formImage || exercise.image;
    image.alt = `Kỹ thuật bài ${exercise.name}`;
    const muscleNames = (exercise.muscles || []).map((muscleId) => catalog.muscleGroups[muscleId]?.name).filter(Boolean);
    $("[data-equipment-verification]").textContent = `Nhóm cơ: ${muscleNames.join(" · ")}`;
    $("[data-equipment-setup]").innerHTML = machine.setup.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    $("[data-equipment-cues]").innerHTML = [exercise.cue, ...machine.cues].map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    $("[data-equipment-errors]").innerHTML = machine.errors.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    if (fromWorkout) {
      returnToWorkout = true;
      core.closeDialog("workoutDialog");
      setTimeout(() => core.openDialog("equipmentDialog"), 40);
    } else core.openDialog("equipmentDialog");
  }

  function currentProtocol() {
    return catalog.protocols.find((item) => item.id === currentProtocolId);
  }

  function formatProtocolTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function clearProtocolTimerInterval() {
    if (protocolTimerInterval) clearInterval(protocolTimerInterval);
    protocolTimerInterval = null;
  }

  function renderProtocolTimer() {
    const protocol = currentProtocol();
    const timer = $("[data-protocol-timer]");
    if (!timer) return;
    const hasTimer = Number(protocol?.timerSeconds) > 0;
    timer.hidden = !hasTimer;
    if (!hasTimer) return;
    $("[data-protocol-timer-value]").textContent = formatProtocolTime(protocolTimerRemaining);
    const toggle = $("[data-protocol-timer-toggle]");
    toggle.textContent = protocolTimerEndAt ? "Tạm dừng" : protocolTimerRemaining <= 0 ? "Làm lại" : protocolTimerRemaining < protocol.timerSeconds ? "Tiếp tục" : "Bắt đầu";
  }

  function pauseProtocolTimer() {
    if (protocolTimerEndAt) protocolTimerRemaining = Math.max(0, Math.ceil((protocolTimerEndAt - Date.now()) / 1000));
    protocolTimerEndAt = 0;
    clearProtocolTimerInterval();
    renderProtocolTimer();
  }

  function tickProtocolTimer() {
    if (!protocolTimerEndAt) return;
    protocolTimerRemaining = Math.max(0, Math.ceil((protocolTimerEndAt - Date.now()) / 1000));
    if (protocolTimerRemaining <= 0) {
      protocolTimerEndAt = 0;
      clearProtocolTimerInterval();
      core.showToast("Đủ thời gian. Ghi trạng thái sau rồi hoàn tất.");
      if (navigator.vibrate) navigator.vibrate(80);
    }
    renderProtocolTimer();
  }

  function toggleProtocolTimer() {
    const protocol = currentProtocol();
    if (!protocol?.timerSeconds) return;
    if (protocolTimerEndAt) { pauseProtocolTimer(); return; }
    if (protocolTimerRemaining <= 0) protocolTimerRemaining = protocol.timerSeconds;
    protocolTimerEndAt = Date.now() + protocolTimerRemaining * 1000;
    clearProtocolTimerInterval();
    protocolTimerInterval = setInterval(tickProtocolTimer, 250);
    renderProtocolTimer();
  }

  function resetProtocolTimer() {
    const protocol = currentProtocol();
    clearProtocolTimerInterval();
    protocolTimerEndAt = 0;
    protocolTimerRemaining = Number(protocol?.timerSeconds) || 0;
    renderProtocolTimer();
  }

  function protocolCheckin(phase) {
    return ["calm", "focus", "energy"].reduce((result, key) => {
      result[key] = Number($(`[data-protocol-${phase}="${key}"]`)?.value) || 3;
      return result;
    }, {});
  }

  function clearWimInterval() {
    if (wimInterval) clearInterval(wimInterval);
    wimInterval = null;
  }

  function wimElapsedMs() {
    return wimPhaseStartedAt ? Math.max(0, Date.now() - wimPhaseStartedAt) : 0;
  }

  function renderWimRetentions() {
    const wrap = $("[data-wim-retentions]");
    if (!wrap) return;
    wrap.hidden = !wimRetentions.length;
    wrap.innerHTML = wimRetentions.map((seconds, index) => `<span>Round ${index + 1} · ${formatProtocolTime(seconds)}</span>`).join("");
  }

  function renderWimGuide() {
    const protocol = currentProtocol();
    const guide = $("[data-wim-guide]");
    if (!guide) return;
    const isWim = protocol?.guidedMode === "wim_hof";
    guide.hidden = !isWim;
    if (!isWim) return;

    const elapsed = wimElapsedMs();
    const circle = $("[data-wim-circle]");
    const value = $("[data-wim-value]");
    const cue = $("[data-wim-cue]");
    const phase = $("[data-wim-phase]");
    const note = $("[data-wim-note]");
    const primary = $("[data-wim-primary]");
    let progress = 0;
    let circleState = "";
    let canStart = !protocol.requiresSafetyAck || $("[data-protocol-ack]").checked;

    $("[data-wim-round]").textContent = wimPhase === "done" ? "Hoàn tất 3 rounds" : `Round ${wimRound}/${WIM_ROUNDS}`;
    if (wimPhase === "ready") {
      value.textContent = String(WIM_BREATHS);
      cue.textContent = "nhịp thở";
      phase.textContent = "Sẵn sàng";
      note.textContent = "Vòng tròn chỉ gợi nhịp. Hít sâu, thả ra không ép và dừng ngay nếu khó chịu.";
      primary.textContent = `Bắt đầu round ${wimRound}`;
      primary.disabled = !canStart;
    } else if (wimPhase === "breathing") {
      const breath = Math.min(WIM_BREATHS, Math.floor(elapsed / WIM_BREATH_MS) + 1);
      const withinBreath = elapsed % WIM_BREATH_MS;
      const inhale = withinBreath < WIM_BREATH_MS / 2;
      progress = Math.min(1, elapsed / (WIM_BREATHS * WIM_BREATH_MS));
      circleState = inhale ? "is-inhale" : "is-exhale";
      value.textContent = `${breath}/${WIM_BREATHS}`;
      cue.textContent = inhale ? "Hít sâu" : "Thả lỏng";
      phase.textContent = "30 nhịp";
      note.textContent = inhale ? "Hít sâu bằng mũi hoặc miệng; để bụng nở tự nhiên." : "Thả hơi ra, không ép cạn phổi.";
      primary.textContent = "Đang dẫn nhịp";
      primary.disabled = true;
    } else if (wimPhase === "retention") {
      const seconds = Math.floor(elapsed / 1000);
      progress = (seconds % 60) / 60;
      circleState = "is-retention";
      value.textContent = formatProtocolTime(seconds);
      cue.textContent = "Giữ sau thở ra";
      phase.textContent = "Retention";
      note.textContent = "Không chạy theo con số. Bấm ngay khi cơ thể đòi thở; app tự dừng ở 3:00 như một guardrail, không phải target.";
      primary.textContent = "Tôi cần thở";
      primary.disabled = false;
    } else if (wimPhase === "recovery") {
      const remaining = Math.max(0, Math.ceil((WIM_RECOVERY_MS - elapsed) / 1000));
      progress = Math.min(1, elapsed / WIM_RECOVERY_MS);
      circleState = "is-recovery";
      value.textContent = formatProtocolTime(remaining);
      cue.textContent = "Recovery breath";
      phase.textContent = "Hít sâu · giữ";
      note.textContent = "Hít sâu một lần, giữ nhẹ 15 giây. Thả ra khi vòng tròn kết thúc.";
      primary.textContent = "Đang recovery";
      primary.disabled = true;
    } else {
      progress = 1;
      circleState = "is-recovery";
      value.textContent = "3/3";
      cue.textContent = "Hoàn tất";
      phase.textContent = "Kết thúc";
      note.textContent = "Trở lại thở bình thường. Thời gian retention chỉ là log quan sát, không phải thành tích.";
      primary.textContent = "Làm lại 3 rounds";
      primary.disabled = false;
    }
    circle.className = `wim-circle ${circleState}`.trim();
    circle.style.setProperty("--wim-progress", `${Math.round(progress * 360)}deg`);
    renderWimRetentions();
  }

  function startWimPhase(nextPhase) {
    clearWimInterval();
    wimPhase = nextPhase;
    wimPhaseStartedAt = ["breathing", "retention", "recovery"].includes(nextPhase) ? Date.now() : 0;
    if (wimPhaseStartedAt) wimInterval = setInterval(tickWimGuide, 100);
    renderWimGuide();
  }

  function finishWimRetention(seconds = Math.max(1, Math.round(wimElapsedMs() / 1000))) {
    wimRetentions.push(Math.min(180, seconds));
    startWimPhase("recovery");
  }

  function tickWimGuide() {
    const elapsed = wimElapsedMs();
    if (wimPhase === "breathing" && elapsed >= WIM_BREATHS * WIM_BREATH_MS) {
      startWimPhase("retention");
      if (navigator.vibrate) navigator.vibrate(50);
      return;
    }
    if (wimPhase === "retention" && elapsed >= WIM_RETENTION_CAP_MS) {
      finishWimRetention(180);
      core.showToast("Guardrail 3:00: chuyển sang recovery breath.");
      return;
    }
    if (wimPhase === "recovery" && elapsed >= WIM_RECOVERY_MS) {
      if (wimRound >= WIM_ROUNDS) startWimPhase("done");
      else { wimRound += 1; startWimPhase("ready"); }
      if (navigator.vibrate) navigator.vibrate(50);
      return;
    }
    renderWimGuide();
  }

  function resetWimGuide() {
    clearWimInterval();
    wimPhase = "ready";
    wimRound = 1;
    wimPhaseStartedAt = 0;
    wimRetentions = [];
    renderWimGuide();
  }

  function wimPrimaryAction() {
    const protocol = currentProtocol();
    if (protocol?.guidedMode !== "wim_hof") return;
    if (protocol.requiresSafetyAck && !$("[data-protocol-ack]").checked) { core.showToast("Đọc và xác nhận safety gate trước."); return; }
    if (wimPhase === "ready") startWimPhase("breathing");
    else if (wimPhase === "retention") finishWimRetention();
    else if (wimPhase === "done") resetWimGuide();
  }

  function openProtocol(id) {
    const protocol = catalog.protocols.find((item) => item.id === id);
    if (!protocol) return;
    currentProtocolId = id;
    resetProtocolTimer();
    resetWimGuide();
    $("[data-protocol-title]").textContent = protocol.title;
    const grade = $("[data-protocol-grade]");
    grade.textContent = protocol.grade;
    grade.className = `grade-badge grade-${protocol.grade.toLowerCase()}`;
    $("[data-protocol-dose]").textContent = protocol.dose;
    $("[data-protocol-summary]").textContent = protocol.summary;
    $("[data-protocol-steps]").innerHTML = protocol.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    $("[data-protocol-safety]").innerHTML = `<strong>Safety gate</strong><p>${escapeHtml(protocol.safety)}</p>`;
    const ackWrap = $("[data-protocol-ack-wrap]");
    const ack = $("[data-protocol-ack]");
    ackWrap.hidden = !protocol.requiresSafetyAck;
    ack.checked = false;
    renderWimGuide();
    const checkin = $("[data-protocol-checkin]");
    checkin.hidden = protocol.category !== "meditation";
    if (!checkin.hidden) $$('[data-protocol-before], [data-protocol-after]', checkin).forEach((control) => { control.value = "3"; });
    const complete = $("[data-protocol-start]");
    complete.disabled = Boolean(protocol.requiresSafetyAck);
    complete.textContent = protocol.guidedMode === "wim_hof" ? "Ghi buổi thở" : "Đánh dấu đã thực hiện";
    const source = $("[data-protocol-source]");
    source.href = protocol.source;
    source.textContent = `${protocol.sourceLabel} ↗`;
    core.openDialog("protocolDialog");
  }

  function completeProtocol() {
    const protocol = catalog.protocols.find((item) => item.id === currentProtocolId);
    if (!protocol) return;
    if (protocol.requiresSafetyAck && !$("[data-protocol-ack]").checked) { core.showToast("Đọc và xác nhận safety gate trước."); return; }
    const log = { id: protocol.id, completedAt: new Date().toISOString() };
    if (protocol.category === "meditation") {
      log.before = protocolCheckin("before");
      log.after = protocolCheckin("after");
    }
    if (protocol.guidedMode === "wim_hof") log.retentions = wimRetentions.slice(0, WIM_ROUNDS);
    coach().protocolLogs.push(log);
    core.save(false);
    pauseProtocolTimer();
    resetWimGuide();
    core.closeDialog("protocolDialog");
    renderLab();
    core.showToast(protocol.category === "meditation" ? "Đã ghi phiên tĩnh tâm và thay đổi trạng thái." : "Đã ghi protocol. Calorie không thay đổi.");
  }

  function updateSettingsFromControls() {
    const config = settings();
    config.daysPerWeek = Number($("[data-plan-frequency]").value);
    config.cardioDays = Number($("[data-plan-cardio]").value);
    config.sportDays = Number($("[data-plan-sport]").value);
    config.minutes = Number($("[data-plan-duration]").value);
    config.experience = $("[data-plan-experience]").value === "intermediate" ? "intermediate" : "beginner";
    config.hasPain = $("[data-plan-limitations]").checked;
    selectedTemplate = null;
    core.save(false);
    render();
  }

  document.addEventListener("click", (event) => {
    const recommendationGoal = event.target.closest("[data-recommendation-goal]");
    if (recommendationGoal) {
      const nextGoal = recommendationGoal.dataset.recommendationGoal;
      if (settings().goal !== nextGoal) {
        settings().goal = nextGoal;
        const defaults = catalog.goals[nextGoal].defaults;
        settings().daysPerWeek = defaults.strength;
        settings().cardioDays = defaults.cardio;
        settings().sportDays = defaults.sport;
      }
      core.save(false);
      renderRecommendations();
      return;
    }
    const recommendationMuscle = event.target.closest("[data-recommendation-muscle]");
    if (recommendationMuscle) {
      const priorities = settings().priorityMuscles || (settings().priorityMuscles = []);
      const id = recommendationMuscle.dataset.recommendationMuscle;
      const index = priorities.indexOf(id);
      if (index >= 0) priorities.splice(index, 1);
      else if (priorities.length >= 2) { core.showToast("Chọn tối đa 2 nhóm cơ ưu tiên."); return; }
      else priorities.push(id);
      core.save(false);
      renderRecommendations();
      return;
    }
    const tab = event.target.closest("[data-activity-tab]");
    if (tab) { switchTab(tab.dataset.activityTab); return; }
    const goal = event.target.closest("[data-goal-option]");
    if (goal) {
      const nextGoal = goal.dataset.goalOption;
      if (settings().goal !== nextGoal) {
        settings().goal = nextGoal;
        const defaults = catalog.goals[nextGoal].defaults;
        settings().daysPerWeek = defaults.strength;
        settings().cardioDays = defaults.cardio;
        settings().sportDays = defaults.sport;
      }
      selectedTemplate = null;
      core.save(false);
      render();
      return;
    }
    const muscle = event.target.closest("[data-muscle-option]");
    if (muscle) {
      const priorities = settings().priorityMuscles || (settings().priorityMuscles = []);
      const id = muscle.dataset.muscleOption;
      const index = priorities.indexOf(id);
      if (index >= 0) priorities.splice(index, 1);
      else if (priorities.length >= 2) { core.showToast("Chọn tối đa 2 nhóm cơ ưu tiên."); return; }
      else priorities.push(id);
      core.save(false);
      render();
      return;
    }
    const action = event.target.closest("[data-coach-action]");
    if (!action) return;
    switch (action.dataset.coachAction) {
      case "start": startOrResumeWorkout(); break;
      case "recovery": openRecovery(); break;
      case "show-plan": switchTab("plan"); break;
      case "select-session": selectedTemplate = action.dataset.planSession; renderPlan(); break;
      case "exercise-guide": openExerciseGuide(action.dataset.exerciseId); break;
      case "exercise-current": openExerciseGuide(currentExerciseId, true); break;
      case "complete-set": completeSet(); break;
      case "skip-exercise": skipExercise(); break;
      case "finish-workout": finishWorkout(); break;
      case "protocol": openProtocol(action.dataset.protocolId); break;
      case "toggle-protocol-timer": toggleProtocolTimer(); break;
      case "reset-protocol-timer": resetProtocolTimer(); break;
      case "wim-primary": wimPrimaryAction(); break;
      case "wim-reset": resetWimGuide(); break;
      case "complete-protocol": completeProtocol(); break;
    }
  });

  $("[data-activity-tabs]").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = $$('[data-activity-tab]');
    const current = tabs.indexOf(document.activeElement);
    const next = (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    switchTab(tabs[next].dataset.activityTab);
  });

  $("[data-plan-frequency]").addEventListener("change", updateSettingsFromControls);
  $("[data-plan-cardio]").addEventListener("change", updateSettingsFromControls);
  $("[data-plan-sport]").addEventListener("change", updateSettingsFromControls);
  $("[data-plan-duration]").addEventListener("change", updateSettingsFromControls);
  $("[data-plan-experience]").addEventListener("change", updateSettingsFromControls);
  $("[data-plan-limitations]").addEventListener("change", updateSettingsFromControls);
  $("[data-recovery-soreness]").addEventListener("input", (event) => { $("[data-soreness-output]").textContent = `${event.target.value}/10`; });
  $("[data-recovery-form]").addEventListener("submit", (event) => { event.preventDefault(); saveRecovery(event.currentTarget); });
  $("[data-workout-minutes]").addEventListener("input", updateWorkoutKcalPreview);
  $("[data-protocol-ack]").addEventListener("change", (event) => { $("[data-protocol-start]").disabled = !event.target.checked; renderWimGuide(); });
  $("#protocolDialog").addEventListener("close", () => { pauseProtocolTimer(); resetWimGuide(); });
  $("#equipmentDialog").addEventListener("close", () => {
    if (!returnToWorkout || !coach().activeWorkout) return;
    returnToWorkout = false;
    setTimeout(() => { renderWorkout(); core.openDialog("workoutDialog"); }, 40);
  });
  window.addEventListener("pagehide", () => { pauseProtocolTimer(); clearWimInterval(); if (coach().activeWorkout) core.save(false); });

  window.RootbodyCoach = Object.freeze({ render, startOrResumeWorkout });
  render();
})();
