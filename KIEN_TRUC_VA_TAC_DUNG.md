# 🏛️ TÀI LIỆU KIẾN TRÚC VÀ TÁC DỤNG HỆ THỐNG — OMNIDECK ARENA V2

> **Phiên bản:** OmniDeck Arena 2.0 (Multiplayer Boardgames & Provably Fair Casino Mini-games)  
> **Cập nhật:** 23/09/2026

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

**OmniDeck Arena** là một nền tảng giải trí trực tuyến thời gian thực (Real-time Multiplayer & Solo Gaming Platform), kết hợp giữa:
1. **Game bài đa người chơi truyền thống & hiện đại**: Tiến Lên Miền Nam, UNO (Classic / No Mercy / Flex), Exploding Kittens (Mèo Nổ kèm 3 bản mở rộng).
2. **Casino & Mini-games minh bạch (Provably Fair)**: Tài Xỉu MD5 (nặn đĩa, xem cầu), Mines (Spribe), Goals (Spribe).
3. **Kinh tế tiền ảo khép kín (Virtual Economy)**: Hệ thống Coins, chế độ Làm Việc gõ chữ (Work System) cày tiền, cược tiền phòng multiplayer (nhân thưởng x15–30), và Chế độ Khách (Guest Mode) chơi thử miễn phí.

---

## 2. KIẾN TRÚC TỔNG THỂ (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Client - Server thời gian thực (Full-Duplex Realtime)** thông qua WebSockets (Socket.IO) kết hợp REST API.

```
                           +-------------------------------------+
                           |            NGƯỜI CHƠI               |
                           |   (Web Browser / Mobile Browser)    |
                           +------------------+------------------+
                                              |
                                HTTP / WSS    |
                                              v
+-----------------------------------------------------------------------------------------+
|                                     FRONTEND (CLIENT)                                   |
|  - Framework: React 18, TypeScript, Vite                                                |
|  - Styling & Animations: Tailwind CSS, Framer Motion                                    |
|  - Icons & Audio: Lucide React, Web Audio API Synthesizer                               |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |        App.tsx (BrowserRouter + Slug Routes, bọc GameSocketProvider)          |  |
|  |  /dashboard (Navigation Panel) · /play · /room/:roomId · /room-id?id= ·      |  |
|  |  /hustle · /leaderboard · /tai-xiu · /mines · /goals                         |  |
|  +-----------------------------------------------------------------------------------+  |
|         |                   |                   |                   |                   |
|         v                   v                   v                   v                   v
|   [NavigationPanel]    [Play/RoomView]     [HustleView]     [TaiXiuView]         [TableView]
|   - Trung tâm mọi dv  - Tạo/vào phòng     - Gõ chữ kiếm coin  - Bàn cược MD5       - Phòng chơi
|   - Slug /dashboard   - Slug /play /room  - Slug /hustle    - Slug /tai-xiu      - Slug /room/:id
+---------------------------------------------+-------------------------------------------+
                                              |
                            Socket.IO Events  |  REST API (/api/auth, /api/user, ...)
                                              v
+-----------------------------------------------------------------------------------------+
|                                     BACKEND (SERVER)                                    |
|  - Runtime: Node.js, Express, Socket.IO, TypeScript                                     |
|  - Storage: Persistent JSON File Storage (`data/users.json`)                            |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |             Socket Routers & Controllers (`sockets/gameHandlers.ts`)              |  |
|  +-----------------------------------------------------------------------------------+  |
|         |                   |                   |                   |                   |
|         v                   v                   v                   v                   v
|   [UserManager]       [WorkManager]       [TaiXiuEngine]       [MinesEngine]      [RoomManager]
|   - Auth / Session    - 200+ từ vựng      - MD5 Hash           - 5x5 Hypergeom.   - Tạo / vào room
|   - Quản lý Coins     - Cooldown 5s       - State machine      - Fisher-Yates     - Bot AI
|   - Bảng xếp hạng     - Thưởng +10 coin   - Lịch sử cầu        - SHA-512 provable - UNO / EK / TL
+-----------------------------------------------------------------------------------------+
```

---

## 3. CHI TIẾT CÁC THÀNH PHẦN & TÁC DỤNG (COMPONENTS & ROLES)

### A. Nền tảng Kinh Tế & Quản Lý Người Dùng (Economy & User System)

| Tên Module / File | Vai Trò & Tác Dụng |
| :--- | :--- |
| **`UserManager.ts`** | - Quản lý đăng ký, đăng nhập bảo mật bằng mật khẩu băm SHA-256 kèm `salt` ngẫu nhiên 16 bytes.<br>- Quản lý số dư tiền ảo (`balance`): tặng **500 coins** khởi tạo cho tài khoản mới; các phương thức giao dịch an toàn: `addBalance()`, `deductBalance()`, `getBalance()`.<br>- Lưu trữ lịch sử thắng thua, tính toán bảng xếp hạng (Leaderboard) theo từng game hoặc tổng thể. |
| **`AuthContext.tsx`** | - Quản lý phiên đăng nhập ở Client thông qua Bearer Token lưu tại `localStorage`.<br>- Tự động đồng bộ số dư người chơi và hỗ trợ chế độ Khách (Guest Mode) không cần đăng nhập. |

---

### B. Hệ Thống Làm Việc Kiếm Tiền (Work System)

| Tên Module / File | Vai Trò & Tác Dụng |
| :--- | :--- |
| **`WorkManager.ts`** | - Quản lý phiên gõ chữ cày coins của người chơi phía Server.<br>- Ngân hàng hơn 200 từ vựng song ngữ (tiếng Việt có dấu, tiếng Anh) sinh ngẫu nhiên.<br>- Cơ chế kiểm soát gian lận: Mỗi từ có hạn chót 15s để hoàn thành, cooldown bắt buộc 5s giữa 2 lượt liên tiếp.<br>- Tặng thưởng ngay **+10 coins** vào ví người dùng khi gõ chính xác 100%. |
| **`WorkView.tsx`** | - Giao diện gõ chữ tốc độ cao với phong cách thiết kế Cyberpunk/Terminal tối màu.<br>- **Công nghệ chống gian lận (Anti-Copy Protection)**:<br>  + Khóa hoàn toàn chuột phải (`onContextMenu` preventDefault).<br>  + Vô hiệu hóa bôi đen sao chép văn bản bằng CSS (`user-select: none`, `pointer-events: none`).<br>  + Chặn thao tác dán (`onPaste` preventDefault) và phím tắt `Ctrl+C`, `Ctrl+V`, `Ctrl+A`.<br>  + Hiển thị đối chiếu ký tự trực tiếp (xanh khi đúng, đỏ khi sai). |

---

### C. Game Tài Xỉu MD5 Provably Fair (Live Dice Casino)

| Tên Module / File | Vai Trò & Tác Dụng |
| :--- | :--- |
| **`TaiXiuEngine.ts`** | - Máy trạng thái (State Machine) tự động vận hành liên tục 24/7 theo chu kỳ:<br>  `BETTING (30s)` ➜ `SHAKING (5s)` ➜ `REVEALING (15s: vừa mở bát vừa trả thưởng)`.<br>- Trả thưởng ngay lúc bắt đầu mở bát nên 15s vừa xem tung xúc xắc 3D vừa nhận tiền, hết 15s sang phiên mới (không còn phase settling riêng).<br>- **Chỉ 2 cửa Tài/Xỉu, trả 1:1.95** (cửa Bão đã xóa; bão triple thì 2 cửa đều thua). **Hũ Jackpot**: 5% mỗi cược chảy vào hũ (lưu file `data/taixiu-jackpot.json`); nổ hũ chia đều cho người cược đúng cửa khi bão **1-1-1** (Xỉu) hoặc **6-6-6** (Tài).<br>- `UserManager.getLeaderboard('money')`: xếp hạng theo số dư để hiện Top Giàu trên Navigation Panel. |<br>- **Thuật toán MD5 Provably Fair**:<br>  1. Trước khi mở cược: Server sinh ngẫu nhiên 3 xúc xắc $[d_1, d_2, d_3]$ và chuỗi khóa bí mật `serverSeed`.<br>  2. Chuỗi kết quả gốc: `rawString = "${d1}-${d2}-${d3}-${serverSeed}"`.<br>  3. Mã băm: `md5Hash = md5(rawString)` được phát sóng công khai ngay đầu phiên cho toàn bộ người chơi.<br>  4. Sau khi mở bát: Công khai `rawString` để người chơi tự đối chiếu băm MD5 độc lập.<br>- Luật trả thưởng: Xỉu (4–10) ăn x2; Tài (11–17) ăn x2; Bão (3 xúc xắc cùng nút) ăn x30. |
| **`TaiXiuView.tsx`** | - Phòng cược sảnh chung (Live Lobby) cho tất cả người chơi online.<br>- Bảng chọn chip cược (10, 50, 100, 500, 1K, 5K coins) và đặt tiền vào 3 cửa Tài - Xỉu - Bão.<br>- Thanh tiến trình đếm ngược thời gian phiên và hiển thị mã MD5 minh bạch. |
| **`DiceSqueeze.tsx`** | - **Bát 3D + Đĩa rộng**: Bát khối 3D (thân gradient kim loại, vành dày, lòng tối, chân bát, điểm bóng) và đĩa đều rộng hơn cụm xúc xắc một khoảng, úp **kín opaque** suốt lúc cược và lắc.<br>- **Xúc xắc 3D đọc mặt trên**: khối lập phương CSS `preserve-3d` đủ 6 mặt, khung nghiêng 55° như nhìn từ trên xuống — **mặt trên cùng là mặt tính số**; hiện tĩnh, **không rung/nảy**, mở ra là kết quả luôn.<br>- Giữ kéo-thả nặn đĩa và nút "Mở Nhanh" lúc lắc bát. |
| **`TaiXiuRoadmap.tsx`** | - **Xem Cầu & Soi Cầu chuyên sâu**: Bảng Cầu Tròn (Bead Plate) ma trận 6 dòng hiển thị trực quan các nút chấm đỏ (Tài), xanh (Xỉu), vàng (Bão).<br>- Biểu đồ phân tích tỉ lệ % xuất hiện và nhận diện cầu bệt, cầu đảo. |

---

### D. Game Mines & Goals (Spribe Mechanics)

| Tên Module / File | Vai Trò & Tác Dụng |
| :--- | :--- |
| **`MinesEngine.ts` & `MinesView.tsx`** | - **Lối chơi Dò Mìn Spribe 5x5 (25 ô)**: Người chơi tùy chọn từ 1 đến 24 quả bom ẩn.<br>- Thuật toán Provably Fair: Dùng SHA-256 cam kết và SHA-512 kết hợp thuật toán Fisher-Yates để phân bổ bom ngẫu nhiên.<br>- Công thức tính hệ số Hypergeometric với **RTP chuẩn 97%**:<br>  $$\text{Multiplier}(k) = \left\lfloor 0.97 \times \prod_{i=0}^{k-1} \left(\frac{25 - i}{25 - M - i}\right) \times 100 \right\rfloor / 100$$<br>- Cho phép **Rút tiền ngay (Cash Out)** bất cứ lúc nào sau khi mở ít nhất 1 ngôi sao an toàn. |
| **`GoalsEngine.ts` & `GoalsView.tsx`** | - **Lối chơi Sút Bóng Spribe**: 3 kích thước sân (Nhỏ 3x4, Vừa 4x7, Lớn 5x10).<br>- Mỗi cột luôn ẩn đúng 1 quả bom cản phá. Người chơi chọn 1 hàng trong cột để sút bóng qua.<br>- Cấp số nhân lũy tiến: $\text{Multiplier}(k) = \lfloor 0.97 \times (R / (R - 1))^k \times 100 \rfloor / 100$.<br>- Sút bóng an toàn qua từng cột để nhân thưởng, hỗ trợ Cash Out bất kỳ lúc nào. |
| **`CasinoEngine.ts` & `fair.ts` (6 game kiểu Rainbet)** | - **Roulette châu Âu 0–36**: đỏ/đen/lẻ/chẵn/cao/thấp ăn 1:1.95, cược số ăn 35:1, vòng quay animation dừng đúng ô.<br>- **Aviator**: vòng chung live (chờ 8s → bay tick 100ms → nổ), cược 1 lần/vòng, rút tay theo hệ số, lịch sử nổ.<br>- **Chicken Cross**: 3 độ khó (Dễ 12%/làn, Vừa 20%, Khó 30%), 10 làn hệ số tăng dần, rút bất cứ lúc nào sau ≥1 làn.<br>- **Hi-Lo**: đoán lá tiếp cao/thấp hơn, hệ số theo xác suất (biên 0.97), nối dây nhân thưởng, hòa tính thua.<br>- **Coinflip** (sấp/ngửa 1:1.95) và **RPS** (thắng 1:1.95, hòa hoàn tiền).<br>- Tất cả dùng SHA-256 commit/reveal (`seedHash` công khai trước, `serverSeed` lộ sau), cược 10–5.000 🪙, bắt buộc đăng nhập. |

---

### E. Giao Diện Điều Hướng & Đa Người Chơi (Dashboard & Multiplayer)

| Tên Module / File | Vai Trò & Tác Dụng |
| :--- | :--- |
| **`DashboardView.tsx` (Navigation Panel)** | - Trung tâm điều hướng mọi dịch vụ thay thế sảnh chờ cũ (slug `/dashboard`).<br>- Hiển thị thẻ card game lớn, sinh động kèm tag phân loại (Multiplayer, Live Casino, Solo, Kiếm Tiền).<br>- Khung chung `AppShell` (header, tab nav, bottom stats) dùng chung cho `/dashboard`, `/play`, `/room`, `/hustle`, `/leaderboard` — đồng nhất theme Dashboard (`gray-900`).<br>- Tích hợp thông tin tài khoản, ví coins và nút chuyển chế độ linh hoạt. |
| **`PlayView` / `RoomView` (`LobbyView.tsx`, slugs `/play`, `/room/:roomId`, `/room-id?id=`)** | - Tạo/vào phòng đấu theo mã phòng 6 ký tự, deep-link `/room/ABC123` hoặc `/room-id?id=ABC123`.<br>- **Phòng luôn tính phí**: chọn cược bắt buộc 10–5.000 🪙 (mặc định 50) ngay lúc tạo phòng; server chặn ván free. |
| **`RoomManager.ts` & Game Engines** | - Quản lý phòng chờ, cơ chế ghép cặp người thật và AI Bot tự động.<br>- Hỗ trợ luật chơi bài chuyên sâu: UNO (Stacking, No Mercy +8, Flex flip), Tiến Lên (chặt Heo, gợi ý bộ bài), Mèo Nổ (mở rộng sức chứa 5–10 người theo bản mở rộng).<br>- Cơ chế cược phòng bắt buộc: `MIN_ROOM_BET=10`, `MAX=5000`, `DEFAULT=50` (`sanitizeRoomBet()`); trừ tiền cược khi bắt đầu và chia pot cho người thắng cuộc. |

---

## 4. LUỒNG DỮ LIỆU & BẢO MẬT (DATA FLOW & SECURITY)

1. **Bảo mật kết quả (Server-Authoritative)**:
   - Toàn bộ kết quả xúc xắc (Tài Xỉu), vị trí bom (Mines, Goals) đều được sinh và lưu trữ bí mật tại Server.
   - Client tuyệt đối không thể đọc trước vị trí bom hoặc can thiệp điểm số qua DevTools.
2. **Minh bạch hóa (Provably Fair Verification)**:
   - Trước mỗi lượt chơi/phiên cược, chuỗi băm (SHA-256 hoặc MD5) của hạt giống được gửi về Client.
   - Khi kết thúc lượt, hạt giống nguyên bản được công khai để người chơi tự kiểm chứng lại trên các công cụ băm tiêu chuẩn.
3. **Đồng bộ thời gian thực (Low Latency)**:
   - Các biến động cược và chuyển pha của Tài Xỉu được phát sóng theo nhóm phòng Socket (`taixiu-room`) giúp tối ưu hiệu năng băng thông máy chủ.

---

## 5. THIẾT KẾ GIAO DIỆN & PHONG CÁCH HIỂN THỊ (DESIGN SYSTEM & STYLES)

Giao diện của **OmniDeck Arena** được xây dựng theo phong cách **Dark Gaming / Cyber Casino hiện đại**, kết hợp giữa tính thẩm mỹ cao cấp (Sleek Glassmorphism) và khả năng phản hồi trực quan (Micro-interactions):

### A. Bảng Màu Chủ Đạo (Color Palette)
- **Nền tảng chính (Base Background)**:
  - Deep Space Slate (`#020617` - `bg-slate-950` / `bg-gray-950`): Tối ưu độ tương phản, giúp mắt dễ chịu khi chơi game ban đêm.
  - Phủ gradient tinh tế theo từng chủ đề: Tím đêm cho Tài Xỉu (`via-purple-950/20`), Xanh ngọc cho Mines (`via-cyan-950/10`), Xanh sân cỏ cho Goals (`via-green-950/10`).
- **Màu Bàn Đấu (Gaming Table Theme)**:
  - `table.dark` (`#0d2818`): Nền bàn sẫm.
  - `table.felt` (`#165b33`): Mặt nỉ xanh chuẩn sòng bài casino quốc tế.
  - `table.wood` (`#3e1f0c`) & `table.gold` (`#e0a96d`): Viền gỗ mun và kim loại mạ vàng sang trọng.
- **Màu Thẻ Bài UNO & Casino**:
  - Đỏ rực (`uno.red`: `#ff5555`, cửa Tài: `#dc2626`).
  - Xanh nước biển (`uno.blue`: `#00aaee`, cửa Xỉu: `#2563eb`).
  - Xanh lá cây (`uno.green`: `#55aa55`, ô Sao an toàn: `#16a34a`).
  - Vàng hổ phách (`uno.yellow`: `#ffaa00`, cửa Bão & Vàng Coin: `#f59e0b`).
  - Đen bóng (`uno.dark`: `#1e293b`).

### B. Nghệ Thuật Chữ (Typography)
- **Font chữ chính (`font-sans`)**: Kết hợp giữa **`"Be Vietnam Pro"`** và **`"Plus Jakarta Sans"`**.
  - Tối ưu hiển thị tiếng Việt có dấu chuẩn xác 100%, không bị lỗi nhảy dòng hoặc co kéo ký tự.
  - Thiết kế bo tròn nhẹ hiện đại, độ dày (Font Weight) đa dạng từ `font-medium`, `font-semibold` đến `font-extrabold`.
- **Hiệu ứng chữ nổi (Display & Badges)**:
  - Gradient Text (`bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-500`): Dành cho số dư Coins và các danh hiệu người chơi.
  - Font số Monospace (`font-mono`): Sử dụng cho mã băm MD5, chuỗi Provably Fair Seed và thời gian đếm ngược.

### C. Ngôn Ngữ Hiệu Ứng & Chuyển Động (Glassmorphism & Micro-animations)
- **Hiệu ứng Kính Mờ (Glassmorphism)**:
  - Sử dụng kết hợp `backdrop-blur-md`, `bg-gray-900/60`, và viền sáng mỏng `border border-white/10`.
  - Giúp các thẻ bài và hộp thoại nổi khối rõ rệt trên nền bàn đấu.
- **Hoạt ảnh Framer Motion (Micro-interactions)**:
  - **Lướt thẻ bài (Card Hover)**: `whileHover={{ scale: 1.03, y: -4 }}` kèm vầng sáng tỏa màu (`shadow-lg shadow-amber-500/20`).
  - **Nặn Đĩa Xúc Xắc (Drag-to-reveal)**: Kéo vuốt tự do theo trục tọa độ không gian 2D với lực đàn hồi vật lý (`dragConstraints`, `type: "spring"`).
  - **Lật Ô Mìn (Tile Flip & Shake)**: Hiệu ứng phóng đại nảy nhẹ khi trúng Sao (`scale: [1, 1.2, 1]`) và rung lắc chấn động khi nổ Bom (`x: [-10, 10, -5, 5, 0]`).
  - **Dải Nhịp Đập Cảnh Báo (Pulsing Glow)**: Nút Rút Tiền (Cash Out) và Nút Nhận Việc nhấp nháy ánh sáng theo nhịp thở để thôi thúc tương tác.

### D. Tùy Biến Trải Nghiệm Người Dùng (UX Customization) & Khung Chung (AppShell)
- **Khung chung Navigation Panel (`AppShell.tsx`)**: **thanh điều hướng DỌC** bên trái (icon + label, thu gọn icon trên mobile), bỏ tab Bài Lá trùng lặp; bottom stats gộp vào chân sidebar; tokens Dashboard (`from-gray-900 via-gray-800`, `bg-gray-900/60`, `border-gray-700/50`) cho mọi tab panel — Vào Phòng Đấu không còn lạc theme slate-indigo.<br>- **Navigation Panel (`/dashboard`)**: đầu trang hiện 2 bảng **Top Giàu Coins** (`/api/leaderboard?gameType=money`) và **Top Thắng Ván** song song, bấm vào sang `/leaderboard` chi tiết.
- **Thanh cuộn siêu mỏng (Custom Minimal Scrollbar)**:
  - Rộng chỉ 6px, nền mờ và thanh trượt Indigo mờ bo tròn mềm mại (`rounded-full`), không phá vỡ bố cục tổng thể.
- **Tối ưu hóa chống mỏi tay & Chống bôi đen vô ý (`user-select: none`)**:
  - Khóa chọn văn bản mặc định toàn bộ trang web để đảm bảo việc click chuột lia lịa khi chơi game bài hoặc nặn đĩa không bị bôi xanh văn bản phản cảm.
