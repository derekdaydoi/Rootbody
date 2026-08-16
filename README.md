# Rootbody V2

Rootbody là PWA local-first để ước tính calorie deficit và theo dõi xu hướng cân nặng. V2 ưu tiên model có thể giải thích, nhập tay nhanh và chạy độc lập trên GitHub Pages; không phụ thuộc Apple Health, backend hay tài khoản.

V2.1 dùng natural document scroll giống Rootflow/Rootwork, bottom navigation dạng floating và bottom sheet có header đóng cố định. Text dài được xuống dòng thay vì cắt mất nội dung.

## V2 có gì

- Hồ sơ cá nhân: cân nặng, chiều cao, BMI và lựa chọn `Asian action points` / `International`.
- Ghi vận động thủ công:
  - Đi bộ: số bước + số phút.
  - Chạy: số bước + số phút.
  - Cầu lông: số phút + trình độ từ Yếu đến Giỏi.
- 12 món/khẩu phần mẫu thêm bằng một chạm, calorie được làm tròn lên có chủ đích.
- Dashboard hiển thị calorie và `kg eq.` — kg tương đương năng lượng.
- Chart cân nặng tối đa 20 lần ghi gần nhất và chart số bước 14 ngày.
- Migration không phá dữ liệu từ localStorage `rootbody.v1` sang `rootbody.v2`.
- Cài lên iPhone Home Screen và hoạt động offline sau lần tải đầu.

## Model năng lượng

### Cân bằng ngày

```text
deficit_kcal = baseline_kcal + activity_net_kcal - intake_kcal
predicted_weight_change_kg = -deficit_kcal / 7,700
```

`baseline_kcal` mặc định là 1.600 kcal/ngày theo product assumption hiện tại, không phải BMR được cá nhân hóa. V2 chưa hỏi tuổi/giới tính nên không tự suy ra BMR.

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

### BMI

```text
BMI = weight_kg / height_m²
```

Công thức không đổi giữa hai lựa chọn. `International` dùng mốc 25/30. `Asian action points` dùng mốc 23/27.5 để cảnh báo nguy cơ; đây là action points, không phải một định nghĩa BMI mới cho mọi người châu Á. Tham chiếu: [WHO expert consultation](https://pubmed.ncbi.nlm.nih.gov/14726171/).

BMI chỉ là screening, không phải chẩn đoán sức khỏe.

## Quy tắc ước tính

- Đồ ăn: làm tròn lên; ví dụ cà phê sữa được cố định 100 kcal.
- Vận động: tính phần ròng và làm tròn xuống.
- Ngày chưa ghi món ăn không tạo dự báo kg, vì coi lượng ăn là 0 sẽ tạo thâm hụt giả.
- Mọi sample đều có khẩu phần cố định; bấm nhiều lần tương ứng nhiều khẩu phần.

## Privacy

- Toàn bộ hồ sơ, món ăn, vận động và cân nặng nằm trong `localStorage` của trình duyệt.
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
├── .github/workflows/       # GitHub Pages deployment
├── index.html               # PWA shell
├── styles.css               # Root family design system
├── app.js                   # model, storage, charts, interactions
├── sw.js                    # offline cache
└── manifest.webmanifest     # install metadata
```
