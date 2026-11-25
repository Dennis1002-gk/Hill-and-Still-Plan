# HILL AND STILL — V5 Navigation Edition

**Tagline:** Find your own rhythm.

## Chạy website
1. Giải nén thư mục ZIP.
2. Mở `HILL_AND_STILL_MVP_01_V2/index.html` bằng Chrome hoặc Edge.
3. Internet được dùng cho Google Fonts và tìm kiếm bài hát qua Apple Search. Các chức năng thư viện cá nhân và gợi ý nội bộ vẫn hoạt động khi ngoại tuyến sau khi tải trang, ngoại trừ tra cứu bên ngoài.

## Cấu trúc điều hướng
Thanh ngang có 4 mục chính:
- **MAIN:** Lời giới thiệu dự án theo hướng cảm xúc, gần gũi và cách hoạt động.
- **DISCOVER:** HOME → DISCOVER → TOP 5 RECOMMENDATIONS → FEEDBACK.
- **MY MUSIC:** một trang quản lý danh sách yêu thích; không còn Explore Music.
- **SETTING:** Quản lý hồ sơ gợi ý, bộ sưu tập và thông tin quyền riêng tư.

## Các tính năng
- Gợi ý 5 bài từ thư viện nội bộ dựa trên trạng thái, mục tiêu, thể loại, vocal và phản hồi. Những bài được đánh dấu yêu thích trong TOP 5 tạo tín hiệu sở thích cho các lần gợi ý sau.
- Tìm kiếm tên bài/nghệ sĩ gần đúng trong thư viện nội bộ; hỗ trợ bỏ dấu tiếng Việt. Có thể tra cứu bổ sung bằng Apple iTunes Search API.
- Chỉ đánh dấu yêu thích tại TOP 5 trong DISCOVER; MY MUSIC hiển thị các bài đã yêu thích và cho phép bỏ yêu thích từng bài. Dữ liệu được lưu trong `localStorage` của trình duyệt.
- Đánh giá riêng trải nghiệm HOME, DISCOVER, TOP 5 và phản hồi độ phù hợp của bài hát.
- Không có trình phát nhạc, không upload audio, không có preview playback.

## Dữ liệu và giới hạn
- Thư viện nội bộ giữ nguyên 51 bản ghi trong `data/sounds.js`.
- Metadata chưa được xác minh sẽ hiển thị là chưa xác minh. Dữ liệu Energy có ghi chú tạm thời trong nguồn vẫn được gắn nhãn tạm.
- Bộ gợi ý là hệ thống luật/heuristic thử nghiệm, không phải mô hình AI đã được huấn luyện hay kiểm chứng khoa học. Điểm xếp hạng chỉ phục vụ sắp thứ tự nội bộ.
- Danh sách yêu thích chỉ lưu trong trình duyệt hiện tại, chưa đồng bộ máy chủ. Discover chỉ hiện TOP 5 sau khi tạo gợi ý; Feedback hiện sau khi chọn đánh giá một bài hát.
- Apple Search có thể không trả kết quả hoặc bị giới hạn theo mạng/khu vực. Kết quả ngoài chỉ lưu metadata và liên kết nguồn, không lưu file nhạc.
- HILL AND STILL là công cụ khám phá âm nhạc, không phải công cụ chẩn đoán hay điều trị.

## Lưu trữ cục bộ
- Hồ sơ đề xuất cũ: `hs_mvp01_profile`
- Bộ sưu tập cá nhân V5: `hs_v5_personal_collection`
- Đánh giá ba mục V5: `hs_v5_section_feedback`

Không đưa dữ liệu cá nhân hoặc thông tin nhạy cảm vào các trường sở thích.


## V5.3 visual update
- Local SVG artwork for the MAIN hero and six music-category cover styles.
- Lightweight spring-eased transitions, scroll reveal, subtle pointer parallax, and reduced-motion accessibility support.
- No heavy animation framework or external image dependency.


## V5.4 — Physics-informed interaction
- Replaced cubic-bezier-only pointer tilt with a small requestAnimationFrame spring integrator (stiffness, damping, mass), retaining velocity when targets change.
- MAIN hero and recommendation/library cards respond to pointer movement with interruptible spring motion.
- Buttons respond on pointer-down and spring back on release; navigation and revealed result panels use the same spring engine.
- Motion loop runs only while a spring is settling; no permanent animation loop and no added animation framework.
- `prefers-reduced-motion` disables spring motion and retains immediate functional feedback.
- Motion uses transform/opacity/scale channels to avoid layout reflow.


## Phân nhóm nghiên cứu A/B/C/D (bản demo)
- A: bộ 5 âm thanh cố định theo thứ tự ID/tên, không cá nhân hóa.
- B: chỉ xếp hạng theo thể loại người tham gia chọn.
- C: kết hợp sở thích, trạng thái hiện tại và mục tiêu cảm xúc; hồ sơ học từ người tham gia trước được bỏ qua trong lượt nghiên cứu để tránh nhiễm chéo.
- D: nghỉ yên tĩnh 3 phút, không hiển thị danh sách âm thanh.

**Giới hạn quan trọng:** bản MVP này chưa tích hợp trình phát âm thanh. A/B/C hiện chỉ hiển thị danh sách lựa chọn, không phát nhạc; D có đồng hồ nghỉ yên tĩnh. Vì vậy dữ liệu hiện tại phù hợp để kiểm tra luồng giao diện và lưu trữ, không được diễn giải là bằng chứng thực nghiệm về tác động của việc nghe nhạc. Chỉ tiến hành nghiên cứu hiệu quả nghe nhạc sau khi tích hợp và kiểm tra trình phát, chuẩn hóa thời lượng/âm lượng và quy trình đồng ý tham gia.
