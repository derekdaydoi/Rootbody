(() => {
  "use strict";

  const equipment = {
    multi_press: {
      name: "Máy multi-press",
      image: "./equipment/multi-press.svg",
      verification: "Đã đối chiếu từ ảnh phòng gym",
      setup: ["Chỉnh ghế để tay cầm ngang giữa ngực hoặc ngang vai theo bài.", "Ép lưng và bàn chân ổn định; cổ tay thẳng."],
      cues: ["Hạ có kiểm soát 2–3 giây.", "Đẩy theo quỹ đạo máy, dừng trước khi khóa cứng khuỷu."],
      errors: ["Ghế quá thấp làm vai nhô lên.", "Nảy tạ hoặc rút ngắn biên độ để tăng mức tạ."]
    },
    dumbbell: {
      name: "Tạ đơn",
      image: "./equipment/dumbbell.svg",
      verification: "Thiết bị người dùng xác nhận",
      setup: ["Chọn mức tạ cho phép giữ đúng biên độ.", "Dọn khoảng trống và đặt tạ xuống có kiểm soát."],
      cues: ["Giữ thân người chắc, thở ra khi nâng.", "Dừng set khi form bắt đầu hỏng dù chưa hết reps."],
      errors: ["Dùng quán tính để vung tạ.", "Chọn tạ theo sĩ diện thay vì RIR mục tiêu."]
    },
    stair: {
      name: "Máy leo cầu thang",
      image: "./equipment/stair-climber.svg",
      verification: "Đã đối chiếu từ ảnh phòng gym",
      setup: ["Bắt đầu level thấp trong 2–3 phút.", "Đặt trọn phần trước bàn chân lên bậc; dùng tay vịn để cân bằng, không treo người."],
      cues: ["Giữ thân cao và nhịp đều.", "Mức steady: vẫn nói được câu ngắn."],
      errors: ["Tì toàn bộ trọng lượng lên tay vịn.", "Tăng level trước khi kiểm soát được nhịp chân."]
    },
    bike: {
      name: "Xe đạp tại chỗ",
      image: "./equipment/bike.svg",
      verification: "Đã đối chiếu từ ảnh phòng gym",
      setup: ["Chỉnh yên để gối còn hơi chùng ở điểm thấp nhất.", "Khởi động 3 phút với lực cản nhẹ."],
      cues: ["Giữ cadence mượt, không lắc hông.", "Tăng lực cản từng nấc nhỏ."],
      errors: ["Yên quá thấp làm gối gập sâu.", "Dùng level máy như một đơn vị tuyệt đối giữa các hãng."]
    },
    treadmill: {
      name: "Máy chạy bộ",
      image: "./equipment/treadmill.svg",
      verification: "Thiết bị người dùng xác nhận",
      setup: ["Gắn safety clip và bắt đầu ở tốc độ đi bộ.", "Tăng dốc hoặc tốc độ từng bước nhỏ."],
      cues: ["Nhìn thẳng, bước tự nhiên dưới trọng tâm.", "Đi bộ dốc không cần bám tay vịn nếu vẫn kiểm soát được."],
      errors: ["Nhảy lên băng đang chạy nhanh.", "Bám tay vịn rồi dùng thông số máy để ước tính calorie."]
    },
    hip_machine: {
      name: "Máy khép / mở đùi",
      image: "./equipment/hip-machine.svg",
      verification: "Cần kiểm tra nhãn chế độ trên máy trước khi tập",
      setup: ["Chọn đúng chế độ khép hoặc mở và khóa chốt ghế.", "Đặt lưng sát tựa, gối thẳng hàng với trục đệm."],
      cues: ["Di chuyển chậm, không bật đệm.", "Giữ 1 giây ở cuối biên độ kiểm soát được."],
      errors: ["Nhầm chế độ máy hoặc để chốt chưa khóa.", "Ép biên độ vượt mức thoải mái của hông."]
    },
    pullup: {
      name: "Khu xà",
      image: "./equipment/pullup.svg",
      verification: "Thiết bị người dùng xác nhận",
      setup: ["Kiểm tra xà khô, chắc và khoảng trống bên dưới.", "Người mới dùng chân hỗ trợ để đạt đủ biên độ."],
      cues: ["Bắt đầu bằng hạ vai khỏi tai.", "Kéo ngực về phía xà, không đá chân lấy đà."],
      errors: ["Thả rơi ở pha hạ.", "Cố kéo khi đau nhói vai hoặc khuỷu."]
    },
    bench: {
      name: "Ghế + tạ nâng ngực",
      image: "./equipment/bench.svg",
      verification: "Thiết bị người dùng xác nhận",
      setup: ["Kiểm tra ghế ổn định; đặt chân chắc trên sàn.", "Với tạ đơn, đưa tạ lên bằng đùi rồi nằm xuống có kiểm soát."],
      cues: ["Kéo bả vai nhẹ về sau và xuống.", "Hạ khuỷu khoảng 30–60° so với thân."],
      errors: ["Thả tạ sang hai bên khi chưa ngồi dậy an toàn.", "Đẩy qua đau vai để hoàn thành reps."]
    },
    core: {
      name: "Khu tập bụng / thảm",
      image: "./equipment/core.svg",
      verification: "Khu vực người dùng xác nhận",
      setup: ["Chọn mặt phẳng không trơn và đủ khoảng trống.", "Giữ cột sống ở vị trí kiểm soát được."],
      cues: ["Thở ra dài khi siết bụng.", "Ưu tiên chất lượng từng rep hoặc từng giây."],
      errors: ["Nín thở kéo dài.", "Kéo cổ hoặc võng lưng để kéo dài thời gian."]
    }
  };

  const exercises = {
    goblet_squat: { name: "Goblet squat", image: "./exercise-art/goblet-squat.webp", equipment: "dumbbell", role: "compound", kind: "strength", cue: "Gối theo hướng mũi chân; ngồi xuống trong biên độ giữ được lưng trung lập." },
    db_rdl: { name: "Dumbbell Romanian deadlift", image: "./exercise-art/db-rdl.webp", equipment: "dumbbell", role: "compound", kind: "strength", cue: "Đẩy hông ra sau; tạ đi sát đùi; dừng trước khi lưng mất trung lập." },
    split_squat: { name: "Split squat", image: "./exercise-art/split-squat.webp", equipment: "dumbbell", role: "compound", kind: "strength", cue: "Hai chân như hai đường ray; hạ thẳng trọng tâm, chân trước chịu lực chính." },
    chest_press: { name: "Machine chest press", image: "./exercise-art/chest-press.webp", equipment: "multi_press", role: "compound", kind: "strength", cue: "Tay cầm ngang giữa ngực; bả vai ổn định trên tựa ghế." },
    incline_press: { name: "Machine incline press", image: "./exercise-art/incline-press.webp", equipment: "multi_press", role: "compound", kind: "strength", cue: "Tay cầm ngang ngực trên; không nhún vai khi đẩy." },
    shoulder_press: { name: "Machine shoulder press", image: "./exercise-art/shoulder-press.webp", equipment: "multi_press", role: "compound", kind: "strength", cue: "Tay cầm bắt đầu gần ngang tai; siết thân, không ưỡn lưng để đẩy." },
    db_bench: { name: "Dumbbell bench press", image: "./exercise-art/db-bench.webp", equipment: "bench", role: "compound", kind: "strength", cue: "Bả vai ổn định; hạ tạ cân đối rồi đẩy lên trên ngực." },
    db_row: { name: "One-arm dumbbell row", image: "./exercise-art/db-row.webp", equipment: "bench", role: "compound", kind: "strength", cue: "Giữ hông và vai tương đối vuông; kéo khuỷu về hông." },
    assisted_pullup: { name: "Pull-up hỗ trợ bằng chân", image: "./exercise-art/assisted-pullup.webp", equipment: "pullup", role: "compound", kind: "strength", cue: "Dùng chân vừa đủ để giữ biên độ đầy đủ; không đá người." },
    hip_abduction: { name: "Mở đùi", image: "./exercise-art/hip-abduction.webp", equipment: "hip_machine", role: "accessory", kind: "strength", cue: "Mở gối có kiểm soát, giữ thân tựa ghế." },
    hip_adduction: { name: "Khép đùi", image: "./exercise-art/hip-adduction.webp", equipment: "hip_machine", role: "accessory", kind: "strength", cue: "Khép từ hông, không bật hai đệm vào nhau." },
    lateral_raise: { name: "Dumbbell lateral raise", image: "./exercise-art/lateral-raise.webp", equipment: "dumbbell", role: "accessory", kind: "strength", cue: "Nâng theo mặt phẳng hơi chếch trước thân; dừng trước khi nhún vai." },
    db_curl: { name: "Dumbbell curl", image: "./exercise-art/db-curl.webp", equipment: "dumbbell", role: "accessory", kind: "strength", cue: "Giữ khuỷu gần thân; không đẩy hông để vung tạ." },
    dead_bug: { name: "Dead bug", image: "./exercise-art/dead-bug.webp", equipment: "core", role: "core", kind: "strength", cue: "Ép lưng dưới nhẹ xuống thảm; duỗi chéo tay chân mà không võng lưng." },
    plank: { name: "Plank", image: "./exercise-art/plank.webp", equipment: "core", role: "core", kind: "timed", cue: "Siết mông và bụng; dừng khi lưng bắt đầu võng." },
    reverse_crunch: { name: "Reverse crunch", image: "./exercise-art/reverse-crunch.webp", equipment: "core", role: "core", kind: "strength", cue: "Cuộn xương chậu khỏi ghế/thảm; không dùng đà chân." },
    bike_steady: { name: "Đạp xe steady", image: "./exercise-art/bike-steady.webp", equipment: "bike", role: "conditioning", kind: "cardio", cue: "RPE 4–6/10; nhịp thở tăng nhưng vẫn nói được câu ngắn." },
    stair_steady: { name: "Leo cầu thang steady", image: "./exercise-art/stair-steady.webp", equipment: "stair", role: "conditioning", kind: "cardio", cue: "RPE 4–6/10; thân cao, không treo người lên tay vịn." },
    incline_walk: { name: "Đi bộ dốc", image: "./exercise-art/incline-walk.webp", equipment: "treadmill", role: "conditioning", kind: "cardio", cue: "RPE 4–6/10; tăng dốc trước khi tăng tốc nếu vẫn đi bộ." }
  };

  const sessions = {
    full_a: { name: "Full body A", exerciseIds: ["goblet_squat", "chest_press", "db_row", "hip_abduction", "dead_bug"] },
    full_b: { name: "Full body B", exerciseIds: ["db_rdl", "shoulder_press", "assisted_pullup", "hip_adduction", "plank"] },
    full_c: { name: "Full body C", exerciseIds: ["split_squat", "incline_press", "db_row", "lateral_raise", "reverse_crunch"] },
    upper_a: { name: "Upper A", exerciseIds: ["chest_press", "db_row", "shoulder_press", "assisted_pullup", "db_curl"] },
    lower_a: { name: "Lower A", exerciseIds: ["goblet_squat", "db_rdl", "hip_abduction", "hip_adduction", "dead_bug"] },
    upper_b: { name: "Upper B", exerciseIds: ["incline_press", "db_row", "assisted_pullup", "lateral_raise", "db_curl"] },
    lower_b: { name: "Lower B", exerciseIds: ["split_squat", "db_rdl", "hip_abduction", "hip_adduction", "plank"] },
    cardio_core: { name: "Cardio + core", exerciseIds: ["bike_steady", "dead_bug", "plank", "reverse_crunch"] }
  };

  const schedules = {
    fat: { 2: ["full_a", "full_b"], 3: ["full_a", "full_b", "full_c"], 4: ["upper_a", "lower_a", "upper_b", "lower_b"] },
    muscle: { 2: ["full_a", "full_b"], 3: ["full_a", "full_b", "full_c"], 4: ["upper_a", "lower_a", "upper_b", "lower_b"] },
    recomp: { 2: ["full_a", "full_b"], 3: ["full_a", "full_b", "full_c"], 4: ["upper_a", "lower_a", "upper_b", "lower_b"] }
  };

  const goals = {
    fat: { name: "Giảm mỡ + giữ cơ", blurb: "Full-body, nghỉ vừa và cardio steady; deficit vẫn đến chủ yếu từ lượng ăn.", compound: { sets: 3, reps: "8–15", rir: 3, rest: 75 }, accessory: { sets: 2, reps: "12–20", rir: 3, rest: 45 }, core: { sets: 2, reps: "8–15", rir: 3, rest: 45 }, cardio: { sets: 1, reps: "15–25 phút", rir: 5, rest: 0 }, met: 4.5 },
    muscle: { name: "Tăng cơ", blurb: "Nhiều straight sets hơn, nghỉ dài hơn và dùng double progression.", compound: { sets: 3, reps: "6–12", rir: 2, rest: 120 }, accessory: { sets: 2, reps: "10–20", rir: 2, rest: 75 }, core: { sets: 2, reps: "8–15", rir: 2, rest: 60 }, cardio: { sets: 1, reps: "10–15 phút", rir: 6, rest: 0 }, met: 3.5 },
    recomp: { name: "Giảm mỡ + tăng cơ", blurb: "Ưu tiên compound, volume vừa và cardio đủ để duy trì hiệu suất.", compound: { sets: 3, reps: "8–12", rir: 2, rest: 105 }, accessory: { sets: 2, reps: "12–15", rir: 2, rest: 60 }, core: { sets: 2, reps: "8–15", rir: 3, rest: 45 }, cardio: { sets: 1, reps: "15–20 phút", rir: 5, rest: 0 }, met: 4.0 }
  };

  const protocols = [
    { id: "sleep_anchor", title: "Neo giấc ngủ", grade: "A", tag: "Nền tảng", dose: "Cơ hội ngủ ≥7 giờ · giờ thức ổn định", summary: "Theo dõi thời lượng và chất lượng chủ quan; không giả vờ đo sleep stages.", steps: ["Chọn một giờ thức có thể giữ hầu hết các ngày.", "Lùi giờ đi ngủ để dành ít nhất 7 giờ cho giấc ngủ.", "Sáng hôm sau ghi thời lượng và cảm nhận, không tự chẩn đoán."], safety: "Mất ngủ kéo dài, buồn ngủ nguy hiểm hoặc ngáy/ngưng thở cần đánh giá chuyên môn.", sourceLabel: "AASM adult sleep duration consensus", source: "https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf" },
    { id: "caffeine_guardrail", title: "Giới hạn caffeine", grade: "B", tag: "Thực dụng", dose: "Mặc định dừng 8 giờ trước giờ ngủ", summary: "Một guardrail có thể chỉnh theo phản ứng cá nhân, không phải luật tuyệt đối.", steps: ["Chọn giờ ngủ dự kiến.", "Đặt giờ caffeine cuối ngày sớm hơn 8 giờ.", "Nếu vẫn khó ngủ, thử kéo sớm hơn và theo dõi 7 ngày."], safety: "Không dùng protocol này để tự điều trị rối loạn giấc ngủ.", sourceLabel: "NHLBI healthy sleep habits", source: "https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits" },
    { id: "daylight", title: "Ánh sáng ban ngày", grade: "B", tag: "Circadian", dose: "Ra ngoài sớm · giảm ánh sáng mạnh buổi tối", summary: "Ánh sáng và bóng tối là tín hiệu quan trọng cho circadian rhythm.", steps: ["Ra ngoài trời sau khi thức dậy khi điều kiện cho phép.", "Không nhìn trực tiếp vào mặt trời.", "Giảm ánh sáng mạnh gần giờ ngủ."], safety: "Bảo vệ mắt và da theo điều kiện thực tế; đây không phải phototherapy.", sourceLabel: "NIH/NIGMS circadian rhythms", source: "https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms" },
    { id: "wall_focus_10", category: "meditation", title: "Tĩnh tâm 10 phút", grade: "B", tag: "Focus reset", dose: "10 phút · 1 lần/ngày hoặc trước deep work", timerSeconds: 600, summary: "Giữ attention trên một điểm ít kích thích hoặc cảm giác thở. Bức tường chỉ là visual anchor; không có bằng chứng rằng bản thân việc nhìn tường tạo năng lượng.", steps: ["Ngồi vững, để điện thoại im lặng. Chọn một điểm trống trên tường cách khoảng 1–2 m; nhìn mềm, không gồng mắt.", "Trong 1 phút đầu, thả lỏng hàm và vai, thở tự nhiên.", "Trong 8 phút, giữ attention ở điểm nhìn hoặc cảm giác thở. Khi nhận ra tâm trí đi xa, ghi nhận ngắn là “đang nghĩ” rồi quay lại, không tự chấm điểm.", "Trong phút cuối, mở rộng tầm nhìn, ghi trạng thái sau buổi và chọn một việc cụ thể sẽ làm tiếp."], safety: "Dừng nếu lo âu tăng, choáng, khó chịu hoặc cảm giác tách rời. Nhìn quanh phòng, cử động tay chân và trở lại hoạt động bình thường. Đây không phải điều trị y khoa.", sourceLabel: "10-minute mindfulness randomized trial", source: "https://pubmed.ncbi.nlm.nih.gov/30127731/" },
    { id: "slow_breathing", title: "Thở chậm", grade: "B", tag: "5 phút", dose: "Hít 4 giây · thở 6 giây · 5 phút", summary: "Protocol thư giãn ngắn, không giữ hơi và không dùng để thay điều trị.", steps: ["Ngồi hoặc nằm thoải mái.", "Hít nhẹ 4 giây, thở ra 6 giây trong 5 phút.", "Dừng nếu thấy khó chịu hoặc choáng."], safety: "Không ép nhịp thở; trở lại thở bình thường nếu khó chịu.", sourceLabel: "Randomized trial of brief breath practices", source: "https://pubmed.ncbi.nlm.nih.gov/36630953/" },
    { id: "wim_hof", guidedMode: "wim_hof", title: "Wim Hof breathing", grade: "C", tag: "Experimental", dose: "30 nhịp · retention theo cảm giác · recovery 15 giây · tối đa 3 rounds", summary: "Guided circle theo flow thông thường. Retention đếm lên để quan sát, không có target, kỷ lục hay claim giảm mỡ/tăng miễn dịch.", steps: ["Chỉ ngồi hoặc nằm ở nơi an toàn. Hít sâu, sau đó thả hơi ra không ép theo vòng tròn trong 30 nhịp.", "Sau nhịp cuối, thả hơi ra rồi giữ đến khi cơ thể tự đòi thở. Bấm “Tôi cần thở” ngay khi xuất hiện nhu cầu.", "Hít sâu một lần, giữ recovery breath 15 giây rồi thả lỏng.", "Lặp tối đa 3 rounds; thời gian retention dài hơn không phải mục tiêu."], safety: "Có thể gây choáng hoặc mất ý thức. Không bao giờ tập trong/gần nước, dưới vòi sen, khi lái xe, đứng, hoặc vận hành máy móc. Không thực hiện nếu mang thai, epilepsy hoặc có bệnh tim mạch nghiêm trọng nếu chưa được bác sĩ cho phép.", sourceLabel: "Official Wim Hof breathing technique", source: "https://www.wimhofmethod.com/breathing-exercises", requiresSafetyAck: true },
    { id: "cold_finish", title: "Kết thúc tắm bằng nước mát", grade: "C", tag: "Optional", dose: "15–30 giây · tối đa 2 phút", summary: "Opt-in để thử khả năng chịu lạnh; không ghi calorie và không claim đốt mỡ.", steps: ["Tắm bình thường trước, sau đó chuyển sang mức mát chịu được 15–30 giây.", "Thở bình thường; không kết hợp Wim Hof breathing.", "Chỉ tăng 15 giây khi hoàn toàn kiểm soát, tối đa 2 phút."], safety: "Dừng nếu đau ngực, khó thở bất thường, choáng hoặc mất kiểm soát. Tránh nếu có cold urticaria, Raynaud type II hoặc bệnh tim mạch nghiêm trọng. MVP không hướng dẫn ice bath/open-water immersion.", sourceLabel: "Cold-water immersion systematic review", source: "https://pubmed.ncbi.nlm.nih.gov/39879231/", requiresSafetyAck: true }
  ];

  window.ROOTBODY_COACH_DATA = Object.freeze({
    equipment,
    exercises,
    sessions,
    schedules,
    goals,
    protocols,
    evidence: {
      A: "Guideline hoặc position stand áp dụng trực tiếp",
      B: "Controlled human evidence / official best practice còn giới hạn",
      C: "Bằng chứng nhỏ, ngắn hạn hoặc mechanistic"
    },
    progression: "Khi mọi set chạm đầu trên rep range với RIR ≥2 trong hai buổi liên tiếp, tăng một nấc tạ nhỏ nhất. Nếu hụt đầu dưới hoặc form hỏng trong hai buổi, giảm 5–10%."
  });
})();
