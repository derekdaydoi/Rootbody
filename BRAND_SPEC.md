# Rootbody — brand specification

Rootbody dùng monogram `rb → root`: hai chữ cái của tên sản phẩm tạo thành một trục sống duy nhất rồi chuyển thành hệ rễ. Ý niệm cần đọc theo thứ tự **identity → body/system → root cause**, không phải minh họa một cái cây.

## Logo system

- `brand/rootbody-mark.svg`: compact primary mark trên nền sáng/trong suốt.
- `brand/rootbody-mark-dark.svg`: cùng geometry, đổi nét `r` sang Off White cho nền tối.
- `brand/rootbody-symbol.svg`: app/PWA icon Deep Navy, `r` Off White, `b + roots` Signal Teal.
- `brand/rootbody-wordmark.svg`: wordmark chữ thường; `root` Deep Navy, `body` Signal Teal.
- `brand/rootbody-logo.svg`: horizontal lockup mark + wordmark.
- `brand/rootbody-lab.svg`: monoline Lab mark; không dùng AI sparkle.

### Geometry chuẩn

Master mark dùng `viewBox="0 0 220 260"`.

- Lowercase `r`: Deep Navy `#0D1B2A`, stroke `16`, round cap/join.
- Lowercase `b`: Signal Teal `#0FA3A3`, stroke `14`, round cap/join.
- Roots là **một layer riêng**, không được gộp với thân `b` ở cùng stroke-width.
- Primary roots: stroke `7.5` — xấp xỉ 54% độ dày thân `b`.
- App-icon roots: stroke `8.5` để giữ khả năng đọc khi rasterize nhỏ.
- Hệ rễ có đúng 5 nét: 1 taproot giữa, 2 lateral roots hướng ra ngoài, 2 inner roots đi chéo xuống. Tất cả xuất phát trong vùng cổ rễ quanh `x=112`, đối xứng trái/phải nhưng không tạo hình chân người.
- Outer roots kết thúc cao hơn inner roots; taproot là nét dài nhất. Không thêm nhánh cấp hai, lá, đất, network rễ hoặc texture.

Logo phải còn nhận ra được ở 24 px. Ở kích thước nhỏ, ưu tiên silhouette `rb` rõ trước, rễ chỉ đóng vai trò signature. Asset tĩnh không dùng gradient, glow hoặc shadow bên trong mark.

## Palette

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| Deep Navy | `#0D1B2A` | chữ chính, `r`, app-icon background |
| Signal Teal | `#0FA3A3` | `b`, roots, action, trạng thái chọn |
| Soft Cyan | `#BFE9F3` | ripple/motion accent, surface thông tin, divider mềm |
| Off White | `#F6F8FA` | nền ứng dụng, `r` trên nền tối |
| Muted Violet | `#6F6AAE` | secondary data series, recovery |

Light theme dùng surface trắng/Off White. Dark theme dùng `#08121D` đến `#1B2E3E`, giữ Teal/Cyan sáng hơn để bảo toàn tương phản. Trạng thái cảnh báo/y khoa dùng màu chức năng riêng và không được thay bằng Teal chỉ để đẹp.

## Typography

- UI: Open Sans self-hosted, gồm Vietnamese/Latin/Latin Extended.
- Wordmark: chữ thường, trọng lượng 400–500; không viết `ROOTBODY` toàn bộ bằng chữ hoa.
- Heading: 700; body: 400–500; số liệu quan trọng: 650–700.
- Không giảm font dưới 11 px để ép một dòng. Ưu tiên rút copy hoặc đổi layout.

## Spacing và sizing

- Mobile content width: tối đa 680 px.
- Card radius: 14–28 px tùy cấp độ surface; control tối thiểu 44 px.
- Padding ngang: 16–18 px trên mobile, 20–24 px trên màn hình rộng.
- Hỗ trợ từ 320 px, không có horizontal overflow.
- Ảnh bài tập dùng `object-fit: contain`; toàn bộ ảnh kết thúc trước phần Setup/Cues.

## Startup motion

Startup motion phải dựng **chính geometry của logo**, không tạo một logo khác chỉ để animate. Tổng thời lượng hiển thị khoảng `2.2s`; DOM splash được cleanup khoảng `2.3s`.

1. `0.00–0.18s` — trục Signal Teal xuất hiện từ trên xuống (`seed/stem`).
2. `0.18–0.46s` — nét `r` Deep Navy/Off White được draw-on.
3. `0.36–0.66s` — loop `b` Signal Teal hoàn thiện.
4. `0.56–1.06s` — 5 root strokes mọc xuống và ra ngoài; root dùng stroke mảnh `7.5`, không dày bằng thân `b`.
5. `~0.94s` — wordmark `rootbody` fade + translate nhẹ vào vị trí.
6. `~1.14s` — một ripple Soft Cyan rất nhẹ xuất hiện dưới root collar rồi biến mất; không sparkle, không heavy glow.
7. `~2.20s` — splash fade out; app đã ở trạng thái sẵn sàng phía sau.

Motion dùng ease-out, chuyển động ngắn và có cảm giác precision/clinical-tech. Không bounce lớn, không particle, không neon. Với `prefers-reduced-motion: reduce`, bỏ chuỗi draw-on/ripple, hiển thị logo tĩnh rồi fade splash trong khoảng `650–700ms`.

## Product copy

Ít subtitle. Mỗi card chỉ trả lời một việc: dữ kiện, diễn giải, hành động hoặc kiểm chứng. Không dùng claim y khoa khi dữ liệu chỉ là self-report/ước tính. Trạng thái thiếu dữ liệu luôn ghi rõ `Chưa đủ dữ liệu`.
