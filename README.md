# Rootbody V4

Rootbody là PWA local-first để ước tính calorie deficit, gợi ý bữa ăn theo ngân sách còn lại, theo dõi xu hướng cân nặng và hướng dẫn tập gym theo mục tiêu. V4 ưu tiên model giải thích được, sai số nhìn thấy được và dữ liệu có thể dùng ngay; app không phụ thuộc Apple Health, backend hay tài khoản.

V4 thêm `Food Engine` vào hệ thống Body OS hiện có. Ảnh phòng gym gốc không được publish vì có người/phản chiếu; app dùng 19 minh họa riêng theo từng bài tập, không có nhân vật mẫu.

## V4 có gì

- Hồ sơ cá nhân: cân nặng, chiều cao, BMI và lựa chọn `Asian action points` / `International`.
- Ghi vận động thủ công:
  - Đi bộ: số bước + số phút.
  - Chạy: số bước + số phút.
  - Cầu lông: số phút + trình độ từ Yếu đến Giỏi.
  - Gym thủ công: xe đạp, máy leo cầu thang, máy chạy có độ dốc, multi-press, tạ đơn, nằm nâng ngực, máy khép đùi và máy mở đùi.
- Gym Coach theo ba mục tiêu: `Giảm mỡ + giữ cơ`, `Tăng cơ`, `Giảm mỡ + tăng cơ`.
- Giáo án 2/3/4 buổi mỗi tuần, 30/45/60 phút, có sets, reps, RIR, rest và double progression; lịch 4 buổi dùng Upper/Lower A/B.
- Workout mode lưu sau mỗi set, resume sau reload và chỉ tạo **một** activity calorie khi hoàn tất.
- Hướng dẫn nhận diện/setup/cues/lỗi cho 9 nhóm thiết bị; mỗi bài có WebP riêng thể hiện điểm bắt đầu, kết thúc và hướng chuyển động.
- Recovery gate theo ngủ, năng lượng, đau mỏi, illness và red flags; trạng thái xấu sẽ giảm volume hoặc chặn buổi tập.
- Evidence-first Lab cho sleep anchor, caffeine, ánh sáng, thở chậm, Wim Hof breathing và cold finish.
- Food Engine gồm 57 món/nguyên liệu Việt Nam, tìm kiếm không dấu, khẩu phần 1/2–3 phần và modifier luộc/xào/chiên.
- Mỗi ước tính đồ ăn lưu calorie, protein, khoảng thấp–cao và confidence; calorie ghi vào deficit được làm tròn lên có chủ đích.
- `Hôm nay ăn gì?` xếp hạng 12 bữa mẫu theo calorie và protein còn lại, cập nhật ngay sau mỗi lần ghi món.
- 12 món thường ăn vẫn thêm bằng một chạm; món ngoài catalog vẫn có fallback nhập tay.
- Dashboard hiển thị calorie và `kg eq.` — kg tương đương năng lượng.
- Chart cân nặng tối đa 20 lần ghi gần nhất và chart số bước 14 ngày.
- Migration không phá dữ liệu từ `rootbody.v1` / `rootbody.v2` / `rootbody.v3` sang `rootbody.v4`; các key cũ vẫn được giữ làm rollback.
- Cài lên iPhone Home Screen và hoạt động offline sau lần tải đầu.

## Model năng lượng

### Cân bằng ngày

```text
deficit_kcal = baseline_kcal + activity_net_kcal - intake_kcal
predicted_weight_change_kg = -deficit_kcal / 7,700
```

`baseline_kcal` mặc định là 1.600 kcal/ngày và mục tiêu deficit mặc định là 500 kcal/ngày theo product assumption hiện tại, không phải BMR được cá nhân hóa. V4 chưa hỏi tuổi/giới tính nên không tự suy ra BMR.

`kg eq.` không phải dự báo số cân ngày mai. Nó chỉ là năng lượng quy đổi; nước, glycogen, muối, tiêu hóa và sai số khẩu phần khiến cân thực tế lệch đáng kể. Chart cân thật được dùng để đánh giá xu hướng.

### Vận động

```text
activity_net_kcal = floor_to_10((MET - 1) × 3.5 × weight_kg / 200 × minutes)
```

Trừ `1 MET` để tránh cộng lại phần năng lượng nghỉ đã nằm trong baseline. Kết quả vận động làm tròn xuống 10 kcal.

Đi bộ/chạy dùng chiều cao để ước tính độ dài bước, suy ra quãng đường và tốc độ:

```text
walking_step_length_m = height_m × 0.415
running_step_length_m = height_m × 0.65
distance_km = steps × step_length_m / 1,000
speed_kmh = distance_km / hours
```

MET được chọn theo band tốc độ của [2024 Adult Compendium — Walking](https://pacompendium.com/walking/) và [Running](https://pacompendium.com/running/). Cầu lông neo theo 5.5 MET (social), 7.0 MET (competitive) và 9.0 MET (match play) trong [Sports Compendium](https://pacompendium.com/sports/); các mức xen giữa là product heuristic bảo thủ.

### Gym

- Xe đạp dùng thời lượng, level lực cản 1–30 và RPM. Vì level không chuẩn hóa giữa hãng máy, model nội suy bảo thủ trong dải 3,5–9,0 MET của [2024 Adult Compendium — Bicycling](https://pacompendium.com/bicycling/), rồi giới hạn tối đa 10,5 MET khi cadence cao.
- Máy chạy dùng tốc độ và độ dốc theo phương trình metabolic walking/running của ACSM. Độ dốc được giới hạn 0–20%; tốc độ 1–25 km/h.
- Máy tập sức mạnh dùng tổng thời gian đã gồm cả lúc nghỉ và ba mức cường độ. Dải 2,5–6,0 MET được neo theo resistance training 3,5–6,0 MET trong [2024 Adult Compendium — Conditioning Exercise](https://pacompendium.com/conditioning-exercise/).
- Tất cả kết quả tiếp tục trừ 1 MET nghỉ và làm tròn xuống 10 kcal. Sai số lớn nhất nằm ở level xe không có watt và thời gian nghỉ giữa hiệp.
- Workout theo giáo án dùng một MET bình quân bảo thủ cho toàn buổi (`3,5–4,5` tùy mục tiêu), rồi chỉ ghi một activity. Sets/reps không được đổi thành calorie riêng.

## Gym Coach và recovery

- Mọi nhóm cơ chính được phân bổ qua full-body hoặc upper/lower; mục tiêu là chạm mỗi nhóm ít nhất hai lần/tuần khi lịch cho phép.
- `RIR` là số reps người dùng ước tính còn làm được với form tốt. Buổi đầu không đoán tạ từ cân nặng cơ thể; chọn tải kết thúc đúng RIR mục tiêu.
- Double progression: khi mọi set chạm đầu trên rep range với `RIR ≥ 2` trong hai buổi liên tiếp, tăng một nấc tạ nhỏ nhất; hụt đầu dưới hoặc form hỏng hai buổi thì giảm 5–10%.
- Nếu ngủ dưới 6 giờ, năng lượng ≤2/5 hoặc đau mỏi ≥7/10, app giảm một set mỗi bài, dùng RIR 3 và bỏ conditioning finisher.
- Đau/tức ngực, khó thở bất thường, choáng/sắp ngất, illness hoặc đau nhói/tăng dần sẽ chặn buổi cường độ cao. Rootbody không chẩn đoán tình trạng này.

Khung resistance training dựa trên [ACSM 2026 resistance training guidelines](https://acsm.org/resistance-training-guidelines-update-2026/) và phạm vi vận động tuần dựa trên [WHO physical activity guideline](https://www.who.int/publications/i/item/9789240015128).

## Evidence-first Lab

Evidence grade là phân loại nội bộ của Rootbody:

- `A`: guideline hoặc position stand áp dụng trực tiếp.
- `B`: controlled human evidence hoặc official best practice còn giới hạn.
- `C`: bằng chứng nhỏ/ngắn hạn/mechanistic; hiển thị là experimental khi phù hợp.

Biohack log không cộng calorie và không tự thay đổi recovery. Wim Hof breathing yêu cầu safety acknowledgement: chỉ ngồi/nằm, không bao giờ ở trong/gần nước, dưới vòi sen, khi lái xe, đứng hoặc vận hành máy móc; không có leaderboard nín thở hay claim giảm mỡ/tăng miễn dịch. Cold exposure trong MVP chỉ là kết thúc tắm bằng nước mát tối đa 2 phút, không hướng dẫn ice bath/open-water immersion.

### BMI

```text
BMI = weight_kg / height_m²
```

Công thức không đổi giữa hai lựa chọn. `International` dùng mốc 25/30. `Asian action points` dùng mốc 23/27.5 để cảnh báo nguy cơ; đây là action points, không phải một định nghĩa BMI mới cho mọi người châu Á. Tham chiếu: [WHO expert consultation](https://pubmed.ncbi.nlm.nih.gov/14726171/).

BMI chỉ là screening, không phải chẩn đoán sức khỏe.

## Quy tắc ước tính

- Món đơn giản có confidence cao; món hoàn chỉnh/ăn ngoài có khoảng sai số rộng hơn.
- Food Estimator cộng modifier dầu theo cách nấu và dùng một phần của biên trên để tạo calorie ghi nhận bảo thủ.
- Món thường ăn giữ product shortcut; ví dụ cà phê sữa một ly được cố định 100 kcal.
- Protein target là product heuristic `1,6 g/kg`, giới hạn 80–180 g/ngày; khi chưa có cân nặng dùng 100 g.
- Gợi ý bữa ăn không phải medical nutrition therapy và không tự chẩn đoán dị ứng/bệnh lý.
- Vận động: tính phần ròng và làm tròn xuống.
- Ngày chưa ghi món ăn không tạo dự báo kg, vì coi lượng ăn là 0 sẽ tạo thâm hụt giả.
- Mọi sample đều có khẩu phần cố định; bấm nhiều lần tương ứng nhiều khẩu phần.

## Privacy

- Toàn bộ hồ sơ, món ăn, vận động, cân nặng, recovery, workout và protocol log nằm trong `localStorage` của trình duyệt.
- Không gửi dữ liệu tới server, không analytics, không tài khoản.
- Xóa dữ liệu website trong Safari/Chrome sẽ xóa dữ liệu Rootbody trên máy đó.
- GitHub Pages chỉ phục vụ các file tĩnh của ứng dụng.

## Chạy local

Mở bằng một static server bất kỳ, ví dụ:

```bash
python -m http.server 8765
```

Sau đó truy cập `http://localhost:8765`.

## Deploy GitHub Pages

Workflow `.github/workflows/pages.yml` deploy nhánh `main`. Trong repository, chọn `Settings → Pages → Source: GitHub Actions` một lần; các commit sau sẽ tự deploy.

## Cấu trúc

```text
Rootbody/
├── brand/                   # SVG logo, symbol, wordmark
├── equipment/               # SVG minh họa máy, không chứa ảnh người dùng
├── exercise-art/             # 19 WebP minh họa từng bài, không có người mẫu
├── .github/workflows/       # GitHub Pages deployment
├── index.html               # PWA shell
├── styles.css               # Root family design system
├── food-data.js              # catalog thực phẩm, cách nấu và bữa gợi ý
├── coach-data.js            # catalog máy, bài tập, giáo án và evidence
├── coach.js                 # Coach UI, recovery, workout và Lab
├── app.js                   # energy model, storage, charts và bridge
├── sw.js                    # offline cache
└── manifest.webmanifest     # install metadata
```

