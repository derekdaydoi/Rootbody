(() => {
  "use strict";

  const core = window.RootbodyCore;
  const health = window.RootbodyHealth;
  if (!core || !health) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const integer = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let trendDays = 84;
  let currentAssessment = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const setText = (selector, value) => { const target = $(selector); if (target) target.textContent = value; };
  const finite = (value) => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const stateLabel = (value) => health.statusLabel(value);
  const goalLabels = { fat: "Giảm mỡ", recomp: "Giảm mỡ + tăng cơ", muscle: "Tăng cơ toàn diện" };
  const sexLabels = { male: "Nam", female: "Nữ", intersex: "Liên giới tính", unknown: "Chưa khai báo" };
  const activityLabels = { low: "Ít vận động", moderate: "Vận động vừa", high: "Vận động cao" };

  function render() {
    const state = core.getState();
    currentAssessment = health.assess(state);
    renderToday(state, currentAssessment);
    renderAnalysis(state, currentAssessment);
    renderTraining(state, currentAssessment);
    renderTrends(state, currentAssessment);
    renderYou(state, currentAssessment);
    renderLabs(state);
  }

  function arrangeStaticFlows() {
    const profileForm = $("[data-profile-form]");
    const profileHost = $("[data-profile-dialog-body]");
    if (profileForm && profileHost && !profileHost.contains(profileForm)) profileHost.append(profileForm);
    const labPanel = $("#coachLab");
    const labHost = $("[data-you-experiments]");
    if (labPanel && labHost && !labHost.contains(labPanel)) {
      labPanel.hidden = false;
      labPanel.removeAttribute("data-activity-panel");
      labPanel.classList.remove("coach-panel");
      labPanel.classList.add("rb-experiments-panel");
      labHost.append(labPanel);
    }
  }

  function renderToday(state, assessment) {
    const hour = new Date().getHours();
    setText("[data-greeting]", hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối");
    Object.entries(assessment.domains).forEach(([key, domain]) => {
      const card = $(`[data-domain-card="${key}"]`);
      if (!card) return;
      card.dataset.state = domain.state;
      const status = $("[data-domain-status]", card);
      if (status) status.textContent = domain.label;
      card.title = domain.note;
    });

    const priority = assessment.priority;
    const priorityCard = $("[data-priority-card]");
    if (priorityCard) priorityCard.dataset.state = priority.state;
    setText("[data-priority-title]", priority.title);
    setText("[data-priority-fact]", priority.fact);
    setText("[data-priority-interpretation]", priority.interpretation);

    const actions = $("[data-health-actions]");
    if (actions) actions.innerHTML = assessment.actions.map((item) => `
      <div class="rb-action-row"><span class="rb-action-icon" aria-hidden="true">${actionIcon(item.icon)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.value)}</small></span><b aria-hidden="true">›</b></div>
    `).join("");
  }

  function actionIcon(type) {
    const paths = {
      nutrition: '<path d="M6 11h12l-1 8H7l-1-8Z"/><path d="M8 11c0-3 2-5 4-5s4 2 4 5M12 6V3"/>',
      strength: '<path d="M3 9v6m3-8v10m12-10v10m3-8v6M6 12h12"/>',
      steps: '<path d="M8 4c2 3 2 6 0 9-2 1-4 0-4-2 0-3 1-6 4-7Zm8 7c3 1 4 4 4 7 0 2-2 3-4 2-2-3-2-6 0-9Z"/>',
      cardio: '<path d="M3 13h4l2-6 4 10 2-7 2 3h4"/>'
    };
    return `<svg viewBox="0 0 24 24">${paths[type] || paths.cardio}</svg>`;
  }

  function renderAnalysis(state, assessment) {
    setText("[data-analysis-bmi]", assessment.bmi.value === null ? "—" : decimal.format(assessment.bmi.value));
    setSignal("bmi", assessment.bmi);
    setText("[data-analysis-waist]", assessment.waist.value === null ? "—" : assessment.waist.value.toFixed(2).replace(".", ","));
    setSignal("waist", assessment.waist);
    const bp = assessment.bloodPressure;
    setText("[data-analysis-bp]", bp.systolic === null ? "—" : `${Math.round(bp.systolic)}/${Math.round(bp.diastolic)}`);
    setSignal("bp", bp);

    const priority = assessment.priority;
    setText("[data-analysis-priority]", priority.title);
    setText("[data-analysis-copy]", `${priority.fact} ${priority.interpretation}`);
    setText("[data-analysis-risk]", stateLabel(priority.state));
    setText("[data-analysis-grade]", priority.grade === "—" ? "Chưa xếp hạng" : `Bằng chứng ${priority.grade}`);
    const interpretation = $("[data-analysis-interpretation]");
    if (interpretation) interpretation.dataset.state = priority.state;

    const contributors = $("[data-contributors]");
    if (contributors) contributors.innerHTML = assessment.contributors.length
      ? assessment.contributors.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
      : '<span class="is-empty">Chưa đủ dữ liệu để xếp yếu tố liên quan</span>';
  }

  function setSignal(name, result) {
    const target = $(`[data-analysis-${name}-signal]`);
    if (!target) return;
    target.textContent = result.label;
    target.dataset.state = result.state;
  }

  function renderLabs(state) {
    const container = $("[data-liver-context]");
    if (!container) return;
    const labs = state.labs || {};
    const markerRows = [["ALT", labs.alt], ["AST", labs.ast], ["GGT", labs.ggt]].filter(([, item]) => item?.value !== null && item?.value !== undefined);
    const hasData = labs.hepatitisStatus && !["unknown", "not_tested"].includes(labs.hepatitisStatus) || markerRows.length;
    if (!hasData) {
      container.innerHTML = '<div class="rb-empty-inline"><strong>Chưa có dữ liệu xét nghiệm</strong><span>Rootbody không điền giá trị mẫu.</span></div>';
      return;
    }
    const hepatitis = ({ negative: "Âm tính đã khai báo", positive: "Dương tính đã khai báo", not_tested: "Chưa xét nghiệm", unknown: "Chưa rõ" })[labs.hepatitisStatus] || "Chưa rõ";
    container.innerHTML = `
      <div class="rb-marker-row"><span>Viêm gan</span><strong>${escapeHtml(hepatitis)}</strong></div>
      ${markerRows.map(([name, item]) => {
        const hasRange = finite(item.refLow) !== null && finite(item.refHigh) !== null;
        const range = hasRange ? `${item.refLow}–${item.refHigh} ${item.unit}` : "Chưa nhập khoảng tham chiếu";
        return `<div class="rb-marker-row"><span>${name}</span><strong>${escapeHtml(item.value)} ${escapeHtml(item.unit)}</strong><small>${escapeHtml(range)}</small></div>`;
      }).join("")}
      ${labs.measuredDate ? `<p class="rb-card-note">Ngày xét nghiệm ${escapeHtml(labs.measuredDate.split("-").reverse().join("/"))}</p>` : ""}
    `;
  }

  function renderTraining(state, assessment) {
    const week = assessment.week;
    setText("[data-training-sessions]", integer.format(week.sessions));
    setText("[data-training-minutes]", integer.format(week.minutes));
    setText("[data-training-load]", "—");
    setText("[data-training-load-status]", week.sessions ? "Cần RPE" : "Chưa đủ");
    setText("[data-strength-sessions]", `${week.strengthSessions} buổi`);
    setText("[data-strength-volume]", week.workoutSets ? `${week.workoutSets} set hoàn tất` : "Chưa đủ set đã log");
    setText("[data-run-sessions]", `${week.runSessions} buổi`);
    setText("[data-run-distance]", week.runDistanceKm ? `${decimal.format(week.runDistanceKm)} km` : "Chưa có quãng đường");
    setText("[data-run-pace]", week.pace ? formatPace(week.pace) : "—");
    setText("[data-sport-sessions]", `${week.sportSessions} buổi`);
    setText("[data-sport-duration]", week.sportMinutes ? `${integer.format(week.sportMinutes)} phút` : "Chưa có thời lượng");
    setText("[data-training-rhr]", state.profile.restingHr ? `${integer.format(state.profile.restingHr)} bpm` : "—");
    setText("[data-training-sleep]", assessment.sleep.average7 === null ? "—" : `${decimal.format(assessment.sleep.average7)} giờ`);
    const latest = assessment.sleep.latest;
    setText("[data-training-energy]", latest ? `${latest.energy}/5` : "—");
    const recoveryText = latest?.redFlag ? "Safety gate đang chặn buổi tập." : latest ? "Dựa trên check-in tự khai báo hôm nay." : "Chưa check-in hôm nay.";
    setText("[data-training-recovery-note]", recoveryText);
  }

  function formatPace(minutesPerKm) {
    const whole = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - whole) * 60);
    return `${whole}:${String(seconds).padStart(2, "0")}/km`;
  }

  function renderTrends(state, assessment) {
    const cutoff = Date.now() - trendDays * 86400000;
    const within = (date) => !trendDays || health.parseDate(date).getTime() >= cutoff;
    renderSparkline("[data-waist-chart]", (state.measurements?.waist || []).filter((item) => within(item.date)), (item) => item.cm, "cm");
    setLatest("[data-waist-latest]", state.measurements?.waist, (item) => `${decimal.format(item.cm)} cm`);
    renderSparkline("[data-rhr-chart]", (state.measurements?.restingHr || []).filter((item) => within(item.date)), (item) => item.bpm, "bpm", true);
    setLatest("[data-rhr-latest]", state.measurements?.restingHr, (item) => `${integer.format(item.bpm)} bpm`);

    const sleepSeries = Object.entries(state.coach?.recoveryByDate || {}).map(([date, item]) => ({ date, value: item.sleepHours })).filter((item) => within(item.date));
    renderSparkline("[data-sleep-chart]", sleepSeries, (item) => item.value, "giờ");
    setLatest("[data-sleep-latest]", sleepSeries, (item) => `${decimal.format(item.value)} giờ`);

    const loadSeries = (state.coach?.workoutHistory || []).map((item) => ({ date: String(item.completedAt).slice(0, 10), value: item.minutes })).filter((item) => within(item.date));
    renderSparkline("[data-load-chart]", loadSeries, (item) => item.value, "phút");
    setText("[data-load-latest]", loadSeries.length ? `${integer.format(loadSeries.reduce((total, item) => total + item.value, 0))} phút` : "—");

    const paceSeries = [];
    Object.entries(state.days || {}).forEach(([date, day]) => {
      if (!within(date)) return;
      (day.activities || []).filter((item) => item.type === "gym_treadmill" && finite(item.distanceKm) >= 5 && finite(item.minutes) > 0).forEach((item) => paceSeries.push({ date, value: item.minutes / item.distanceKm }));
    });
    renderSparkline("[data-pace-chart]", paceSeries, (item) => item.value, "phút/km", true);
    setLatest("[data-pace-latest]", paceSeries, (item) => formatPace(item.value));

    const insight = buildTrendInsight(state, assessment);
    setText("[data-trend-insight]", insight.title);
    setText("[data-trend-insight-copy]", insight.copy);
  }

  function setLatest(selector, items, format) {
    const list = Array.isArray(items) ? items : [];
    setText(selector, list.length ? format(list[list.length - 1]) : "—");
  }

  function renderSparkline(selector, items, getter, unit, reverse = false) {
    const target = $(selector);
    if (!target) return;
    const values = items.map((item) => finite(getter(item))).filter((value) => value !== null);
    if (values.length < 2) {
      target.innerHTML = '<div class="rb-chart-empty">Chưa đủ dữ liệu để gọi là xu hướng</div>';
      return;
    }
    const width = 240, height = 92, pad = 8;
    let min = Math.min(...values), max = Math.max(...values);
    if (max === min) { max += 1; min -= 1; }
    const x = (index) => pad + index / (values.length - 1) * (width - pad * 2);
    const y = (value) => pad + ((reverse ? value - min : max - value) / (max - min)) * (height - pad * 2);
    const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    const area = `M ${points[0]} ${points.slice(1).map((point) => `L ${point}`).join(" ")} L ${x(values.length - 1)},${height - pad} L ${x(0)},${height - pad} Z`;
    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${values.length} điểm dữ liệu, đơn vị ${escapeHtml(unit)}"><path class="rb-spark-area" d="${area}"/><polyline class="rb-spark-line" points="${points.join(" ")}"/></svg>`;
  }

  function buildTrendInsight(state, assessment) {
    const weights = state.weights || [];
    const waists = state.measurements?.waist || [];
    if (weights.length >= 4 && waists.length >= 2) {
      const weightDelta = weights[weights.length - 1].kg - weights[0].kg;
      const waistDelta = waists[waists.length - 1].cm - waists[0].cm;
      if (Math.sign(weightDelta) === Math.sign(waistDelta) && weightDelta !== 0) return { title: "Hai chỉ số đang cùng hướng", copy: `Cân nặng ${signed(weightDelta, "kg")} và vòng eo ${signed(waistDelta, "cm")}. Chưa thể tách mỡ, nước và khối nạc.` };
    }
    return { title: "Chưa đủ dữ liệu cho insight", copy: "Cần nhiều phép đo lặp lại theo cùng quy trình trước khi diễn giải xu hướng." };
  }

  function signed(value, unit) {
    return `${value > 0 ? "+" : "−"}${decimal.format(Math.abs(value))} ${unit}`;
  }

  function renderYou(state, assessment) {
    const profile = state.profile;
    setText("[data-profile-name]", profile.name || "Người dùng Rootbody");
    const facts = [profile.age ? `${profile.age} tuổi` : null, sexLabels[profile.biologicalSex], profile.heightCm ? `${decimal.format(profile.heightCm)} cm` : null, profile.weightKg ? `${decimal.format(profile.weightKg)} kg` : null].filter(Boolean);
    setText("[data-profile-summary]", facts.join(" · "));
    setText("[data-profile-initials]", initials(profile.name));
    setText("[data-you-primary-goal]", goalLabels[state.coach?.settings?.goal] || "Chưa chọn");
    setText("[data-you-secondary-goal]", state.coach?.settings?.priorityMuscles?.length ? `${state.coach.settings.priorityMuscles.length} nhóm cơ ưu tiên` : "Chưa chọn nhóm cơ");
    setText("[data-you-activity-goal]", `${state.coach?.settings?.cardioDays || 0} cardio · ${state.coach?.settings?.sportDays || 0} thể thao/tuần`);
    setText("[data-you-plan-name]", `${goalLabels[state.coach?.settings?.goal] || "Giáo án"} · ${state.coach?.settings?.daysPerWeek || 3} buổi tạ`);
    setText("[data-you-plan-progress]", `${state.coach?.workoutHistory?.length || 0} buổi đã hoàn tất`);
    setText("[data-you-protein]", assessment.protein?.needsReview ? "Cần đánh giá chuyên môn" : assessment.protein ? `${assessment.protein.low}–${assessment.protein.high} g/ngày` : "Chưa đủ dữ liệu");
    setText("[data-you-sleep]", "≥7 giờ/đêm");
    setText("[data-you-calorie]", `${integer.format(state.settings.baselineKcal - state.settings.targetDeficit)} kcal · ước tính`);
    setText("[data-you-activity-level]", activityLabels[profile.activityLevel] || "Chưa khai báo");
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length ? `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase() : "RB";
  }

  function openReason() {
    const item = currentAssessment?.priority;
    if (!item) return;
    setText("[data-reason-title]", item.title);
    setText("[data-reason-fact]", item.fact);
    setText("[data-reason-inference]", item.interpretation);
    setText("[data-reason-risk]", stateLabel(item.state));
    setText("[data-reason-action]", item.action);
    setText("[data-reason-verify]", item.verify);
    setText("[data-reason-grade]", item.grade === "—" ? "Chưa xếp hạng" : `Grade ${item.grade}`);
    core.openDialog("reasonDialog");
  }

  function saveLabs(form) {
    const state = core.getState();
    const marker = (name) => {
      const value = finite(form.elements[`${name}Value`].value);
      if (value === null) return null;
      return {
        value,
        unit: form.elements[`${name}Unit`].value.trim() || "U/L",
        refLow: finite(form.elements[`${name}Low`].value),
        refHigh: finite(form.elements[`${name}High`].value)
      };
    };
    state.labs = { hepatitisStatus: form.elements.hepatitisStatus.value, measuredDate: form.elements.measuredDate.value, alt: marker("alt"), ast: marker("ast"), ggt: marker("ggt") };
    core.save(true);
    core.closeDialog("labsDialog");
    core.showToast("Đã lưu dữ liệu xét nghiệm tự khai báo.");
  }

  function prefillLabs() {
    const form = $("[data-labs-form]");
    if (!form) return;
    const labs = core.getState().labs || {};
    form.elements.hepatitisStatus.value = labs.hepatitisStatus || "unknown";
    form.elements.measuredDate.value = labs.measuredDate || "";
    ["alt", "ast", "ggt"].forEach((name) => {
      const item = labs[name] || {};
      form.elements[`${name}Value`].value = item.value ?? "";
      form.elements[`${name}Unit`].value = item.unit || "U/L";
      form.elements[`${name}Low`].value = item.refLow ?? "";
      form.elements[`${name}High`].value = item.refHigh ?? "";
    });
  }

  document.addEventListener("click", (event) => {
    const reason = event.target.closest("[data-open-reason]");
    if (reason) { openReason(); return; }
    const labs = event.target.closest('[data-open-dialog="labsDialog"]');
    if (labs) setTimeout(prefillLabs, 0);
    const range = event.target.closest("[data-trend-range]");
    if (range) {
      trendDays = Number(range.dataset.trendRange) || 0;
      $$('[data-trend-range]').forEach((button) => button.classList.toggle("is-active", button === range));
      renderTrends(core.getState(), currentAssessment || health.assess(core.getState()));
    }
  });

  $("[data-labs-form]")?.addEventListener("submit", (event) => { event.preventDefault(); saveLabs(event.currentTarget); });
  window.addEventListener("rootbody:render", render);

  const splash = $("[data-opening-splash]");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => {
    document.documentElement.classList.remove("splash-active");
    document.body.classList.remove("splash-active");
    splash?.remove();
    if (!core.profileReady() && !sessionStorage.getItem("rootbody.profilePrompted")) {
      sessionStorage.setItem("rootbody.profilePrompted", "1");
      setTimeout(() => core.openDialog("profileDialog"), 80);
    }
  }, reduced ? 700 : 3150);

  arrangeStaticFlows();
  render();
})();
