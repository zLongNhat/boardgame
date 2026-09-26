# 📘 TÀI LIỆU CẤU TRÚC VÀ WORKFLOW HỆ THỐNG — OMNIDECK ARENA
> **Dành cho:** Kỹ sư phát triển, Lập trình viên mới tiếp nhận dự án (Onboarding Guide).  
> **Phiên bản:** OmniDeck Arena v2.5 (Boardgames, Casino Provably Fair, CS2 Case Opening & SkinClub Upgrade).  
> **Cập nhật:** 24/09/2026.

---

## 📑 MỤC LỤC
1. [Tổng Quan Hệ Thống (System Overview)](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc Kỹ Thuật (Technical Architecture)](#2-kiến-trúc-kỹ-thuật)
3. [Cấu Trúc Thư Mục Toàn Dự Án (Directory Structure)](#3-cấu-trúc-thư-mục-toàn-dự-án)
4. [Các Workflow Hoạt Động Cốt Lõi (Core Workflows)](#4-các-workflow-hoạt-động-cốt-lõi)
   - [Workflow 1: Xác Thực & Phiên Người Dùng (Auth & Session)](#workflow-1-xác-thực--phiên-người-dùng)
   - [Workflow 2: Hệ Thống Tiền Tệ & Giao Dịch (Virtual Economy)](#workflow-2-hệ-thống-tiền-tệ--giao-dịch)
   - [Workflow 3: Trung Tâm Đi Làm Kiếm Tiền (Work Center)](#workflow-3-trung-tâm-đi-làm-kiếm-tiền)
   - [Workflow 4: Đấu Trường Game Bài Multiplayer (UNO, Mèo Nổ, Tiến Lên)](#workflow-4-đấu-trường-game-bài-multiplayer)
   - [Workflow 5: Casino Minigames Provably Fair (Tài Xỉu MD5, Mines, Goals...)](#workflow-5-casino-minigames-provably-fair)
   - [Workflow 6: Mở Hòm Vũ Khí CS2 (Case Opening)](#workflow-6-mở-hòm-vũ-khí-cs2)
   - [Workflow 7: Hệ Thống Kho Đồ (Inventory System)](#workflow-7-hệ-thống-kho-đồ)
   - [Workflow 8: Nâng Cấp SkinClub (Upgrade Game)](#workflow-8-nâng-cấp-skinclub)
5. [Bảng Tra Cứu Giao Tiếp Real-time (Socket.IO & REST APIs)](#5-bảng-tra-cứu-giao-tiếp-real-time)
6. [Hướng Dẫn Cài Đặt, Kiểm Thử & Mở Rộng (Developer Guide)](#6-hướng-dẫn-cài-đặt-kiểm-thử--mở-rộng)

---

## 1. TỔNG QUAN HỆ THỐNG

**OmniDeck Arena** là một nền tảng giải trí trực tuyến thời gian thực đa người chơi (Real-time Multiplayer) kết hợp minigames cá cược minh bạch (Provably Fair) và hệ sinh thái kinh tế ảo khép kín:
- **Game Bài Đa Người Chơi**: UNO (Classic / No Mercy / Flex, hỗ trợ Universal Stacking), Mèo Nổ - Exploding Kittens (kèm 3 bản mở rộng Imploding, Streaking, Barking), Tiến Lên Miền Nam.
- **CS2 & SkinClub System**: Mở 3 hạng hòm súng (Tân Thủ, Chiến Binh, Thượng Cổ), rơi vật phẩm 5 hạng (Trắng, Xanh, Tím, Đỏ, Vàng), Kho đồ (Inventory) bán lại lấy tiền, và trò chơi Nâng Cấp (Upgrade) tùy chỉnh hệ số/thanh trượt tính % thắng.
- **Casino & Minigames**: Tài Xỉu MD5 (bát 3D, soi cầu), Mines 5x5, Goals, Roulette Châu Âu, Aviator Crash, Chicken Cross, Hi-Lo, Coinflip, Kéo Búa Bao.
- **Kinh Tế & Làm Việc**: Kiếm xu tự động qua gõ phím chống sao chép (không cooldown, +1,000 🪙/lượt), cược phòng PVP nhân thưởng x15–x30.

---

## 2. KIẾN TRÚC KỸ THUẬT

```
                                 [Trình Duyệt Khách Hàng (Browser Client)]
                                       React 18 + Vite + Tailwind CSS
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │ HTTP REST API (/api/...)                                    │ WebSockets (Socket.IO)
                       ▼                                                             ▼
         ┌──────────────────────────┐                                  ┌──────────────────────────┐
         │     Express Router       │                                  │ Socket Event Dispatcher  │
         │ - Auth & User Profile    │                                  │ - Game Action Router     │
         │ - Case & Inventory APIs  │                                  │ - Room Lobby Manager     │
         │ - Leaderboard Queries    │                                  │ - Live Casino Streams    │
         └─────────────┬────────────┘                                  └─────────────┬────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                   ┌──────────────────┴──────────────────┐
                                   │       CORE ENGINE ARCHITECTURE      │
                                   ├─────────────────────────────────────┤
                                   │ • UserManager (Users & Inventory)   │
                                   │ • RoomManager (Lobby, Turn & Bots)  │
                                   │ • BaseGame (State Masking Security) │
                                   │ • CaseEngine (CS2 Tape & RTP 95%)   │
                                   │ • UpgradeEngine (Circular Degree)   │
                                   │ • TaiXiuEngine (MD5 State Machine)  │
                                   │ • MinesEngine & GoalsEngine         │
                                   └──────────────────┬──────────────────┘
                                                      │
                                                      ▼
                                   ┌─────────────────────────────────────┐
                                   │       PERSISTENCE STORAGE           │
                                   │ • data/users.json (File Storage)    │
                                   │ • Upstash Redis Rest (Production)   │
                                   └─────────────────────────────────────┘
```

- **Backend Runtime**: Node.js, Express, Socket.IO, TypeScript.
- **Security & Cheating Prevention**: State-Masking (phía server chỉ gửi cho người chơi những lá bài họ được phép nhìn thấy, giấu bài đối thủ và bài nọc).
- **RTP Fair Mathematical Models**: Mọi game casino và mở hòm đều có mô hình xác suất toán học rõ ràng (RTP chuẩn 95% - 97%).

---

## 3. CẤU TRÚC THƯ MỤC TOÀN DỰ ÁN

```
proj/
├── client/                          # MÃ NGUỒN FRONTEND (React 18 + TypeScript)
│   ├── src/
│   │   ├── components/              # Các UI Component giao diện
│   │   │   ├── auth/                # Modal đăng nhập / đăng ký (AuthModal.tsx)
│   │   │   ├── cases/               # Mở hòm CS2 & Roulette Tape (CaseOpeningView.tsx)
│   │   │   ├── upgrade/             # Vòng quay nâng cấp SkinClub (UpgradeView.tsx)
│   │   │   ├── inventory/           # Kho đồ skin & bán đồ (InventoryView.tsx)
│   │   │   ├── dashboard/           # Trung tâm chọn dịch vụ (DashboardView.tsx)
│   │   │   ├── layout/              # Khung giao diện chính & Sidebar (AppShell.tsx)
│   │   │   ├── lobby/               # Sảnh chờ tạo/vào phòng cược (LobbyView.tsx)
│   │   │   ├── table/               # Bàn chơi game bài chung (TableView.tsx)
│   │   │   ├── uno/                 # Giao diện & lá bài UNO
│   │   │   ├── exploding-kittens/   # Giao diện & hiệu ứng Mèo Nổ
│   │   │   ├── tien-len/            # Giao diện đánh bài Tiến Lên Miền Nam
│   │   │   ├── tai-xiu/             # Bát đĩa 3D, nặn đĩa & soi cầu Tài Xỉu
│   │   │   ├── mines/               # Bàn chơi Dò mìn 5x5 Spribe
│   │   │   ├── goals/               # Bàn sút bóng Goals Spribe
│   │   │   ├── casino/              # 6 Casino minigames (Roulette, Aviator...)
│   │   │   ├── work/                # Gõ phím kiếm tiền chống copy (WorkView.tsx)
│   │   │   └── leaderboard/         # Bảng xếp hạng đại gia & cao thủ
│   │   ├── context/                 # React Context (AuthContext.tsx)
│   │   ├── hooks/                   # Custom Hooks (useGameSocket, GameSocketContext)
│   │   ├── i18n/                    # Đa ngôn ngữ Việt / Anh (dict.ts, LanguageContext)
│   │   ├── pages/                   # Trang định tuyến theo URL (DashboardPage, CasesPage...)
│   │   ├── types/                   # Khai báo TypeScript types toàn bộ client (game.ts)
│   │   └── App.tsx                  # Khởi tạo React Router DOM & bọc Providers
│   └── vite.config.ts               # Cấu hình Vite bundler & reverse proxy
│
├── server/                          # MÃ NGUỒN BACKEND (Node.js + Socket.IO)
│   ├── src/
│   │   ├── auth/                    # Quản lý User, mật khẩu, coins, kho đồ (UserManager.ts)
│   │   ├── engines/                 # Logic game engines độc lập
│   │   │   ├── cases/               # CS2 Case Opening (CaseEngine.ts, types.ts)
│   │   │   ├── upgrade/             # SkinClub Upgrade (UpgradeEngine.ts, types.ts)
│   │   │   ├── uno/                 # UNO engine (UnoGame.ts, UnoDeck.ts, rules.ts)
│   │   │   ├── exploding-kittens/   # Mèo Nổ engine & 3 Expansions (ExplodingKittensGame.ts)
│   │   │   ├── tien-len/            # Tiến Lên engine & CardEvaluator (TienLenGame.ts)
│   │   │   ├── tai-xiu/             # Tài Xỉu MD5 state machine (TaiXiuEngine.ts)
│   │   │   ├── mines/               # Dò mìn 5x5 Hypergeometric RTP 97% (MinesEngine.ts)
│   │   │   ├── goals/               # Goals Spribe engine (GoalsEngine.ts)
│   │   │   ├── casino/              # 6 Minigames (Roulette, Aviator, Chicken, HiLo...)
│   │   │   ├── work/                # Gõ chữ 3s kiếm coins (WorkManager.ts)
│   │   │   ├── base/                # Abstract class BaseGame (phân lượt, ngắt kết nối...)
│   │   │   └── bots/                # AI Bots tự động đánh khi thiếu người (BotController.ts)
│   │   ├── rooms/                   # Quản lý phòng chơi, cược phòng, hoàn tiền (RoomManager.ts)
│   │   ├── sockets/                 # Socket.IO Event Handlers trung tâm (gameHandlers.ts)
│   │   ├── storage/                 # Đồng bộ Redis & Fallback file JSON (redisRest.ts)
│   │   └── server.ts                # Entrypoint khởi tạo Express & Socket.IO server
│   └── data/                        # Thư mục chứa JSON database (users.json, sessions.json)
```

---

## 4. CÁC WORKFLOW HOẠT ĐỘNG CỐT LÕI

### Workflow 1: Xác Thực & Phiên Người Dùng
1. **Đăng Ký (`/api/auth/register`)**:
   - Mật khẩu được băm qua `crypto.pbkdf2` kèm `salt` 16 bytes ngẫu nhiên.
   - Tài khoản mới tự động nhận **500 coins** khởi tạo để trải nghiệm game.
2. **Đăng Nhập (`/api/auth/login`)**:
   - Kiểm tra hash mật khẩu, sinh Bearer Token lưu tại `data/sessions.json` (hoặc Redis).
   - Trả về đối tượng `PublicUser` bao gồm số dư `balance` và mảng `inventory`.
3. **Chế Độ Khách (Guest Mode)**:
   - Người chơi không cần đăng nhập vẫn có thể tạo phòng chơi thử nghiệm các game bài hoặc xem casino. Tuy nhiên, khách không có số dư tiền thật và không được nhận tiền thắng.

---

### Workflow 2: Hệ Thống Tiền Tệ & Giao Dịch
1. **Quản lý Số Dư Centralized (`UserManager.ts`)**:
   - `addBalance(userId, amount, reason)`: Tăng coins và ghi nhật ký giao dịch.
   - `deductBalance(userId, amount, reason)`: Kiểm tra `balance >= amount`, khấu trừ an toàn (ngăn chặn số âm).
2. **Đồng Bộ Real-time Không Cần Tải Lại Trang**:
   - Khi có bất kỳ giao dịch nào (thắng game, cược hòm, bán đồ), Server phát sự kiện:
     ```typescript
     socket.emit('balance_updated', { balance: newBalance });
     ```
   - Client bắt sự kiện và cập nhật trực tiếp `user.balance` trên thanh Header ngay lập tức.

---

### Workflow 3: Trung Tâm Đi Làm Kiếm Tiền
1. **Yêu cầu từ vựng (`work:request-word`)**:
   - `WorkManager` **không áp cooldown** — làm liên tục, xong lượt nào ra từ mới ngay.
   - Chọn ngẫu nhiên 1 từ trong kho hơn 200 từ vựng song ngữ (tiếng Việt có dấu và tiếng Anh).
   - Cấp hạn chót 15 giây để gõ.
2. **Gửi kết quả (`work:submit-word`)**:
   - So khớp chuỗi ký tự chuẩn hóa (lowercase, trim).
   - Nếu đúng 100%: Cộng ngay **+1,000 coins** vào ví, từ mới hiện ngay không cần chờ.
3. **Cơ Chế Chống Gian Lận (Anti-Copy Protection)**:
   - Chặn chuột phải, cấm bôi đen văn bản (`user-select: none`).
   - Chặn dán phím tắt `Ctrl+V`, chặn sự kiện `onPaste`.
   - Tự động duy trì con trỏ gõ (`focus`) liên tục không cần click chuột lại.

---

### Workflow 4: Đấu Trường Game Bài Multiplayer
1. **Khấu Trừ Cược Trước (Upfront Bet Deduction)**:
   - Khi tạo phòng (`create_room`), chủ phòng bị trừ tiền cược `betAmount` ngay lập tức.
   - Khi người chơi khác tham gia (`join_room`), hệ thống kiểm tra và trừ tiền cược ngay tại cửa phòng. Nếu không đủ tiền sẽ bị từ chối vào.
   - Thẻ người chơi trong sảnh chờ hiển thị huy hiệu xác nhận đã nộp cược `X 🪙`.
2. **Cơ Chế Hoàn Tiền Công Bằng (Refund)**:
   - Người chơi rời phòng hoặc bị chủ phòng đuổi (kick) trước khi trận bắt đầu sẽ được **hoàn trả 100% tiền cược** ngay tức thì.
   - Nếu phòng bị giải tán, tất cả người chơi còn lại đều nhận lại đủ tiền.
3. **Bảo Mật State Masking**:
   - `BaseGame.getMaskedState(playerId)`: Bài nọc và bài của người khác trên tay được ẩn thành các thẻ úp. Client hoàn toàn không thể xem trộm bài đối phương qua DevTools.
4. **Trả Thưởng Người Thắng Gấp 15 – 30 Lần**:
   - Khi ván đấu kết thúc (`onGameOver`), Server sinh hệ số ngẫu nhiên từ **15x đến 30x**:
     $$\text{Tiền Thưởng} = \text{Mức cược phòng} \times \text{Multiplier (15-30)}$$
   - Tiền thưởng chia cho các người thắng đã đăng nhập, thông báo trên kênh chat và tự động cập nhật bảng xếp hạng.

---

### Workflow 5: Casino Minigames Provably Fair
1. **Tài Xỉu MD5 (Live Dice Casino)**:
   - Chạy vòng lặp máy trạng thái 24/7: Cược (30s) ➜ Lắc bát (5s) ➜ Mở bát & Trả thưởng (15s).
   - **MD5 Cam Kết Trước**: Trước khi cược, Server tạo chuỗi `${d1}-${d2}-${d3}-${serverSeed}` và phát mã băm MD5 công khai. Sau khi mở bát, Server công khai chuỗi gốc để người chơi tự kiểm tra tính minh bạch.
   - Xúc xắc 3D tính số theo mặt trên cùng.
2. **Mines & Goals (Spribe Mechanics)**:
   - Sử dụng thuật toán SHA-256 cam kết kết hợp SHA-512 + thuật toán xáo bài Fisher-Yates.
   - RTP chuẩn 97%. Người chơi được phép **Cash Out (Rút Tiền)** bất kỳ lúc nào để bảo toàn lợi nhuận.

---

### Workflow 6: Mở Hòm Vũ Khí CS2
1. **6 Hạng Hòm Theo Kinh Tế Người Chơi (41–42 skins/hòm, RTP ~95%)**:
   - **Hòm Tân Thủ**: 5,000 🪙
   - **Hòm Chiến Binh**: 25,000 🪙
   - **Hòm Thượng Cổ**: 100,000 🪙
   - **Hòm Rồng Hoàng Kim (Immortal)**: 1,000,000 🪙
   - **Hòm Huyền Thoại (Legendary)**: 10,000,000 🪙
   - **Hòm Chí Tôn (Mythic)**: 100,000,000 🪙
   - Mỗi hòm ~41 skins đủ 8 loại vũ khí (Pistol/SMG/Shotgun/Rifle/Sniper/Machinegun/Knife/Gloves).
   - Chế độ quay x1/x3/x5/x10 vòng cùng lúc (`cases:open-multi`); thi đấu Case Battle tối đa 50 hòm/trận.
2. **5 Cấp Độ Hiếm (Rarity)**:
   - ⚪ **Trắng (Phổ thông - 54%)**: Giá trị $0.3\times - 0.6\times$ giá hòm.
   - 🔵 **Xanh (Hiếm - 28%)**: Giá trị $0.7\times - 0.8\times$ giá hòm.
   - 🟣 **Tím (Cao cấp - 12%)**: Giá trị $1.6\times - 1.7\times$ giá hòm.
   - 🔴 **Đỏ (Thần thoại - 5%)**: Giá trị $4\times - 4.5\times$ giá hòm.
   - 🟡 **Vàng (Dao đặc biệt - 1%)**: Giá trị $15\times - 20\times$ giá hòm.
3. **Mô Hình Tự Cân Bằng (Mathematical Self-Balanced RTP 95%)**:
   - Kỳ vọng toán học $E(X) = 0.54 \times V_{\text{trắng}} + 0.28 \times V_{\text{xanh}} + 0.12 \times V_{\text{tím}} + 0.05 \times V_{\text{đỏ}} + 0.01 \times V_{\text{vàng}} = 0.95 \times \text{Giá hòm}$.
4. **Băng Chuyền Roulette (CS2 Tape Animation)**:
   - Server sinh dải băng 35 vật phẩm (vật phẩm trúng nằm tại vị trí index 30).
   - Client trượt dải băng với gia tốc chuyển động mềm (`cubic-bezier(0.12, 0.8, 0.2, 1)`) kéo dài 5.5s kèm âm thanh nhấp chuột (tick audio), dừng chính xác tại vạch kim vàng ở giữa.

---

### Workflow 7: Hệ Thống Kho Đồ
1. **Lưu Trữ Trong Profile Người Dùng**:
   - Vật phẩm trúng từ mở hòm tự động cấp vào `user.inventory`.
   - Mỗi vật phẩm có ID duy nhất (`UUID`), tên skin, độ hiếm, giá trị coins và icon.
2. **Bán Lại Lấy Tiền Mặt (Sell Items)**:
   - Người chơi có thể bấm "Bán" từng món hoặc "Bán Tất Cả" (Sell All) để đổi toàn bộ kho đồ thành coins nạp thẳng vào số dư tức thời.
3. **Liên Kết Nâng Cấp (Upgrade Link)**:
   - Nút "Nâng Cấp" trên từng vật phẩm cho phép chuyển nhanh sang phòng Nâng Cấp để dùng item đó làm tiền cược.

---

### Workflow 8: Nâng Cấp SkinClub
1. **Lựa Chọn Tiền Cược**:
   - Có thể cược trực tiếp bằng tiền xu (tối thiểu 10 🪙, **không giới hạn trần**, có nút **ALL IN** toàn bộ số dư) **HOẶC** chọn một vật phẩm trong kho đồ.
2. **Chọn Mục Tiêu Nâng Cấp**:
   - Người chơi có thể gõ trực tiếp số tiền thưởng mong muốn hoặc kéo **thanh trượt hệ số nhân** (từ 1.1x đến 50x).
3. **Tính Toán Tỉ Lệ Trúng (% Win Chance)**:
   $$\text{Win Chance \%} = \min\left(85\%, \max\left(1\%, \frac{\text{Tiền Cược}}{\text{Tiền Mục Tiêu}} \times 95\%\right)\right)$$
4. **Vòng Quay 360 Độ SkinClub**:
   - Vòng tròn SVG hiển thị cung trúng thưởng sáng rực rỡ có độ rộng tương ứng với % thắng.
   - Cho phép chọn vùng thắng "Roll Dưới" (0 đến Win Chance) hoặc "Roll Trên" (100 - Win Chance đến 100).
   - Kim quay quét qua nhiều vòng và dừng tại góc độ kết quả. Nếu trúng: nhận đủ tiền mục tiêu; nếu trượt: mất tiền cược/vật phẩm.

---

## 5. BẢNG TRA CỨU GIAO TIẾP REAL-TIME

### Socket.IO Events

| Kênh Sự Kiện | Chiều | Tham Số Đầu Vào | Dữ Liệu Trả Về / Tác Dụng |
| :--- | :---: | :--- | :--- |
| `balance_updated` | Server ➔ Client | `{ balance: number }` | Đồng bộ số dư hiển thị trên header realtime |
| `create_room` | Client ➔ Server | `{ playerName, avatar, userId, betAmount }` | Tạo phòng và trừ cược upfront của chủ phòng |
| `join_room` | Client ➔ Server | `{ roomId, playerName, avatar, userId }` | Vào phòng và trừ cược upfront của người chơi |
| `leave_room` | Client ➔ Server | `{ roomId, playerId }` | Rời phòng, hoàn trả tiền cược nếu chưa bắt đầu |
| `remove_bot` | Client ➔ Server | `{ roomId, targetPlayerId }` | Kick bot/người chơi, hoàn cược nếu chưa bắt đầu |
| `cases:get` | Client ➔ Server | `none` | Lấy danh sách 3 loại hòm và các skin |
| `cases:open` | Client ➔ Server | `{ userId, caseId }` | Khấu trừ tiền, quay dải roulette, thêm item vào kho |
| `inventory:get` | Client ➔ Server | `{ userId }` | Lấy danh sách vật phẩm đang sở hữu trong kho |
| `inventory:sell` | Client ➔ Server | `{ userId, itemId }` | Bán 1 vật phẩm, cộng tiền coins vào tài khoản |
| `inventory:sell-all`| Client ➔ Server | `{ userId }` | Bán toàn bộ vật phẩm trong kho một lần |
| `upgrade:play` | Client ➔ Server | `{ userId, betType, betAmount, itemInstanceId, targetValue, rollDirection }` | Quay vòng tròn nâng cấp, trả thưởng theo tỉ lệ trúng |
| `work:request-word`| Client ➔ Server | `{ userId, lang }` | Lấy từ vựng (không cooldown) |
| `work:submit-word` | Client ➔ Server | `{ userId, word }` | Nộp từ, kiểm tra đúng 100% thưởng +10 coins |
| `taixiu:join` | Client ➔ Server | `none` | Đăng ký theo dõi phiên Tài Xỉu trực tiếp |
| `taixiu:place-bet` | Client ➔ Server | `{ userId, displayName, betType, amount }` | Đặt cược Tài hoặc Xỉu |

### REST API Endpoints

| Phương Thức | Đường Dẫn | Chức Năng |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản (tặng 500 coins) |
| `POST` | `/api/auth/login` | Đăng nhập tài khoản |
| `POST` | `/api/auth/logout` | Đăng xuất, thu hồi phiên |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện tại kèm số dư và kho đồ |
| `GET` | `/api/cases` | Lấy danh sách các hòm vũ khí CS2 |
| `GET` | `/api/inventory` | Lấy kho đồ của người dùng (kèm Bearer Token) |
| `GET` | `/api/leaderboard?gameType=all` | Lấy bảng xếp hạng theo game hoặc top đại gia |
| `GET` | `/api/tai-xiu/history` | Lấy lịch sử 100 phiên Tài Xỉu gần nhất |

---

## 6. HƯỚNG DẪN CÀI ĐẶT, KIỂM THỬ & MỞ RỘNG

### 1. Khởi Động & Build Hệ Thống

```bash
# Cài đặt thư viện:
cd server && npm install
cd ../client && npm install

# Kiểm tra Unit Tests (18 test cases cho UNO, Mèo Nổ, Tiến Lên):
cd server && npm test

# Build mã nguồn production:
cd server && npm run build
cd ../client && npm run build

# Khởi chạy server production (Cổng mặc định 3000):
cd server
node dist/server.js
```

### 2. Quy Trình Thêm Một Game Mới Vào Dự Án
Khi muốn bổ sung một trò chơi mới (ví dụ: Blackjack hoặc Slot Machine):
1. **Tạo Engine độc lập trong `server/src/engines/<game-name>/`**:
   - Kế thừa `BaseGame` nếu là game phòng nhiều người, hoặc tạo Engine độc lập nhận tham chiếu `UserManager` nếu là minigame solo.
2. **Đăng ký sự kiện trong `server/src/sockets/gameHandlers.ts` và `server.ts`**:
   - Đăng ký các sự kiện socket nhận cược và trả thưởng qua `userManager.deductBalance` và `userManager.addBalance`.
3. **Tạo Component hiển thị trong `client/src/components/<game-name>/`**:
   - Kết nối với `useGameSocketContext()` và hiển thị trên Navigation Bar tại `AppShell.tsx` và `DashboardView.tsx`.
4. **Đăng ký Route trong `client/src/App.tsx`**.
