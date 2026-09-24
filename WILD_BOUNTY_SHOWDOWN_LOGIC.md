# 🤠 TÀI LIỆU ĐẶC TẢ LOGIC VÀ KIẾN TRÚC GAME: WILD BOUNTY SHOWDOWN (SLOTS PG SOFT)

> **Mã nguồn:** OmniDeck Arena Slot Hub  
> **Phiên bản:** 2.5 (Chuẩn PG Soft Replica)  
> **Cấu trúc cuộn:** 6 cột dạng so le hình học `3 - 4 - 5 - 5 - 4 - 3`  
> **Số đường thắng tối đa (Ways to Win):** 3,600 đường  
> **RTP Lý Thuyết:** ~96.75% | **Độ biến động (Volatility):** Rất Cao (High) | **Thắng tối đa:** x5,000 cược  

---

## 1. TỔNG QUAN VỀ TRÒ CHƠI

**Wild Bounty Showdown** là trò chơi video slot 6 cuộn lấy chủ đề viễn Tây cổ điển với nhân vật chính là Nữ Thợ Săn Tiền Thưởng (Cowgirl). Trò chơi tích hợp các cơ chế độc quyền của PG Soft:
- **Cơ chế nổ cuộn liên hoàn (Cascading Reels / Avalanche)**.
- **Biểu tượng Khung Vàng biến hình thành WILD (Gold Frame to Wild)**.
- **Hệ số nhân nhân đôi liên tục sau mỗi cascade ($x2 \rightarrow x4 \rightarrow x8... \rightarrow x1,024$)**.
- **Chế độ Vòng Quay Miễn Phí (Free Spins)** với hệ số khởi điểm cố định là **x8**.
- **Tính năng Mua Vòng Quay Miễn Phí (Feature Buy)** với giá $75\times$ tiền cược.

---

## 2. BẢNG TRẢ THƯỞNG & BIỂU TƯỢNG (PAYTABLE)

Game có 8 biểu tượng thường, 1 biểu tượng WILD và 1 biểu tượng SCATTER:

| Biểu Tượng | Tên Gọi | 3 Cột Liên Tiếp | 4 Cột Liên Tiếp | 5 Cột Liên Tiếp | 6 Cột Liên Tiếp | Ghi Chú Đặc Biệt |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| 🤠 `cowgirl` | Nữ Thợ Săn | 30 | 40 | 50 | **1024** | Biểu tượng trả thưởng cao nhất |
| 🥃 `whiskey` | Rượu Whisky | 20 | 25 | 30 | **500** | Biểu tượng cấp cao |
| 👒 `hat` | Mũ Cowboy | 15 | 20 | 25 | **400** | Biểu tượng cấp cao |
| 🔫 `holster` | Bao Súng Rulo | 10 | 15 | 20 | **300** | Biểu tượng cấp cao |
| ♠️ `A` | Quân Bài Át | 5 | 8 | 10 | **150** | Biểu tượng cấp trung |
| 👑 `K` | Quân Bài Vua | 4 | 6 | 8 | **120** | Biểu tượng cấp trung |
| 💎 `Q` | Quân Bài Hậu | 3 | 5 | 7 | **100** | Biểu tượng cấp phổ thông |
| 🗡️ `J` | Quân Bài Bồi | 2 | 4 | 6 | **80** | Biểu tượng cấp phổ thông |
| ⭐ `wild` | Biểu Tượng WILD | — | — | — | — | Thay thế mọi biểu tượng (trừ Scatter). Chỉ xuất hiện ở cuộn 2, 3, 4, 5 |
| 🗝️ `scatter` | Két Sắt Vàng | — | — | — | — | Rơi $\ge 3$ Scatters kích hoạt 10 Vòng Quay Miễn Phí |

---

## 3. CƠ CHẾ TOÁN HỌC & TÍNH ĐƯỜNG THẮNG (WAYS TO WIN)

### 3.1. Quy tắc kết nối đường thắng
- Biểu tượng thắng phải xuất hiện **từ cuộn cực trái (cuộn 1) liên tiếp sang phải (cuộn 2, 3, 4, 5, 6)** mà không bị ngắt quãng.
- Cần tối thiểu **3 cuộn liên tiếp** (cuộn 1, 2, 3) có cùng biểu tượng (hoặc có WILD thay thế).

### 3.2. Công thức tính số đường thắng (Ways)
Trong một vòng quay, nếu biểu tượng $S$ xuất hiện ở các cuộn liên tiếp từ 1 đến $k$ ($3 \le k \le 6$):
$$\text{Ways}(S) = C_1(S) \times C_2(S) \times \dots \times C_k(S)$$
*Trong đó: $C_i(S)$ là số lượng biểu tượng $S$ (bao gồm cả WILD) xuất hiện tại cột thứ $i$.*

### 3.3. Công thức tính tiền thưởng (Payout)
$$\text{Tiền Thắng} = \text{Ways}(S) \times \text{BasePayout}(S, k) \times \left(\frac{\text{BetAmount}}{20}\right) \times \text{ActiveMultiplier}$$

---

## 4. CƠ CHẾ KHUNG VÀNG BIẾN HÌNH (GOLD FRAME TO WILD)

1. **Xuất hiện ngẫu nhiên**: Trong bất kỳ vòng quay nào, một số ô tại các cột **2, 3, 4 và 5** (không bao gồm WILD và SCATTER) có tỉ lệ ngẫu nhiên (~8%) mang **Khung Mạ Vàng**.
2. **Kích hoạt biến hình**:
   - Nếu biểu tượng có Khung Vàng **tham gia vào một tổ hợp thắng**:
   - Biểu tượng đó **KHÔNG BỊ PHÁ HỦY** (không biến mất khỏi màn hình).
   - Biểu tượng đó lập tức kích hoạt hiệu ứng biến hình vàng kim (`animate-gold-morph`) và chuyển thành **biểu tượng WILD (`★ WILD ★`)** ngay tại vị trí đó cho lượt nổ cascade tiếp theo!
3. **Ý nghĩa chiến thuật**: Đây là nguồn sản sinh WILD cực mạnh, giúp tạo ra các chuỗi combo liên hoàn 4 - 6 tầng liên tiếp.

---

## 5. HỆ THỐNG CẤP SỐ NHÂN NHÂN ĐÔI (DOUBLING MULTIPLIER)

- **Vòng quay cơ bản (Base Game)**: Bắt đầu ở **x1**.
- **Vòng quay miễn phí (Free Spins)**: Bắt đầu ở **x8**.
- **Quy tắc nhân đôi sau mỗi Cascade**:
  - Khi một lượt nổ vỡ có ít nhất 1 tổ hợp ăn tiền:
    $$\text{Multiplier}_{\text{next}} = \min(1024, \text{Multiplier}_{\text{current}} \times 2)$$
  - Bậc tăng lũy thừa 2:
    $$\mathbf{x1 \rightarrow x2 \rightarrow x4 \rightarrow x8 \rightarrow x16 \rightarrow x32 \rightarrow x64 \rightarrow x128 \rightarrow x256 \rightarrow x512 \rightarrow x1024}$$
  - Trong Free Spins:
    $$\mathbf{x8 \rightarrow x16 \rightarrow x32 \rightarrow x64 \rightarrow x128 \rightarrow x256 \rightarrow x512 \rightarrow x1024}$$
- Khi không còn tổ hợp thắng nào nữa: Kết thúc vòng quay, trả thưởng tổng cộng, và hệ số nhân reset về mức ban đầu (x1 hoặc x8) cho lượt quay mới.

---

## 6. QUY TRÌNH QUAY & RƠI CUỘN THỰC TẾ (FRONTEND ANIMATION & REELS)

### 6.1. Chế độ quay thường: Từng cột quay một (Sequential Reel Spins)
Khác với các slot thông thường thả toàn bộ cuộn cùng lúc, Wild Bounty Showdown mô phỏng chuẩn xác slot cao cấp:
1. Khi bấm **QUAY**: Cột 2, 3, 4, 5, 6 đứng yên giữ nguyên biểu tượng cũ.
2. **Cột 1 bắt đầu trôi xuống** $\rightarrow$ tiếp đất với âm thanh chốt đạn cơ học (*clack!*) và nảy đàn hồi (`animate-reel-bounce`).
3. **Cột 2 bắt đầu quay** $\rightarrow$ tiếp đất.
4. **Cột 3 $\rightarrow$ Cột 4 $\rightarrow$ Cột 5 $\rightarrow$ Cột 6** lần lượt tiếp đất theo chuỗi thời gian thực.
5. **Cơ chế đếm Scatter trực tiếp (Live Scatter Drop)**:
   - Ngay khi một cột dừng lại có chứa Két Vàng (🗝️ Scatter), bộ đếm `SCATTERS RƠI: X / 3` trên màn hình lập tức cập nhật thời gian thực kèm tiếng chuông ngân.
   - Khi đã có đủ **2 Scatters**: Các cuộn còn lại chuyển sang trạng thái **Hồi Hộp (Anticipation Suspense)** với viền bốc cháy đỏ vàng (`animate-anticipation`), nhịp đếm căng thẳng và thời gian quay kéo dài hơn trước khi chốt hạ.

### 6.2. Cơ chế "Dãy dài rơi liên tục từ trên xuống" (Continuous Strip Avalanche)
- Khi một tổ hợp ăn tiền phát nổ:
  1. **Phase 1 - Kết nối**: Các ô thắng phát sáng viền vàng neon và đường quét ánh sáng `shimmer`.
  2. **Phase 2 - Phát súng nổ vỡ kính**: Súng lục nổ vang trời, mảnh kính văng tung tóe 3D, các ô thắng không phải khung vàng tan biến (scale về 0).
  3. **Phase 3 - Rơi trọng lực liên tục**:
     - Các cột **không có ô nổ sẽ đứng yên 100%**, không có bất kỳ animation reset nào.
     - Các cột **có ô bị vỡ**: Các ô còn sống bên trên trôi tụt xuống dưới lấp khoảng trống; các ô mới từ dải băng dài trên trần nhà trượt thẳng xuống theo chiều trọng lực (`translateY`) mượt mà và nảy nhẹ khi đáp đất.

---

## 7. TÍNH NĂNG VÒNG QUAY MIỄN PHÍ & BUY FEATURE

### 7.1. Điều kiện kích hoạt
- Xuất hiện từ **3 biểu tượng Scatter** trở lên ở bất kỳ vị trí nào:
  - 3 Scatters = **10 Vòng Quay Miễn Phí**.
  - Mỗi Scatter phụ thêm ngoài 3 = **+2 vòng quay** (Ví dụ: 4 Scatters = 12 vòng, 5 Scatters = 14 vòng).

### 7.2. Đặc quyền trong Vòng Quay Miễn Phí
- Mọi vòng quay đều bắt đầu với hệ số nhân mặc định là **x8** (thay vì x1).
- Nếu nổ cascade 1 lần: lên **x16**, lần 2: lên **x32**, lần 3: lên **x64**... đạt mốc tiền thắng khổng lồ cực kỳ nhanh chóng.
- Miễn phí 100% tiền cược mỗi vòng quay.
- Có khả năng Retrigger (nổ thêm Scatter trong vòng quay miễn phí để cộng thêm lượt).

### 7.3. Mua Tính Năng (Feature Buy)
- Người chơi có thể bấm nút **"MUA TÍNH NĂNG"** với giá cố định:
  $$\text{Giá Mua} = 75 \times \text{Mức Cược Hiện Tại}$$
- Ngay lập tức ở vòng quay kế tiếp, thuật toán đảm bảo thả rơi ít nhất 3 biểu tượng Két Vàng Scatter để kích hoạt ngay 10 Vòng Quay Miễn Phí.

---

## 8. SƠ ĐỒ KIẾN TRÚC CODE & TỔNG KẾT FILE

| Thành phần | Đường dẫn file | Nhiệm vụ chính |
| :--- | :--- | :--- |
| **Slot Engine** | `server/src/engines/slots/WildBountyEngine.ts` | Thuật toán sinh ma trận 3-4-5-5-4-3, tính Ways, kiểm tra Khung Vàng, xử lý cascade đa tầng, lũy thừa hệ số nhân, Provably Fair RTP. |
| **Manager & API** | `server/src/engines/slots/SlotsManager.ts`<br>`server/src/server.ts` | Quản lý danh mục slot game, session vòng quay miễn phí của người chơi, trừ/cộng số dư ví tiền, socket và REST endpoints (`/api/slots/wild-bounty-showdown/spin`). |
| **Reel Strip Component** | `client/src/components/slots/ReelColumnView.tsx` | Mô phỏng dải cuộn trượt dài liên tục, hạ cánh tự nhiên tại `translateY(0)`, xử lý chuyển động trọng lực khi cascade rơi và hiệu ứng nảy cơ học. |
| **Symbols & FX** | `client/src/components/slots/WildBountySymbols.tsx` | Vẽ 10 biểu tượng đồ họa SVG, khung viền vàng, hoạt ảnh vỡ kính súng bắn, mảnh vỡ bay và hiệu ứng biến hình thành WILD. |
| **Main View & Controller** | `client/src/components/slots/WildBountySlot.tsx` | Điều phối quay tuần tự từng cột, xử lý Live Scatter & Anticipation, âm thanh synthesizer Web Audio viễn Tây, bàn cược, Auto Spin & Turbo. |
| **Hub Danh Mục** | `client/src/components/slots/SlotsHubView.tsx` | Sảnh hiển thị danh mục các game slot (PG Soft, Pragmatic, v.v.), bộ lọc game Hot. |

---
*Tài liệu được biên soạn đồng bộ với mã nguồn thực tế của dự án OmniDeck Arena.*
