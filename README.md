# rootbody V8

rootbody là PWA health-intelligence local-first theo flow:

`Measure → Interpret → Prioritize → Intervene → Verify`

App không phụ thuộc Apple Health, backend hoặc tài khoản. Người dùng tự ghi hồ sơ, bữa ăn, cân nặng, vòng eo, vận động, workout và recovery; rootbody phân loại tín hiệu nhưng không biến dữ liệu thiếu thành sample có vẻ “thật”.

Live: [derekdaydoi.github.io/Rootbody](https://derekdaydoi.github.io/Rootbody/)

## V8 có gì

### 5 màn hình chính

- **Hôm nay:** kể mạch `vấn đề → dữ kiện → ý nghĩa → việc cần làm`, sau đó mới tới cân bằng năng lượng và gợi ý bữa ăn.
- **Phân tích:** BMI, waist-to-height ratio, huyết áp, xu hướng cân/bước/vòng eo/resting heart rate, thời lượng và độ liền mạch của giấc ngủ, bối cảnh gan do người dùng nhập và evidence grade.
- **Tập luyện:** summary tuần, recovery gate và thư viện bài tập gợi ý theo mục tiêu + tối đa hai nhóm cơ ưu tiên. App không ép người dùng vào một lịch chia buổi cố định.
- **Lab:** tĩnh tâm 10 phút, caffeine guardrail, ánh sáng ban ngày và Wim Hof có giải thích cơ chế + safety gate. Không có cold-water protocol.
- **Bạn:** hồ sơ, mục tiêu, dinh dưỡng/phục hồi và trạng thái local data.

Giao diện được cố định ở chế độ sáng để giữ trải nghiệm nhất quán trên web và PWA. Header hiển thị logo, wordmark `rootbody` và copyright nhất quán; title lặp lại trong từng tab được ẩn khỏi thị giác nhưng vẫn giữ cho accessibility. Typography dùng scale tối thiểu 11 px cho nhãn phụ và 16 px cho body để vẫn đọc được ở màn hình 320 px.

Profile Setup là detail flow, không phải tab thứ sáu.

### Health reasoning

- Không có sample metrics hoặc trạng thái “Good/Healthy” giả.
- Mỗi finding tách thành dữ kiện, suy luận, mức xử lý, hành động và cách đo lại.
- Thiếu phép đo được ghi `Chưa đủ dữ liệu`.
- BMI hỗ trợ `Asian action points` và `International`; công thức không thay đổi.
- Waist-to-height ratio cần phép đo lặp lại trước khi app gọi tín hiệu là có tính hành động.
- Một phép đo huyết áp không được trình bày như chẩn đoán.
- Lab markers chỉ hiển thị giá trị, đơn vị và khoảng tham chiếu người dùng nhập từ phiếu xét nghiệm; rootbody không tự tạo reference range.

### Energy và food

```text
deficit_kcal = baseline_kcal + activity_net_kcal - intake_kcal
kg_equivalent = -deficit_kcal / 7,700
```

`baseline_kcal = 1.600` và `target_deficit = 500` là **product assumption có thể chỉnh**, không phải BMR/TDEE đã đo hoặc tự suy ra. `kg eq.` là năng lượng quy đổi, không phải dự báo cân ngày mai.

Vận động dùng phần năng lượng ròng để tránh cộng lại 1 MET nghỉ đã có trong baseline:

```text
activity_net_kcal = floor_to_10((MET - 1) × 3.5 × weight_kg / 200 × minutes)
```

- Đi/chạy dùng bước, thời lượng và chiều cao để ước tính quãng đường/tốc độ.
- Cầu lông dùng thời lượng + mức độ.
- Cardio machine dùng thời lượng, speed/incline hoặc resistance/RPM khi có.
- Strength machine dùng thời lượng cả buổi + cường độ; không đổi set/reps trực tiếp thành calorie.
- Một workout hoàn tất chỉ tạo một activity, không cộng đôi phút hoặc calorie.
- Food catalog, tìm kiếm không dấu, portion/cooking modifier, confidence và low–high range.
- `Hôm nay ăn gì?` xếp hạng bữa theo calorie/protein còn lại.

### Training và recovery

- Ba mục tiêu: `Giảm mỡ`, `Giảm mỡ + tăng cơ`, `Tăng cơ toàn diện`.
- Người dùng chọn mục tiêu và tối đa hai nhóm cơ; rootbody sắp xếp danh sách bài phù hợp để người dùng tự chọn và tự tập.
- Prescription gợi ý gồm set, rep, RIR và rest; không biến list bài tập thành lịch bắt buộc.
- Ảnh kỹ thuật có người ở hai pha, dùng `object-fit: contain`; phần ảnh kết thúc trước Setup/Cues/Lỗi cần tránh.
- Recovery gate dùng sleep, self-rated energy, soreness, illness, sharp pain và red flags; không tạo “readiness score” giả chính xác.

### Experiments

- Meditation 10 phút với visual/breath anchor và self-report trước/sau.
- Wim Hof guided flow: 30 nhịp, retention đếm lên không đặt thành tích, recovery breath 15 giây, tối đa 3 round.
- Safety acknowledgement là điều kiện bắt đầu Wim Hof; không thực hiện trong/gần nước, dưới vòi sen, khi lái xe, đứng hoặc vận hành máy móc.
- Protocol log không cộng calorie, không tự sửa recovery và không thay thế điều trị.

## Architecture

```text
index.html              semantic PWA shell và 5-screen navigation
styles.css              V7 component foundation, giữ compatibility
v8.css                  V8 design system và responsive override
app.js                   local-only state, energy/food/activity engine
health-engine.js         pure health signals và prioritization
coach-data.js            exercise, plan và protocol catalog
coach.js                 training/recovery/workout/meditation/Wim Hof UI
intelligence.js          V8 screen composition, lab/trend/reasoning UI
food-data.js             food catalog, cooking rules, meal templates
sw.js                    offline app-shell cache
manifest.webmanifest     PWA metadata
brand/                   SVG logo system
exercise-form/           kỹ thuật bài tập có người
```

Không dùng framework hoặc build step; GitHub Pages phục vụ file tĩnh.

## Data local-only

State hiện tại nằm ở `localStorage["rootbody.device.v2"]`:

```text
profile
settings
days[date].meals[]
days[date].activities[]
weights[]
measurements.waist[]
measurements.restingHr[]
measurements.bloodPressure[]
labs
coach.settings
coach.recoveryByDate
coach.activeWorkout
coach.workoutHistory[]
coach.protocolLogs[]
```

Không migration dữ liệu cũ. Khi bản này chạy lần đầu, `rootbody.device.v1` và các key `rootbody.v1` đến `rootbody.v5` bị xóa, sau đó app khởi tạo state mới. Mọi lần người dùng bấm lưu hoặc hoàn tất một hành động, state mới được ghi trực tiếp vào `localStorage` của thiết bị.

## Privacy

- Dữ liệu nằm trong browser storage của thiết bị đang dùng.
- Không analytics, tài khoản hoặc API gửi health data về server rootbody.
- Xóa website data của trình duyệt sẽ xóa dữ liệu local.
- Cần export/sync mã hóa trước khi coi đây là nơi lưu hồ sơ dài hạn; V8 chưa có tính năng đó.

## Evidence boundaries

- WHO: người lớn nên đạt 150–300 phút aerobic mức vừa hoặc 75–150 phút mức mạnh mỗi tuần và strength cho nhóm cơ lớn ít nhất 2 ngày/tuần: [WHO 2020 Guidelines](https://www.who.int/publications/i/item/9789240015128).
- Waist-to-height ratio bands dùng NICE: 0,4–0,49 healthy central adiposity, 0,5–0,59 increased, từ 0,6 high: [NICE NG246](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity).
- Blood-pressure bands và crisis handling tham chiếu AHA; một reading đơn lẻ không xác nhận chẩn đoán: [American Heart Association](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings).
- Sleep target mặc định là ít nhất 7 giờ cho người lớn: [AASM/SRS consensus](https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf).
- Asian BMI values 23 và 27,5 được dùng như public-health action points, không phải công thức BMI khác: [WHO expert consultation](https://pubmed.ncbi.nlm.nih.gov/14726171/).

rootbody là công cụ self-tracking/decision support, không phải thiết bị y tế và không chẩn đoán.

## Chạy local

```bash
python -m http.server 8765
```

Mở `http://localhost:8765`.

## Deploy

Workflow `.github/workflows/pages.yml` deploy nhánh `main` lên GitHub Pages. Service Worker dùng cache riêng `rootbody-v8-architecture-v72`, ưu tiên mạng cho tài liệu điều hướng và giữ app shell để chạy offline.

V72 giữ hệ logo trực tiếp từ ảnh nguồn `body.png`, đưa logo + wordmark + copyright vào app header, cung cấp icon 180/192/512/1024 px và favicon. Startup motion theo chuỗi `ROOT → BODY → SIGNAL → IDENTITY` trong khoảng 1,9 giây; `prefers-reduced-motion` dùng lockup tĩnh trong 650–700 ms.

## Brand

Brand cố định dùng Root Green `#025B30`, Signal Lime `#7ED957`, Body White `#FFFFFF` và Evidence Ink `#102019`. Root Green chứa chữ luôn dùng Body White; Signal Lime chứa chữ luôn dùng Evidence Ink. Signal Lime chỉ mang nghĩa active/selected/change/intervention/progress, không thay cho kết luận “khỏe” hoặc “an toàn”. Chi tiết đầy đủ nằm trong `BRAND_SPEC.md`.

© Copyright from derekdaydoi

