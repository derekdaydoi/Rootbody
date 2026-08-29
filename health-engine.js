(() => {
  "use strict";

  const DAY_MS = 86400000;
  const finite = (value) => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const parseDate = (key) => { const [y, m, d] = String(key).split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);
  const textHas = (value, pattern) => pattern.test(String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

  function bmi(profile) {
    const weight = finite(profile?.weightKg);
    const height = finite(profile?.heightCm);
    return weight && height ? weight / ((height / 100) ** 2) : null;
  }

  function waistToHeight(profile) {
    const waist = finite(profile?.waistCm);
    const height = finite(profile?.heightCm);
    return waist && height ? waist / height : null;
  }

  function bmiSignal(profile) {
    const value = bmi(profile);
    if (value === null) return { value: null, label: "Chưa có", state: "unknown", detail: "Cần cân nặng và chiều cao." };
    const asian = profile?.bmiStandard !== "international";
    if (value < 18.5) return { value, label: "Dưới 18,5", state: "watch", detail: "BMI thấp hơn vùng tham chiếu; BMI chỉ là screening." };
    if (asian) {
      if (value < 23) return { value, label: "Dưới mốc 23", state: "stable", detail: "Asian action points không thay thế chẩn đoán hoặc đo thành phần cơ thể." };
      if (value < 27.5) return { value, label: "Từ mốc 23", state: "watch", detail: "Đây là public-health action point, không phải chẩn đoán." };
      return { value, label: "Từ mốc 27,5", state: "actionable", detail: "Nên diễn giải cùng vòng eo, xu hướng và bối cảnh sức khỏe." };
    }
    if (value < 25) return { value, label: "Trong vùng 18,5–24,9", state: "stable", detail: "BMI là surrogate marker, không phải tỷ lệ mỡ." };
    if (value < 30) return { value, label: "Từ mốc 25", state: "watch", detail: "Nên diễn giải cùng vòng eo và xu hướng." };
    return { value, label: "Từ mốc 30", state: "actionable", detail: "Screening này không tự xác nhận tình trạng bệnh." };
  }

  function waistSignal(profile, measurements = {}) {
    const value = waistToHeight(profile);
    if (value === null) return { value: null, label: "Chưa có", state: "unknown", detail: "Cần vòng eo và chiều cao." };
    const waistLogs = Array.isArray(measurements.waist) ? measurements.waist.filter((item) => finite(item?.cm) !== null) : [];
    const repeated = waistLogs.filter((item) => finite(item.cm) / finite(profile.heightCm) >= .5).length >= 2;
    if (value < .4) return { value, label: "Dưới 0,40", state: "watch", detail: "Ngoài vùng 0,40–0,49; cần xem cùng BMI và bối cảnh." };
    if (value < .5) return { value, label: "Dưới mốc 0,50", state: "stable", detail: "Chưa thấy tín hiệu central adiposity theo ngưỡng đang dùng." };
    if (value < .6) return { value, label: repeated ? "Tăng, đã lặp lại" : "Trên mốc 0,50", state: repeated ? "actionable" : "watch", detail: repeated ? "Tín hiệu central adiposity đã xuất hiện ở ít nhất hai lần đo." : "Đo lại cùng quy trình trước khi gọi là xu hướng." };
    return { value, label: repeated ? "Cao, đã lặp lại" : "Từ 0,60", state: repeated ? "actionable" : "watch", detail: repeated ? "Tín hiệu central adiposity cao đã lặp lại." : "Đo lại đúng kỹ thuật để xác nhận." };
  }

  function bloodPressureSignal(profile) {
    const systolic = finite(profile?.systolic);
    const diastolic = finite(profile?.diastolic);
    if (systolic === null || diastolic === null) return { systolic: null, diastolic: null, label: "Chưa có", state: "unknown", detail: "Cần một lần đo thực; nhiều ngày mới hỗ trợ diễn giải ổn định." };
    if (systolic > 180 || diastolic > 120) return { systolic, diastolic, label: "Rất cao", state: "medical", detail: "Nghỉ yên và đo lại. Nếu vẫn rất cao, liên hệ y tế; có triệu chứng cảnh báo thì gọi cấp cứu địa phương." };
    if (systolic >= 140 || diastolic >= 90) return { systolic, diastolic, label: "Cao hơn ngưỡng", state: "actionable", detail: "Một lần đo không xác nhận chẩn đoán; cần đo lại đúng kỹ thuật và trao đổi chuyên môn nếu lặp lại." };
    if (systolic >= 130 || diastolic >= 80) return { systolic, diastolic, label: "Cần theo dõi", state: "watch", detail: "Đo lại đúng kỹ thuật trên nhiều ngày." };
    if (systolic >= 120) return { systolic, diastolic, label: "Cao hơn vùng tối ưu", state: "watch", detail: "Theo dõi nhiều lần đo thay vì kết luận từ một lần." };
    return { systolic, diastolic, label: "Trong vùng <120/80", state: "stable", detail: "Một lần đo không xác nhận chẩn đoán." };
  }

  function recentKeys(days) {
    const keys = [];
    const now = new Date();
    for (let offset = days - 1; offset >= 0; offset -= 1) keys.push(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12)));
    return keys;
  }

  function dayTotals(day) {
    return {
      intake: sum(day?.meals || [], (item) => item.kcal),
      protein: sum(day?.meals || [], (item) => item.proteinG),
      activityKcal: sum(day?.activities || [], (item) => item.kcal),
      steps: sum(day?.activities || [], (item) => item.steps),
      activityMinutes: sum(day?.activities || [], (item) => item.minutes)
    };
  }

  function weeklySummary(state) {
    const keys = recentKeys(7);
    const days = keys.map((key) => ({ key, totals: dayTotals(state.days?.[key]), activities: state.days?.[key]?.activities || [] }));
    const workouts = (state.coach?.workoutHistory || []).filter((item) => Date.now() - new Date(item.completedAt).getTime() < 7 * DAY_MS);
    const activities = days.flatMap((item) => item.activities);
    const running = activities.filter((item) => item.type === "run" || item.type === "gym_treadmill");
    const sport = activities.filter((item) => item.type === "badminton");
    const strengthActivities = activities.filter((item) => item.type === "gym_session");
    const strength = workouts.length || strengthActivities.length;
    const workoutIds = new Set(workouts.map((item) => String(item.sessionId || "")));
    const standaloneActivities = activities.filter((item) => item.type !== "gym_session" || !item.sourceWorkoutSessionId || !workoutIds.has(String(item.sourceWorkoutSessionId)));
    const minutes = sum(standaloneActivities, (item) => item.minutes) + sum(workouts, (item) => item.minutes);
    const aerobicMinutes = sum(activities.filter((item) => !String(item.type).startsWith("gym_") || ["gym_bike", "gym_treadmill", "gym_stair"].includes(item.type)), (item) => item.minutes);
    const paceItems = running.filter((item) => finite(item.distanceKm) > 0 && finite(item.minutes) > 0);
    const pace = paceItems.length ? Math.min(...paceItems.map((item) => finite(item.minutes) / finite(item.distanceKm))) : null;
    return {
      sessions: workouts.length + activities.filter((item) => item.type !== "gym_session").length,
      strengthSessions: strength,
      runSessions: running.length,
      sportSessions: sport.length,
      minutes,
      aerobicMinutes,
      steps: sum(days, (item) => item.totals.steps),
      activityKcal: sum(days, (item) => item.totals.activityKcal),
      pace,
      runDistanceKm: sum(running, (item) => item.distanceKm),
      sportMinutes: sum(sport, (item) => item.minutes),
      workoutSets: sum(workouts, (item) => item.completedSets)
    };
  }

  function sleepSummary(state) {
    const logs = recentKeys(14).map((key) => state.coach?.recoveryByDate?.[key]).filter((item) => finite(item?.sleepHours) !== null);
    const last7 = recentKeys(7).map((key) => state.coach?.recoveryByDate?.[key]).filter((item) => finite(item?.sleepHours) !== null);
    return {
      count7: last7.length,
      count14: logs.length,
      average7: last7.length ? sum(last7, (item) => item.sleepHours) / last7.length : null,
      latest: state.coach?.recoveryByDate?.[dateKey()] || null
    };
  }

  function proteinRange(state) {
    const weight = finite(state.profile?.weightKg);
    if (!weight) return null;
    const conditions = `${state.profile?.knownConditions || ""} ${state.profile?.medications || ""}`;
    if (textHas(conditions, /\bthan\b|kidney|pregnan|mang thai|breastfeed|cho con bu/)) return { needsReview: true };
    const goal = state.coach?.settings?.goal || "recomp";
    const lowFactor = goal === "fat" ? 1.2 : 1.4;
    const highFactor = goal === "muscle" ? 1.8 : 1.7;
    return { low: Math.round(weight * lowFactor / 5) * 5, high: Math.round(weight * highFactor / 5) * 5, grade: "B" };
  }

  function statusLabel(state) {
    return ({ stable: "Ổn định", watch: "Theo dõi", actionable: "Cần hành động", medical: "Cần đánh giá y tế", unknown: "Chưa đủ dữ liệu" })[state] || "Chưa đủ dữ liệu";
  }

  function assess(state) {
    const profile = state.profile || {};
    const measurements = state.measurements || {};
    const bmiResult = bmiSignal(profile);
    const waistResult = waistSignal(profile, measurements);
    const bpResult = bloodPressureSignal(profile);
    const week = weeklySummary(state);
    const sleep = sleepSummary(state);
    const todayRecovery = sleep.latest;
    const metabolic = { state: "unknown", label: "Chưa đủ dữ liệu", note: "BMI và vòng eo không đủ để kết luận metabolic health." };
    const compositionState = waistResult.state !== "unknown" ? waistResult.state : bmiResult.state;
    const fitnessState = week.aerobicMinutes >= 150 && week.strengthSessions >= 2 ? "stable" : week.sessions > 0 ? "watch" : "unknown";
    let recoveryState = "unknown";
    if (todayRecovery) {
      if (todayRecovery.redFlag || todayRecovery.illness || todayRecovery.sharpPain) recoveryState = todayRecovery.redFlag ? "medical" : "actionable";
      else if (finite(todayRecovery.sleepHours) < 6 || finite(todayRecovery.energy) <= 2 || finite(todayRecovery.soreness) >= 7) recoveryState = "watch";
      else recoveryState = "stable";
    }

    const domains = {
      metabolic,
      composition: { state: compositionState, label: statusLabel(compositionState), note: waistResult.value !== null ? waistResult.detail : bmiResult.detail },
      fitness: { state: fitnessState, label: statusLabel(fitnessState), note: week.sessions ? `${Math.round(week.aerobicMinutes)} phút aerobic · ${week.strengthSessions} buổi tạ trong 7 ngày.` : "Chưa đủ một tuần log hoạt động." },
      recovery: { state: recoveryState, label: statusLabel(recoveryState), note: todayRecovery ? "Dựa trên check-in tự khai báo hôm nay." : "Chưa check-in hôm nay." }
    };

    let priority;
    if (!finite(profile.weightKg) || !finite(profile.heightCm)) {
      priority = { id: "profile", title: "Hoàn thiện hồ sơ", state: "unknown", fact: "Chưa có đủ cân nặng và chiều cao.", interpretation: "Rootbody chưa thể tính các screening cơ bản.", action: "Nhập hồ sơ", verify: "Kiểm tra lại các trường đã lưu.", grade: "—" };
    } else if (todayRecovery?.redFlag) {
      priority = { id: "red-flag", title: "Dừng buổi tập", state: "medical", fact: "Check-in có triệu chứng cảnh báo.", interpretation: "Hậu quả bỏ sót nguyên nhân y khoa có thể đáng kể.", action: "Không tập; tìm hỗ trợ y tế phù hợp.", verify: "Chỉ quay lại khi đã được đánh giá hoặc triệu chứng đã được xử lý.", grade: "A" };
    } else if (bpResult.state === "medical") {
      priority = { id: "blood-pressure", title: "Đo lại huyết áp", state: "medical", fact: `${Math.round(bpResult.systolic)}/${Math.round(bpResult.diastolic)} mmHg.`, interpretation: bpResult.detail, action: "Nghỉ yên, đo lại và liên hệ y tế nếu vẫn rất cao.", verify: "Ghi lần đo lặp lại và triệu chứng đi kèm.", grade: "A" };
    } else if (profile.smoking === "current") {
      priority = { id: "smoking", title: "Phơi nhiễm thuốc lá", state: "actionable", fact: "Hồ sơ ghi nhận đang hút thuốc.", interpretation: "Đây là yếu tố nguy cơ có leverage cao hơn supplement hoặc biohack.", action: "Chọn một bước cai thuốc có hỗ trợ chuyên môn.", verify: "Theo dõi số ngày không hút và lần tái sử dụng.", grade: "A" };
    } else if (["actionable", "watch"].includes(waistResult.state)) {
      priority = { id: "waist", title: "Vòng eo / chiều cao", state: waistResult.state, fact: `${waistResult.value.toFixed(2).replace(".", ",")} · ${waistResult.label.toLowerCase()}.`, interpretation: waistResult.detail, action: waistResult.state === "actionable" ? "Theo kế hoạch năng lượng và tập sức mạnh hiện tại." : "Đo lại vòng eo cùng quy trình.", verify: "Đo một lần mỗi tuần trong 4 tuần.", grade: "A" };
    } else if (sleep.average7 !== null && sleep.count7 >= 4 && sleep.average7 < 7) {
      priority = { id: "sleep", title: "Cơ hội ngủ", state: "watch", fact: `Trung bình ${sleep.average7.toFixed(1).replace(".", ",")} giờ qua ${sleep.count7} đêm đã ghi.`, interpretation: "Dữ liệu hiện có thấp hơn mốc 7 giờ cho người lớn.", action: "Bảo vệ thêm 30–60 phút cơ hội ngủ tối nay.", verify: "Theo dõi trung bình 7 ngày trong 2 tuần.", grade: "A" };
    } else if (week.strengthSessions < 2) {
      priority = { id: "strength", title: "Tập sức mạnh", state: week.sessions ? "watch" : "unknown", fact: `${week.strengthSessions} buổi tạ trong 7 ngày đã log.`, interpretation: "WHO khuyến nghị hoạt động tăng sức mạnh cho các nhóm cơ lớn ít nhất 2 ngày/tuần.", action: "Hoàn thành buổi tạ tiếp theo trong giáo án.", verify: "Đếm số buổi hoàn tất trong tuần.", grade: "A" };
    } else {
      priority = { id: "consistency", title: "Duy trì kế hoạch", state: "stable", fact: "Không có tín hiệu ưu tiên cao hơn trong dữ liệu hiện có.", interpretation: "Đây không phải kết luận rằng mọi domain đều tối ưu.", action: "Thực hiện hành động đã lên lịch hôm nay.", verify: "Đánh giá lại sau một tuần dữ liệu.", grade: "B" };
    }

    const protein = proteinRange(state);
    const today = dayTotals(state.days?.[dateKey()]);
    const plannedWorkout = state.coach?.activeWorkout?.name || (({ fat: "Buổi giữ cơ", recomp: "Buổi tăng cơ + giảm mỡ", muscle: "Buổi tăng cơ" })[state.coach?.settings?.goal] || "Buổi tập");
    const actions = [
      { icon: "nutrition", label: "Protein", value: protein?.needsReview ? "Cần cá nhân hóa y khoa" : protein ? `${protein.low}–${protein.high} g/ngày` : "Nhập cân nặng" },
      { icon: "strength", label: "Tập luyện", value: plannedWorkout },
      { icon: "steps", label: "Số bước", value: today.steps ? `${Math.round(today.steps).toLocaleString("vi-VN")} hôm nay` : "Chưa ghi hôm nay" },
      { icon: "cardio", label: "Aerobic", value: `${Math.round(week.aerobicMinutes)}/150 phút tuần này` }
    ];

    const contributors = [];
    if (["watch", "actionable"].includes(waistResult.state)) contributors.push("Vòng eo / chiều cao");
    if (week.strengthSessions < 2 && week.sessions) contributors.push("Tập tạ <2 buổi");
    if (week.aerobicMinutes < 150 && week.sessions) contributors.push("Aerobic <150 phút");
    if (sleep.average7 !== null && sleep.count7 >= 4 && sleep.average7 < 7) contributors.push("Ngủ <7 giờ");
    if (profile.smoking === "current") contributors.push("Hút thuốc");
    if (profile.alcohol && !["none", "unknown"].includes(profile.alcohol)) contributors.push("Rượu bia đã khai báo");

    return { bmi: bmiResult, waist: waistResult, bloodPressure: bpResult, domains, priority, actions, contributors, week, sleep, protein, today };
  }

  window.RootbodyHealth = Object.freeze({ assess, bmiSignal, waistSignal, bloodPressureSignal, weeklySummary, sleepSummary, proteinRange, dayTotals, statusLabel, dateKey, parseDate, clamp });
})();
