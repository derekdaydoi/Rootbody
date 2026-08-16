# Rootbody V1

Rootbody là PWA local-first để theo dõi calorie deficit cá nhân. Bản V1 ưu tiên mô hình năng lượng minh bạch và thao tác nhanh trên điện thoại, chưa phụ thuộc Apple Health hoặc backend.

## Công thức V1

```text
deficit = calo nền + calorie vận động thêm - calorie đã ăn
```

Giá trị mặc định:

- calo nền: `1.600 kcal/ngày`;
- deficit mục tiêu: `400 kcal/ngày`.

Hai giá trị đều chỉnh được trong **Thiết lập**. `1.600` là prior cá nhân ban đầu, không phải hằng số đúng cho mọi người và không phải kết luận y khoa.

Rootbody không suy diễn độ chính xác giả từ một ngày cân. V1 thu thập weight log; calibrated TDEE chỉ nên mở khi có tối thiểu 14 lần cân trong cửa sổ 21 ngày và food log đủ đầy.

## Có trong V1

- tính deficit theo thời gian thực;
- nhập tổng calorie theo từng bữa;
- nhập calorie vận động thêm;
- ngân sách ăn dựa trên deficit mục tiêu;
- log cân nặng buổi sáng;
- tiến độ dữ liệu cho TDEE calibration;
- export/import JSON;
- lưu hoàn toàn bằng `localStorage` trên thiết bị;
- PWA offline và Home Screen;
- không account, analytics hoặc server.

## Privacy

Food log, cân nặng và thiết lập chỉ nằm trong trình duyệt hiện tại. Xóa browser data hoặc gỡ website data sẽ làm mất dữ liệu nếu chưa export JSON.

## Chạy local

Không cần build hoặc dependency:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`.

## GitHub Pages

Repo được thiết kế để publish trực tiếp từ root của nhánh `main`. Tất cả asset dùng relative URL nên hoạt động dưới project path `/Rootbody/`.

## Brand

Rootbody dùng cùng hệ thống với Rootflow và Rootwork:

- background `#F3F0E7`;
- surface `#FFFDF9`;
- ink `#101110`;
- duy nhất một brand green `#14614A`;
- Manrope 800 cho wordmark, heading và số lớn;
- system font cho UI vận hành;
- icon nền xanh đặc, nét trắng tròn và một root anchor dot.

Chi tiết nằm trong [`BRAND_SPEC.md`](./BRAND_SPEC.md).

## Giới hạn đã biết

- chưa có food database, barcode hoặc photo estimation;
- activity calorie do người dùng nhập;
- chưa có HealthKit;
- chưa tính calibrated TDEE;
- dữ liệu chưa sync giữa các thiết bị.

Rootbody V1 là tracking instrument, không phải medical device hoặc lời khuyên điều trị.
