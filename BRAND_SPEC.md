# Rootbody — brand specification

Rootbody dùng cùng nhịp chuyển động gọn và cảm giác sản phẩm của Rootflow, nhưng có nhận diện riêng: một tín hiệu cơ thể được neo bởi ba root-stroke lớn.

## Logo system

- `brand/rootbody-mark.svg`: compact primary mark trên nền trong suốt.
- `brand/rootbody-symbol.svg`: app icon Deep Navy, dùng cho PWA/Home Screen; không dùng mạng rễ chi tiết.
- `brand/rootbody-wordmark.svg`: wordmark chữ thường; `root` Deep Navy, `body` Signal Teal.
- `brand/rootbody-logo.svg`: lockup mark + wordmark.
- `brand/rootbody-lab.svg`: monoline Lab mark, không dùng biểu tượng AI/sparkle.

Logo phải còn đọc được ở 24 px. App icon chỉ có hai vòng signal, một core, body và ba root-stroke đậm; không thêm chi tiết mảnh hoặc gradient/glow vào asset tĩnh.

## Palette

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| Deep Navy | `#0D1B2A` | chữ chính, icon, app-icon background |
| Signal Teal | `#0FA3A3` | action, trạng thái chọn, signal |
| Soft Cyan | `#BFE9F3` | ring, surface thông tin, divider mềm |
| Off White | `#F6F8FA` | nền ứng dụng |
| Muted Violet | `#6F6AAE` | secondary data series, recovery |

Light theme dùng surface trắng/Off White. Dark theme dùng `#08121D` đến `#1B2E3E`, giữ Teal/Cyan sáng hơn để bảo toàn tương phản. Trạng thái cảnh báo/y khoa dùng màu chức năng riêng và không được thay bằng Teal chỉ để “đẹp”.

## Typography

- UI: Open Sans self-hosted, gồm Vietnamese/Latin/Latin Extended.
- Wordmark: chữ thường, trọng lượng 400–500; không viết `ROOTBODY` toàn bộ bằng chữ hoa.
- Heading: 700; body: 400–500; số liệu quan trọng: 650–700.
- Không giảm font dưới 11 px để ép một dòng. Ưu tiên rút copy hoặc đổi layout.

## Spacing và sizing

- Mobile content width: tối đa 680 px.
- Card radius: 14–18 px; control tối thiểu 44 px.
- Padding ngang: 18 px trên mobile, 20–24 px trên màn hình rộng.
- Hỗ trợ từ 320 px, không có horizontal overflow.
- Ảnh bài tập dùng `object-fit: contain`; toàn bộ ảnh kết thúc trước phần Setup/Cues.

## Startup motion

Tổng thời lượng khoảng 3,05 giây:

1. Core xuất hiện ở 0,20 giây.
2. Ba signal ring lần lượt ở 0,44 / 0,66 / 0,88 giây.
3. Body và roots hoàn thiện khoảng 1,04 giây.
4. Wordmark xuất hiện khoảng 1,42 giây.
5. `© Copyright from derekdaydoi` xuất hiện khoảng 1,82 giây.
6. Splash rời màn hình ở 3,15 giây.

Với `prefers-reduced-motion: reduce`, bỏ chuỗi chuyển cảnh và đóng splash sau khoảng 700 ms.

## Product copy

Ít subtitle. Mỗi card chỉ trả lời một việc: dữ kiện, diễn giải, hành động hoặc kiểm chứng. Không dùng claim y khoa khi dữ liệu chỉ là self-report/ước tính. Trạng thái thiếu dữ liệu luôn ghi rõ `Chưa đủ dữ liệu`.
