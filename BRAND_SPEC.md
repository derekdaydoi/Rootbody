# rootbody — đặc tả nhận diện

rootbody là hệ health intelligence local-first. Tên sản phẩm luôn viết chính xác bằng chữ thường: `rootbody`.

## Câu chuyện thương hiệu

Logo được dựng lại trực tiếp từ ảnh nguồn `body.png`, không thay đổi silhouette và không thêm concept ngoài ảnh:

- **ROOT** — vòng Root Green là nền tảng và nguyên nhân gốc.
- **BODY** — hình cơ thể màu trắng là hệ thống được quan sát.
- **SIGNAL** — các chi tiết Signal Lime là dữ kiện đang hoạt động, thay đổi hoặc cần chú ý.
- **LOOP** — đường cong khép gần trọn vòng thể hiện chu trình `đo lường → diễn giải → ưu tiên → can thiệp → kiểm chứng`.

Logo không mang nghĩa “khỏe”, “an toàn” hoặc “đã ổn”. Signal Lime chỉ diễn đạt active/selected/change/intervention/progress. Trạng thái sức khỏe phải dùng token chức năng riêng.

## Nguồn hình và độ trung thực

- Nguồn chuẩn: `brand/rootbody-source.png`, bản sao nguyên vẹn của ảnh người dùng cung cấp.
- SHA-256 nguồn: `C6025927585AA61EE9FD442CE0A0BAA3E37DC518876F3E512D0B792971D2BFDD`.
- Vùng hình được chuẩn hóa từ ảnh 2000 × 2000 px thành viewBox 1320 × 1320, giữ 40 px khoảng thở quanh silhouette.
- Vector được trace theo đúng ba lớp màu của nguồn. Đối chiếu trên raster chuẩn hóa đạt IoU Root Green `0,997515`, IoU Signal Lime `0,955920`, độ khớp phân lớp toàn ảnh `0,998653` và sai số RGB trung bình `0,276`.
- Nền trắng là một phần bắt buộc của geometry vì hình cơ thể dùng white negative space. Không xóa nền hoặc đổi thân người thành trong suốt.

## Hệ asset

| Asset | Vai trò |
| --- | --- |
| `brand/rootbody-source.png` | ảnh nguồn bất biến để đối chiếu |
| `brand/rootbody-mark.svg` | logo chính trên controlled white field |
| `brand/rootbody-logo.svg` | horizontal lockup: mark + wordmark chữ thường |
| `brand/rootbody-wordmark.svg` | wordmark riêng bằng Evidence Ink |
| `brand/rootbody-symbol.svg` | icon vuông có safe zone cho home-screen mask |
| `brand/rootbody-favicon.svg` | favicon vector |
| `brand/rootbody-base.svg` | lớp ROOT + BODY dùng trong startup motion |
| `brand/rootbody-signal.svg` | lớp SIGNAL dùng trong startup motion |
| `brand/rootbody-mark.png` | bản PNG 1024 px của mark |
| `brand/rootbody-logo.png` | bản PNG 1600 px của horizontal lockup |
| `icon-180.png` | Apple touch icon |
| `icon-192.png` | PWA icon 192 px |
| `icon-512.png` | PWA icon 512 px |
| `icon-1024.png` | master raster icon 1024 px |

Các asset monogram `rb → root` trước đây đã được retire: tên file tương thích được giữ khi cần để không phá reference, nhưng geometry và ý nghĩa cũ không còn được sử dụng.

## Color tokens

### Brand cố định

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| Root Green | `#025B30` | cấu trúc logo, primary action, nhận diện nền tảng |
| Signal Lime | `#7ED957` | active, selected, change, intervention, progress |
| Body White | `#FFFFFF` | cơ thể trong logo, chữ trên Root Green |
| Evidence Ink | `#102019` | chữ chính, chữ trên Signal Lime |

### UI neutrals

| Token | Giá trị |
| --- | --- |
| Ground | `#F7F9F5` |
| Surface | `#FFFFFF` |
| Surface 2 | `#F1F5EF` |
| Soft Root | `#E8F2E7` |
| Muted | `#667269` |
| Subtle | `#7B887E` |
| Line | `#DCE6DB` |
| Line Strong | `#C6D4C8` |

Quy tắc tương phản bắt buộc:

- Root Green `#025B30` luôn đi với Body White `#FFFFFF` khi chứa chữ.
- Signal Lime `#7ED957` luôn đi với Evidence Ink `#102019` khi chứa chữ.
- Không đặt chữ đen trên Root Green và không đặt chữ trắng trên Signal Lime.
- Màu thương hiệu không thay thế semantic state.

### Semantic state

| Trạng thái | Màu | Ý nghĩa |
| --- | --- | --- |
| Stable | `#3E6B5D` | dữ kiện ổn định theo rule hiện có, không phải claim “khỏe” |
| Watch | `#A46412` | cần theo dõi |
| Actionable | `#B65324` | có thể hành động |
| Medical | `#A33838` | cảnh báo y khoa/red flag |
| Unknown | Subtle | chưa đủ dữ liệu |

## Typography và wordmark

- UI dùng Open Sans self-hosted.
- Wordmark luôn là `rootbody`, không dùng `Rootbody` hoặc `ROOTBODY` trong bề mặt sản phẩm.
- Heading 600–700; body 400–500; số liệu chính 650–700.
- Body text tối thiểu 16 px; nhãn phụ tối thiểu 11 px. Không ép một dòng bằng cách giảm font.

## Khoảng thở và kích thước

- Clear space tối thiểu quanh mark bằng 8% cạnh asset.
- Header mark: 46–52 px tùy viewport.
- Mark độc lập không nhỏ hơn 32 px; dưới 32 px dùng favicon đã tối ưu.
- Home-screen icon giữ khoảng an toàn khoảng 10% mỗi cạnh để chịu được mask tròn, squircle và rounded rectangle.
- Nội dung hỗ trợ viewport từ 320 px, không horizontal overflow và không cắt control 44 px.

## Startup motion

Motion dùng chính geometry logo và kể đúng thứ tự:

1. **ROOT** — Root Green field xuất hiện từ `0,04s`.
2. **BODY** — body silhouette được reveal từ `0,25s`.
3. **SIGNAL** — Signal Lime xuất hiện từ `0,70s`.
4. **IDENTITY** — wordmark `rootbody` và copyright xuất hiện từ `0,95s`.
5. Splash giữ ngắn rồi fade; tổng thời lượng `1,9–1,95s`.

Không particle, sparkle, neon, bounce lớn hoặc motion tạo thành một logo khác. Với `prefers-reduced-motion: reduce`, hiển thị lockup tĩnh và fade trong `650–700ms`.

## UI semantics

- Header là điểm nhận diện cố định; title lặp lại ở từng tab được ẩn bằng kỹ thuật visually-hidden nhưng vẫn giữ accessible name.
- Bottom navigation, segmented control và lựa chọn đang active dùng Signal Lime hoặc Signal Soft, không dùng semantic health color.
- Card nền Root Green phải có chữ trắng. Card Signal Lime phải có chữ Evidence Ink.
- Red flags, warning, recovery state và evidence grade tiếp tục dùng token chức năng riêng.

## Product copy

Mỗi card chỉ trả lời một việc: dữ kiện, diễn giải, hành động hoặc kiểm chứng. Không đưa claim y khoa vào dữ liệu self-report/ước tính. Khi thiếu dữ liệu phải ghi rõ `Chưa đủ dữ liệu`.
