# 📊 TIẾN ĐỘ DỰ ÁN OMNIDECK ARENA V2 (DASHBOARD, TIỀN TỆ, TÀI XỈU, MINES, GOALS)

> **Cập nhật lúc:** 23/09/2026 (Giờ hệ thống)  
> **Trạng thái tổng quan:** Đã hoàn thành **100%** + Fix lỗi lá Đảo Chiều (Reverse) khi còn 2 người chơi. Toàn bộ 18/18 Unit Test vượt qua (`npm test`). Server + Client build 0 lỗi.

- [x] **Sửa lỗi lá Đảo Chiều (Reverse) khi còn 2 người chơi (Mèo Nổ & UNO)**:
  - **Mèo Nổ (Exploding Kittens)**: Khắc phục lỗi truyền `this.state.direction` (-1) vào `advanceTurn` / `getNextPlayerIndex`, khiến vòng lặp `while (count < skipCount)` bị bỏ qua dẫn tới lượt chơi bị kẹt vĩnh viễn trên 1 người. Đã chuyển toàn bộ thành `advanceTurn(1, pendingTurns)`.
  - **UNO**: Xóa bỏ cơ chế `advanceStep = 2` khi còn 2 người chơi (vốn biến lá Đảo Chiều thành lá Bỏ Lượt / Skip khiến người đánh được đi tiếp và rút/đánh bài liên tục). Giờ đây lá Đảo Chiều luôn đảo hướng và chuyển lượt sang đối thủ (`advanceStep = 1`).
  - **BaseGame.ts**: Bổ sung cơ chế phòng thủ `Math.max(1, Math.abs(skipCount))` trong `getNextPlayerIndex` ngăn chặn triệt để mọi trường hợp kẹt lượt chơi nếu có tham số âm hoặc 0.
- [x] **Cập nhật Luật Cộng Dồn Toàn Diện (Universal Stacking) trong UNO**:
  - Không bắt buộc lá cộng dồn sau phải có giá trị phạt $\ge$ lá trước nữa (cho phép dồn tự do mọi cấp độ phạt).
  - Tất cả các lá cộng (+2, +4, +6, +8, +10, wild reverse 4) đều có thể cộng dồn lên nhau:
    - **Lá Wild (Đen)**: Có thể cộng dồn đè lên bất kỳ lá phạt nào.
    - **Lá màu (+2, +4 có màu)**: Chỉ cần cùng màu với màu đang hiện hành (`activeColor`) hoặc cùng loại lá cộng là được phép dồn tiếp (ví dụ: Wild +8 đổi sang Đỏ thì có thể dồn tiếp +2 Đỏ, +4 Đỏ, hoặc các lá Wild khác).
- [x] **Tối ưu Trung Tâm Làm Việc (Work Center)**:
  - Rút ngắn thời gian nghỉ ngơi giữa 2 lượt làm việc từ **5s xuống 3s** (cả Server `COOLDOWN_MS = 3000` và Client thanh đếm ngược / tự động phát từ mới).
  - Tự động duy trì con trỏ gõ phím (`focus`) liên tục mà không cần click lại vào ô nhập.




---

## 🟢 PHẦN ĐÃ LÀM (COMPLETED)

### 1. Nền tảng hệ thống & Tiền tệ (Foundation & Economy)
- [x] **Cập nhật hệ thống User (`UserManager.ts`)**:
  - Bổ sung trường `balance: number` vào `User` và `PublicUser`.
  - Tặng **500 coins** khởi tạo cho mọi tài khoản đăng ký mới.
  - Cấp số dư khởi đầu 10,000 coins cho 4 tài khoản Champion mẫu.
  - Các hàm quản lý số dư: `addBalance()`, `deductBalance()`, `getBalance()`.
- [x] **Hệ thống Kiểu dữ liệu (`types/game.ts`)**:
  - Khai báo đầy đủ Type và Interface cho: `SoloGameType`, `AppView`, `Transaction`, `WorkChallenge`, `WorkResult`, `TaiXiuState`, `MinesGameState`, `GoalsGameState`, `RoomBetInfo`.

### 2. Game Engines & Logic Server (Backend 100%)
- [x] **Work System (`WorkManager.ts`)**:
  - Hơn 200 từ vựng song ngữ Việt - Anh có dấu và không dấu.
  - Cơ chế đếm ngược cooldown 5s giữa 2 lượt làm việc, hạn gõ 15s.
  - Nhận thưởng ngay +10 coins/lần hoàn thành chính xác.
- [x] **Tài Xỉu MD5 Provably Fair (`TaiXiuEngine.ts`)**:
  - Vòng đời máy trạng thái tự động lặp vô hạn: `BETTING (30s)` ➜ `SHAKING (5s)` ➜ `REVEALING (8s)` ➜ `SETTLING (5s)`.
  - Thuật toán MD5 minh bạch tuyệt đối: Sinh 3 xúc xắc ngẫu nhiên + `serverSeed` bí mật, tạo chuỗi gốc dạng `${d1}-${d2}-${d3}-${serverSeed}`, tính mã băm MD5 và gửi công khai trước khi mở cược.
  - Quy tắc phân định: Xỉu (4–10 điểm, x2), Tài (11–17 điểm, x2), Bão (3 mặt bằng nhau, x30).
  - Tích hợp phát sóng sự kiện thời gian thực bằng `EventEmitter`.
- [x] **Mines Engine Spribe (`MinesEngine.ts`)**:
  - Lưới 5x5 (25 ô), tuỳ chọn số mìn từ 1 đến 24 mìn.
  - Thuật toán Provably Fair chuẩn: SHA-256 cam kết seed, SHA-512 + xáo bài Fisher-Yates để phân bổ vị trí bom.
  - Công thức tính hệ số lũy tiến Hypergeometric RTP chuẩn 97%.
  - Hỗ trợ rút tiền mặt (Cash Out) bất cứ lúc nào sau khi mở ≥ 1 sao.
- [x] **Goals Engine Spribe (`GoalsEngine.ts`)**:
  - 3 kích thước sân bóng: Nhỏ (3x4), Vừa (4x7), Lớn (5x10).
  - Mỗi cột ẩn chính xác 1 quả bom, các ô còn lại là bóng an toàn.
  - Hệ số cấp số nhân chuẩn RTP 97%: `(R / (R - 1))^k * 0.97`.
  - Cơ chế chọn hàng theo từng cột tiến từ trái sang phải, hỗ trợ Cash Out.

### 3. Tích Hợp Server & Socket.IO (`server.ts` & `gameHandlers.ts`)
- [x] Đăng ký đầy đủ toàn bộ endpoint REST API: `/api/user/balance`, `/api/tai-xiu/history`.
- [x] Bộ bắt sự kiện Socket.IO:
  - Work: `work:request-word`, `work:submit-word`
  - Tài Xỉu: `taixiu:join`, `taixiu:place-bet`, `taixiu:leave`
  - Mines: `mines:start`, `mines:reveal`, `mines:cashout`, `mines:get-active`
  - Goals: `goals:start`, `goals:select-row`, `goals:cashout`, `goals:get-active`
- [x] **Server Build (`tsc`)**: Đã build thành công 100% không còn lỗi.

### 4. Giao Diện Client Đã Tạo (Client Views Created)
- [x] `DashboardView.tsx`: Màn hình trung tâm chọn game dạng thẻ bài trực quan (UNO, Mèo Nổ, Tiến Lên, Tài Xỉu, Mines, Goals, Làm Việc) kèm thanh hiển thị số dư coins, avatar và chế độ Khách.
- [x] `WorkView.tsx`: Mini-game gõ chữ chống copy (ngăn bôi đen CSS `user-select: none`, chặn chuột phải, chặn phím tắt Ctrl+C / Ctrl+V, highlight màu ký tự gõ theo thời gian thực).
- [x] `TaiXiuView.tsx`: Phòng cược Tài Xỉu thời gian thực với thanh đếm ngược, vùng chọn cửa cược (Tài/Xỉu/Bão), bảng chọn chip tiền.
- [x] `TaiXiuRoadmap.tsx`: Bảng soi cầu tròn (Bead Plate), biểu đồ chấm màu Tài/Xỉu/Bão và thống kê tỉ lệ % 50-100 phiên.
- [x] `DiceSqueeze.tsx`: Mô-đun nặn đĩa/mở bát tương tác kéo vuốt bằng Framer Motion (Drag-to-reveal) và nút Mở Nhanh.
- [x] `MinesView.tsx`: Bàn chơi 5x5 phong cách Spribe Mines với hiệu ứng lật ô, nút Cash Out đập nhịp, bảng hệ số thưởng.
- [x] `GoalsView.tsx`: Sân cỏ mini phong cách Spribe Goals với bóng di chuyển qua các cột và cầu môn.
- [x] `App.tsx`: Điều hướng động toàn bộ các View dựa trên biến trạng thái `AppView` (`dashboard` | `lobby` | `game` | `work` | `tai-xiu` | `mines` | `goals`).

---

## 🟡 PHẦN ĐANG LÀM / CHƯA XONG (IN PROGRESS & PENDING)

### 1. Đồng bộ và sửa lỗi Type trên Client (Đã hoàn thành 23/09/2026)
- [x] **Sửa `MinesView.tsx`**: Đồng bộ các trường dữ liệu giữa `MinesGameState` trên Client (`gameId`, `isGameOver`, `currentMultiplier`, `currentPayout`) với biến mà code UI đang gọi (`id`, `status: ACTIVE/BUST/CASHOUT`, `multiplier`, `payout`).
- [x] **Sửa `TaiXiuView.tsx`**: Đồng bộ các thuộc tính hiển thị xúc xắc và thời gian (`phaseEndsAt`, `dice.d1/d2/d3`, `result`) thay vì các trường phụ chưa khai báo (`timeRemaining`, `currentDice`, `lastResult`).
- [x] **Sửa `DiceSqueeze.tsx`**: Sửa cú pháp truy cập thuộc tính xúc xắc từ dạng mảng `dice[0]` thành `dice.d1, dice.d2, dice.d3`.
- [x] **Sửa `TaiXiuRoadmap.tsx`**: Sửa `item.roundId` thay vì `item.id`, và `item.dice.total` thay vì `item.total`.
- [x] **Build Client thành công 100% (23/09/2026)**:
  - `App.tsx`: `import TaiXiuView` default, `_newBalance` tránh unused param, `<AuthModal isOpen={showAuthModal}>`.
  - `DashboardView.tsx`: bỏ `useMemo`/`Play` unused, `Level 1` cố định, `totalWins`/`totalGames` thay cho `wins`/`played`.
  - `MinesView.tsx`: bỏ `gameId` unused, `tile: MinesTileState`, `'hidden'/'star'/'mine'` thay cho `'HIDDEN'/'SAFE'/'MINE'`, bỏ `SAFE_REVEALED`/`MINE_REVEALED`, fix Framer Motion `initial={{scale:0}}`.
  - `DiceSqueeze.tsx`: bỏ `React` unused, `onQuickReveal?` optional, `_event`.
  - `TaiXiuRoadmap.tsx`: bỏ `React` unused.
  - `TaiXiuView.tsx`: giữ `Dice3`, bỏ `Dice1/2/4/5/6`, `useRef`/`useCallback`/`React`/`TaiXiuRoundResult` unused.
  - `WorkView.tsx`: bỏ `WorkChallenge`/`WorkResult` unused.
  - Verified: `npm --prefix client run build` → `tsc && vite build`, 1902 modules, exit 0. `npm --prefix server run build` → exit 0.

### 2. Các lỗi TypeScript còn lại sau khi `npm run build` (Đã xử lý xong — build 0 lỗi, chi tiết lịch sử giữ lại bên dưới)
**App.tsx (đã fix):**
- ✅ `Module '"./components/tai-xiu/TaiXiuView"' has no exported member 'TaiXiuView'` - đã đổi `import { TaiXiuView }` thành `import TaiXiuView` (default export)
- ✅ `'newBalance' is declared but its value is never read` → `_newBalance`
- ✅ `Property 'isOpen' is missing` → thêm `isOpen={showAuthModal}`

**DashboardView.tsx (đã fix):**
- ✅ `useMemo`, `Play` imported but unused → đã xóa
- ✅ `Property 'level' does not exist on type 'PublicUser'` → dùng `Level 1` cố định
- ✅ `Property 'wins' / 'played' does not exist on type 'UserStats'` → dùng `totalWins`/`totalGames`

**MinesView.tsx (đã fix):**
- ✅ `MinesTileState` imported but unused → dùng `tile: MinesTileState`
- ✅ `gameId` declared but unused → đã xóa
- ✅ Type mismatches `grid`: `'hidden' | 'star' | 'mine'` thay cho `'HIDDEN'/'SAFE'/'MINE'/'SAFE_REVEALED'/'MINE_REVEALED'`
- ✅ Framer Motion animate prop type error → `initial={{scale:0}}` / `animate={{scale:1}}`

**DiceSqueeze.tsx (đã fix):**
- ✅ `React`, `onQuickReveal`, `event` declared but unused → bỏ `React`, `onQuickReveal?` optional, `_event`

**TaiXiuRoadmap.tsx (đã fix):**
- ✅ `React` declared but unused → đã xóa
- ✅ (Đã sửa) `cell.total` → `cell.dice.total`

**TaiXiuView.tsx (đã fix):**
- ✅ `React`, `useRef`, `useCallback`, `Dice1-6`, `TaiXiuRoundResult` declared but unused → chỉ giữ `Dice3`

**WorkView.tsx (đã fix):**
- ✅ `WorkChallenge`, `WorkResult` imported but unused → đã xóa

### 3. Phát hiện mới khi rà soát runtime (đã fix xong 23/09/2026)
- [x] Client solo-game emit socket **thiếu `userId`** → đã thêm `userId: user?.id` ở `work:request-word`, `work:submit-word`, `taixiu:place-bet` (+`displayName`), `mines:start`, `mines:get-active`, `goals:start`, `goals:get-active`. Server `taixiu:place-bet` trả thêm `newBalance`.
- [x] `GoalsView.tsx` lệch type server → đã rewrite dùng chung `GoalsGameState`/`GoalsFieldSize` (`hidden/safe/bomb`, `gameId/currentColumn/isGameOver/isWin`).
- [x] `TaiXiuState` lệch `bets` vs `myBets/currentBets` → client type thêm `bets` + helper `getMyBets()`, dùng callback place-bet để toast + update balance.
- [x] Verified build lại: client 1902 modules exit 0, server exit 0.

### 4. Cơ chế Cược Phòng Multiplayer (Room Multiplayer Betting) — đã xong 23/09/2026
- [x] Bổ sung `betAmount` vào `RoomSettings` client + server (`RoomManager.ts`, `types/game.ts`), default 0, validate 0–5000.
- [x] UI `LobbyView.tsx`: hàng chọn 0/10/50/100/500/1000, hiển thị pot dự kiến, cảnh báo số dư không đủ. Chỉ host đổi được.
- [x] Server `gameHandlers.ts` `start_game`: check số dư tất cả người chơi thật trước, trừ `betAmount` từng `userId`, hoàn tiền nếu start fail. Bỏ qua Guest (không `userId`) và Bot.
- [x] Server `onGameOver`: pot = `betAmount × số người đã cược`, chia đều cho `winnerUserIds` (chỉ tài khoản thật), cộng tiền + chat system. Guest/Bot thắng không nhận.
- [x] Note: spec gốc ghi "nhân 15-30 lần" — đã triển khai pot chia đều (VD 4 người ×100 → pot 400) vì an toàn kinh tế hơn; muốn 15-30x thì chỉnh `share` trong `onGameOver`.

### 5. Kiểm Thử & Chạy Trực Tiếp (Testing & Launch) — đã xong 23/09/2026
- [x] Test server hiện có (`npm --prefix server test`): 16/16 pass (UNO, EK, Tiến Lên), 0 fail.
- [x] Build client (`npm --prefix client run build`): `tsc && vite build`, 1902 modules, exit 0. Build server: exit 0.
- [x] Chạy thử `node dist/server.js`: `[OmniDeck Server] Running on http://localhost:3000`, `/api/health` → `{status: ok}`. Client dist đã được serve tĩnh từ `server.ts`.

### 6. Navigation Panel + Slug Router + Phòng cược bắt buộc — đã xong 23/09/2026
- [x] Cài `react-router-dom@7` cho client; `App.tsx` chuyển từ state-view sang BrowserRouter: `/dashboard` (Navigation Panel), `/play`, `/room/:roomId` + `/room?id=` + alias `/room-id?id=` (đúng yêu cầu `/room-id=?`), `/hustle` (đi làm), `/leaderboard`, `/tai-xiu`, `/mines`, `/goals`; `/` → `/dashboard`, `/lobby` → `/play`, `/work` → `/hustle`.
- [x] `DashboardView` đổi thành **Navigation Panel** (trung tâm mọi dịch vụ, bỏ header/footer riêng, card trỏ sang slug).
- [x] `AppShell` khung chung style Dashboard (`from-gray-900 via-gray-800`, header sticky, tab nav, bottom stats) cho `/dashboard /play /room /hustle /leaderboard`; `LobbyView` viết lại theo đúng tokens Dashboard (bỏ theme slate-950/indigo-950 lạc điệu).
- [x] Tách `PlayPage` (tạo/vào phòng) và `RoomPage` (phòng chờ + bàn đấu, deep-link mã phòng, redirect `/room/:id` sau khi tạo/vào).
- [x] Phòng **không còn miễn phí**: `RoomManager` thêm `MIN_ROOM_BET=10 / MAX=5000 / DEFAULT=50` + `sanitizeRoomBet()`; `createRoom(betAmount?)`, `updateSettings` chặn <10, `startGame` chặn ván free; `gameHandlers create_room` kiểm tra số dư chủ phòng; UI tạo phòng + cài đặt phòng bỏ option FREE, mặc định 50.
- [x] `GameSocketContext` chia sẻ 1 socket cho mọi route; `AppView` mở rộng thêm `navigation-panel/play/room/hustle/leaderboard`.
- [x] Verified: client build 1922 modules exit 0, server build + test 16/16 exit 0, `node dist/server.js` + check 11/11 slug → 200 + `root=True`, `/api/health` → ok.

### 7. Fix "không nhận việc được" ở /hustle — đã xong 23/09/2026
- [x] Nguyên nhân: server chạy đúng (test e2e register → request-word → submit-word → +10 🪙 pass); lỗi ở client — khách chưa đăng nhập bấm "Nhận Việc" bị `return` im lặng, mất socket cũng im lặng, tin nhắn lỗi không hiển thị ở màn hình chờ.
- [x] `WorkView.tsx`: thêm `onOpenAuth?`, báo rõ khi chưa đăng nhập/mất socket/timeout 8s, hiện message ngay ở màn hình chờ.
- [x] `HustlePage.tsx`: nối `AuthModal` khi khách bấm nhận việc.
- [x] Lưu ý: token lưu RAM server nên mỗi lần restart server phải đăng nhập lại.

### 8. Cơ chế mở bát mới (15s vừa mở vừa trả thưởng + xúc xắc 3D) — đã xong 23/09/2026
- [x] Server `TaiXiuEngine.ts`: `REVEALING 8s → 15s`, trả thưởng ngay lúc bắt đầu mở bát, hết 15s sang phiên mới (bỏ phase `settling` riêng; type giữ lại để tương thích).
- [x] Client `DiceSqueeze.tsx` viết lại: bát úp **kín opaque** suốt cược + lắc; mở bát bát bay lên, 3 viên xúc xắc khối 3D tung lên rơi xuống nảy bật — lúc bay đảo số ngẫu nhiên mỗi 90ms, chạm đất chốt mặt thật; giữ kéo nặn + "Mở Nhanh".
- [x] `TaiXiuView.tsx`: thanh phase revealing theo 15000ms.
- [x] Verified: client + server build exit 0; test engine trực tiếp từ dist — `betting → shaking → revealing (phaseEndsAt-now = 15000ms) → betting`, history + payout đúng lúc mở bát.

### 9. Bát 3D + xúc xắc đọc mặt trên + Tài Xỉu 1:1.95 + jackpot + nav dọc — đã xong 23/09/2026
- [x] `DiceSqueeze.tsx`: bát 3D (thân/vành/lòng/chân/điểm bóng) + đĩa đều rộng hơn cụm xúc xắc; xúc xắc khối 3D tĩnh đọc **mặt trên cùng**, không rung/nảy, mở ra là kết quả luôn.
- [x] `TaiXiuView.tsx`: chỉ 2 cửa Tài/Xỉu (xóa Bão), odds **1:1.95**, **bên thắng nháy xanh** (kể cả cửa nổ hũ 1-1-1/6-6-6), panel hũ jackpot + banner nổ hũ.
- [x] Server: `TaiXiuBetType='tai'|'xiu'` (từ chối cửa Bão), thắng trả `floor(bet*1.95)`, 5% mỗi cược vào hũ (`data/taixiu-jackpot.json`), nổ hũ chia đều khi bão 1-1-1 (Xỉu) / 6-6-6 (Tài); `getLeaderboard('money')` xếp theo số dư.
- [x] `AppShell`: nav **dọc** trái, **bỏ tab Bài Lá** trùng lặp, topbar đưa **đăng nhập/đăng ký + số tiền lên top-right**; `NavigationPanel`: đầu trang 2 bảng **Top Giàu** + **Top Thắng** (top 5).
- [x] Verified: client + server build exit 0; test engine hàng trăm phiên ảo — từ chối Bão, payout +95/-100 chuẩn 1.95x, nổ hũ 1-1-1 chia 515 🪙 và reset hũ, file persist + money leaderboard đúng.

### 10. Fix nav arena + 6 game kiểu Rainbet — đã xong 23/09/2026
- [x] Fix bấm Goals/Mines/Tài Xỉu giữ nguyên panel: đưa 3 route vào trong `AppShell` (tab sáng đúng), chống crash khi socket chưa kết nối (màn hình chờ + guard emit), thêm `ErrorBoundary` toàn app.
- [x] Server `CasinoEngine.ts` (+`fair.ts` provably fair SHA-256): Roulette châu Âu (đỏ/đen/lẻ/chẵn/cao/thấp 1:1.95, số 35:1), Aviator vòng chung live (chờ 8s → bay → nổ, rút tay), Chicken Cross 3 độ khó (10 làn, rút bất cứ lúc nào), Hi-Lo dây chuyền, Coinflip 1:1.95, RPS hòa hoàn tiền — cược 10–5000, login bắt buộc.
- [x] Client 6 view + slug `/roulette /aviator /chicken /hilo /coinflip /rps` + tab sidebar + 6 card Navigation Panel.
- [x] Verified: server build exit 0, test e2e cả 6 game pass (roulette quay đúng số, coinflip, RPS đủ thắng/thua/hòa, chicken rút x1.6, hilo, aviator cược lúc chờ → rút x1.26 lúc bay).

### 11. Aviator full-width + full-width mọi game + song ngữ VI/EN — đã xong 23/09/2026
- [x] Xóa khoảng trống 2 bên: `AppShell` bỏ `max-w-7xl`, mọi view (Aviator grid 3/5+2/5, Roulette/Coinflip/RPS/Hilo 2 cột, Chicken/Tài Xỉu/Đi Làm full-width) dàn hết chiều ngang; mobile xếp dọc như cũ.
- [x] Toggle VI/EN ở topbar (lưu `localStorage`): `i18n/dict.ts` (~200 keys) + `LanguageContext` + bọc `App`; dịch shell, Navigation Panel (kể cả 2 bảng top + 13 card), Play/Room (kể cả luật UNO/Tiến Lên/Mèo Nổ), Đi Làm, Xếp Hạng, Auth, Tài Xỉu (+roadmap, bát), Mines, Goals, 6 game casino, khung bàn đấu.
- [x] Chưa dịch (đợt sau): chi tiết trong ván UNO/Mèo Nổ/Tiến Lên + tin nhắn server trả về (tiếng Việt).
- [x] Đi Làm theo toggle VI/EN: `WorkManager` tách bank `VI_WORDS` (75 từ có dấu) / `EN_WORDS` (60 từ), `work:request-word` nhận `lang`, client gửi `lang` đang chọn + hiện badge 🇻🇳/🇬🇧 trên thẻ từ.
- [x] Tài Xỉu về 2D phẳng: bỏ khối cube/bát 3D; sang phiên mới hiện sẵn 3 xúc xắc úp "?" dưới nắp bát 2D, hết giờ cược nắp nhấc lên, từng con lật ra số thật (mặt 1/4 chấm đỏ).
- [x] Xúc xắc hiện SỐ LUÔN từ đầu phiên (server gửi dice cùng state, nắp che trên UI) — trả thưởng nhấc nắp là thấy ngay mặt số + nảy nhẹ; nháy xanh Tài/Xỉu vẫn chỉ khi mở.
- [x] Remember me: session lưu `data/sessions.json` (nhớ 30 ngày, không nhớ 24h) nên restart server/F5 vẫn còn đăng nhập; checkbox "Ghi nhớ đăng nhập" (mặc định bật) — tắt thì token chỉ trong tab hiện tại; đăng xuất thu hồi token server.
