# 🍻 BeerVote — Design System & UI Specification for Stitch

> **Document Purpose**: This specification provides complete design guidance, component hierarchy, visual tokens, layout architectures, and screen-by-screen blueprints for **Stitch** to generate cohesive, high-fidelity, and modern UI designs for **BeerVote**.

---

## 1. Executive Summary & Brand Identity

### 1.1 Product Overview

**BeerVote** (_"Kèo Nhậu Tới Bến"_) is a real-time, social decision-making web application tailored for friend groups, colleagues, and beer enthusiasts. It eliminates endless group chat debates by turning happy-hour planning into a fast, fun, and democratic voting game.

### 1.2 Core Value Proposition

- **Frictionless Onboarding**: No account required. Friends join instantly with 1-click humorous nicknames (e.g., _"Chiến Thần Diệt Mồi"_, _"Beer Master"_) or Google OAuth.
- **Real-Time Multiplayer Voting**: Live WebSockets synchronize votes, newly proposed pub venues, beer choices, and banter across all devices instantly without page refresh.
- **The "Chốt Kèo" (Lock-In) Climax**: Event hosts freeze voting with a celebratory lock-in, crowned with winning selections and a real-time countdown timer with humorous drinking slogans.
- **PIN-Protected Pub Rooms**: 6-digit party PINs for private groups with seamless device sharing via QR codes.

### 1.3 Brand Persona & Atmosphere

- **Aesthetic**: _Cyber Pub Glassmorphism_ — deep obsidian dark mode layered with warm amber, bubbling craft beer gold, and translucent frosted glass surfaces.
- **Tone & Voice**: Celebratory, witty, energetic, warm, and distinctly Vietnamese drinking culture blended with modern craft brewery aesthetics.
- **Metaphors**: Foaming pint glasses, rising beer bubbles, clinking mugs (🍻), amber neon tavern signs, glowing toast notifications.

---

## 2. Visual Design System & Design Tokens

### 2.1 Color Palette

```
+--------------------------------------------------------------------------+
|  OBSIDIAN DARK PALETTE (Base)                                            |
|  [#0a0b0d] Primary BG       [#14161d] Secondary BG    [#171a21] Card BG  |
+--------------------------------------------------------------------------+
|  AMBER & GOLD ACCENTS (Brand & Highlights)                               |
|  [#ffb000] Beer Gold        [#f59e0b] Amber Glow      [#d97706] Deep Hops|
+--------------------------------------------------------------------------+
|  SEMANTIC & STATUS                                                       |
|  [#10b981] Active / Open    [#f87171] Locked / Danger [#88909a] Muted    |
+--------------------------------------------------------------------------+
```

| Token Name              | Hex / RGBA Value            | Usage / Description                                         |
| :---------------------- | :-------------------------- | :---------------------------------------------------------- |
| `--bg-primary`          | `#0a0b0d`                   | Deepest background canvas (obsidian pub interior)           |
| `--bg-secondary`        | `#14161d`                   | Surface background for panels, drawers, toolbars            |
| `--bg-card`             | `rgba(23, 26, 33, 0.65)`    | Frosted glass card fill (backdrop-filter: blur(16px))       |
| `--bg-card-hover`       | `rgba(30, 34, 43, 0.85)`    | Elevated glass card on hover / focus                        |
| `--bg-input`            | `rgba(13, 15, 19, 0.85)`    | Recessed form input and chat background                     |
| `--accent-gold`         | `#ffb000`                   | Primary brand accent: beer foam, active toggles, CTAs       |
| `--accent-gold-hover`   | `#d97706`                   | Deep amber for active press and button hover states         |
| `--accent-amber`        | `#f59e0b`                   | Warm secondary accent for badges and icons                  |
| `--accent-green`        | `#10b981`                   | Success state, active voting badge, connection online       |
| `--accent-red`          | `#f87171`                   | Danger, delete action, "Kèo Đã Khóa" locked badge           |
| `--border-glass`        | `rgba(255, 255, 255, 0.08)` | Subtle border for glass cards and modal boundaries          |
| `--border-glass-active` | `rgba(255, 176, 0, 0.35)`   | Glowing border for selected voting options & focused inputs |
| `--text-primary`        | `#f3f4f6`                   | High-contrast foam white for headlines and active text      |
| `--text-secondary`      | `#a8acb8`                   | Neutral cool silver for labels, timestamps, subtitles       |
| `--text-muted`          | `#6b7280`                   | Dimmed captions and inactive placeholders                   |

### 2.2 Glassmorphism & Elevation System

- **Glass Spec**:
  - `backdrop-filter: blur(16px) saturate(180%)`
  - `background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(23,26,33,0.65) 100%)`
  - `border: 1px solid rgba(255, 255, 255, 0.08)`
  - Optional Gold Neon Highlight: `box-shadow: 0 0 20px rgba(255, 176, 0, 0.15)`
- **Elevation Layers**:
  - **Level 0 (Canvas)**: Background canvas with animated floating micro-bubbles (`BeerBubbles.tsx`).
  - **Level 1 (Cards & Lists)**: `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37)`.
  - **Level 2 (Modals & Drawers)**: `box-shadow: 0 16px 48px 0 rgba(0, 0, 0, 0.6)`.
  - **Level 3 (Toasts & Tooltips)**: `box-shadow: 0 4px 16px rgba(255, 176, 0, 0.25)`.

### 2.3 Typography

- **Primary Font**: `Outfit`, system-ui, sans-serif
  - Geometric, warm, round curves that mirror bubbles and beer foam.
- **Hierarchy Scale**:
  - **Display 1 (Hero Title)**: 32px–40px / Line-height 1.1 / Weight 800 / Letter-spacing: -0.02em
  - **Headline 2 (Section Title)**: 22px–26px / Line-height 1.25 / Weight 700
  - **Title (Card & Modal Header)**: 18px–20px / Line-height 1.3 / Weight 600
  - **Body 1 (Main Text, Options)**: 15px–16px / Line-height 1.5 / Weight 400–500
  - **Body 2 (Metadata, Labels)**: 13px–14px / Line-height 1.4 / Weight 400
  - **Badge / Micro (Status, Counters)**: 11px–12px / Weight 700 / Uppercase / Letter-spacing: 0.04em

### 2.4 Iconography & Visual Accents

- **System Icons**: Lucide / Feather vector icons (Clock, MapPin, Beer, Check, Lock, Unlock, Share2, Copy, Users, Trash2, ArrowLeft, Globe).
- **Party Emojis**: 🍻 (Cheers / Hero), 🍺 (Draft beer), 👑 (Host / Creator), 🔥 (Hot / Leading vote), 🍕 (Snacks / Mồi), ⚡ (Speed / Action), 📍 (Location), ⏰ (Time).
- **Signature Animations**:
  - `float-up`: Ambient beer bubbles floating bottom-to-top with random opacities and scales.
  - `rock`: Subtle playful 12° rocking animation for the brand beer mug logo.
  - `pulse-amber`: Pulsing glow for winning selections and live active badges.

---

## 3. Information Architecture & Navigation

```
                       [ Global Sticky Header ]
                (Logo | Lang Switcher | User Pill)
                                 │
         ┌───────────────────────┴────────────────────────┐
         ▼                                                ▼
  [ Dashboard / Lounge ]                       [ Event Detail / Room ]
  ├── Hero & Fast Actions                      ├── Party Banner & Status
  │   ├── "Tạo Kèo Mới" CTA                     │   ├── Voting Active (Open)
  │   └── Quick PIN Keypad                     │   └── Locked / Chốt Kèo + Countdown
  ├── "Kèo Của Bạn" (Active Parties)           ├── Live Attendee Avatar Stack
  │   ├── Party Title & Creator Tag            ├── 3-Pillar Voting Sections:
  │   ├── Winning Highlights                   │   ├── 🕒 Thời Gian (When)
  │   └── Status Badge                         │   ├── 📍 Địa Điểm (Where)
  └── Past / Visited Parties                   │   └── 🍺 Loại Bia (What to drink)
                                               ├── Real-time Chat / Banter Stream
                                               └── Host Toolbar (Lock / Share / Delete)
```

---

## 4. Screen-by-Screen Specifications

### 4.1 Global Sticky Header

- **Placement**: Fixed top (`top: 0`, `z-index: 50`), blurred glass bar.
- **Elements**:
  - **Brand Mark**: Rocking beer mugs `🍻` + Gradient text `"BeerVote"` (White to Gold gradient). Clicking returns to Dashboard.
  - **Language Pill**: Toggle button (`🇻🇳 VI` / `🇬🇧 EN`) with smooth indicator slide.
  - **User Profile Pill**:
    - _If Logged In / Guest Set_: User avatar image (or beer mug icon) + Nickname + Optional Real Name in parentheses. Clicking opens profile edit modal.
    - _If First-Time Visitor_: `"🔑 Đăng nhập / Tham gia"` primary pill button.

---

### 4.2 Screen 1: Dashboard / Lounge (`Dashboard.tsx`)

- **Purpose**: Welcomes party goers, displays currently joined parties, and allows entering a room via PIN or starting a new party.
- **Layout Grid**:
  - Mobile: Single column with sticky bottom action button.
  - Desktop: Centered 1200px container, 2-column or 3-column responsive bento cards.
- **Components**:
  1. **Ambient Layer**: Floating beer bubbles canvas behind cards.
  2. **Hero Welcome Card**:
     - Large headline: _"Sẵn sàng cạn ly chưa, [Nickname]? 🍻"_
     - Subtitle: _"Lên kèo nhanh chóng, chọn quán đỉnh cao, không lo bàn lùi."_
     - Action Row:
       - Primary CTA: **"+ Tạo Kèo Mới"** (Large gold glow button).
       - Secondary Input: **"Nhập mã PIN 6 số"** with inline "Vào Phòng" submit button.
  3. **Event Card Grid ("Kèo Đang Chờ Bạn")**:
     - **Card Anatomy**:
       - _Top Row_: Event Title, Creator pill (`👑 CreatorName`), Status Badge:
         - `Đang Vote` (Green glow pill + pulse dot).
         - `Đã Chốt Kèo` (Amber-red badge + Countdown snippet).
       - _Middle Row_: Quick summary chips:
         - Leading Date & Time (`📅 19:30 Thứ 6`).
         - Leading Venue (`📍 Bia Hơi Vỉa Hè Bờ Sông`).
         - Leading Drink (`🍺 Bia Thủ Công IPA`).
       - _Bottom Row_: Attendee avatar stack (`3+ bạn đang tham gia`) + Arrow button `"Vào Kèo →"`.
  4. **Empty State**:
     - Illustrated foaming pint glass, humorous copy: _"Chưa có kèo nào hết! Đừng để cuối tuần trôi qua trong nước mắt, hãy tạo kèo ngay!"_ + CTA button.

---

### 4.3 Screen 2: Create Party Modal / Wizard (`CreateEvent.tsx`)

- **Purpose**: Frictionless 60-second creation of a new drinking room.
- **Modal Spec**: Centered glass dialog, backdrop overlay with blur, max-width 560px.
- **Fields & Steps**:
  1. **Party Name**:
     - Input field with quick preset suggestion chips:
       - _VI_: `"Họp mặt cuối tuần 🍻"`, `"Mừng lương về 🎉"`, `"Thứ Sáu bùng nổ 🚀"`, `"Bàn mưu tính kế 🧠"`.
       - _EN_: `"Weekend Gathering 🍻"`, `"Salary Celebration 🎉"`, `"TGIF Blast 🚀"`.
  2. **Security / Privacy (PIN Toggle)**:
     - Toggle switch: _"Bảo vệ bằng mã PIN 6 số"_.
     - When ON: 6-digit PIN input with dice randomizer button to auto-generate a PIN.
  3. **Initial Options Seeder (Tabbed or Accordion)**:
     - **Thời gian (When)**: Quick date buttons (`Hôm nay 🕒`, `Ngày mai 🌅`, `Thứ 6 này ⚡`, `Thứ 7 này 🥳`) or datetime picker.
     - **Địa điểm (Where)**: Venue name input + Quick chips (`Bia Hơi Vỉa Hè 🌊`, `Quán Lẩu Dê 🐐`, `Beer Club Sôi Động 🎶`, `Nướng & Beer 💨`).
     - **Loại bia (Beer)**: Drink input + Quick chips (`Bia hơi Hà Nội 🍺`, `Bia thủ công IPA 🌾`, `Bia tháp Tiger 🐯`).
  4. **Footer Actions**:
     - Cancel (ghost secondary) and **"🚀 Tạo Sòng Nhậu Ngay"** (Primary gold gradient).

---

### 4.4 Screen 3: Party Voting Room (`EventDetail.tsx` — The Core Screen)

- **Purpose**: Live collaborative decision center where friends vote, propose places, chat, and see real-time updates.
- **Layout Architecture**:
  - **Header Ribbon**:
    - Back button (`← Quay lại Lounge`).
    - Event Title & Host Crown Badge (`👑 Tạo bởi Alex`).
    - Room Actions: Share Button (`🔗 Chia sẻ / Mã QR`), Host Settings (`🔒 Chốt Kèo`, `🗑️ Xóa`).
  - **Party Status Hero Banner**:
    - **State A: Voting Active (`status: 'open'`)**:
      - Soft green glass banner with pulsating indicator: _"Đang mở bình chọn — Anh em thả tim cho quán ưng ý nhất!"_
    - **State B: Locked / Finalized (`status: 'locked'`)**:
      - Celebratory Amber/Crimson Glass Banner.
      - Crowned Winners Row:
        - 🏆 **Thời gian chốt**: `19:30 - Thứ 6 (12/10)`
        - 🏆 **Địa điểm chốt**: `Bia Hơi Bờ Sông (120 Hoàng Sa)`
        - 🏆 **Loại bia chốt**: `Bia Tháp Tiger Bạc`
      - **Live Countdown Timer (`Countdown.tsx`)**:
        - Big numeric digit flip-cards: `[02 Ngày] : [05 Giờ] : [42 Phút] : [18 Giây]`.
        - Rotating Humorous Slogans:
          - _"Gan của bạn đã sẵn sàng chưa? 🔥"_
          - _"Nhớ đến đúng giờ, trễ 1 phút phạt 1 ly! ⏰"_
          - _"Đứa nào bàn lùi hoặc bùng kèo làm cún! 🐶"_
          - _"Lên đồ đẹp, chuẩn bị cạn ly tới bến! 🍻"_
  - **The 3 Voting Pillars (Tabs or Segmented Columns)**:
    1. **📅 THỜI GIAN (When)**
    2. **📍 ĐỊA ĐIỂM (Where)**
    3. **🍺 LOẠI BIA (What to Drink)**
  - **Option Card Anatomy (`EventOption`)**:
    - **Left**: Value text (e.g., _"19:30 Thứ Sáu"_ or _"Craft Beer East West"_ with external Maps link icon).
    - **Middle**: Vote count badge (`5 votes`) + Overlapping voter avatar bubbles.
    - **Right**: Vote Toggle Action:
      - _Unvoted_: Secondary glass button with empty heart or `+1`.
      - _Voted by User_: Vibrant Gold filled button with gold drop shadow (`✓ Đã vote`).
      - _Disabled_: When event is locked (read-only with winning ribbon).
  - **Propose New Option Bar**:
    - Sleek inline input at the bottom of each pillar: _"+ Đề xuất quán / thời gian khác..."_ + Add button.
  - **Live Banter & Chat Stream**:
    - Collapsible bottom drawer (mobile) or right-hand sidebar (desktop).
    - Chat message list with colored user avatars, timestamps, and message bubble.
    - Quick Reaction Bar: 1-tap chips (`🍻 Cạn ly!`, `🏃‍♂️ Đang phi tới!`, `🍕 Gọi mồi đê!`, `🤫 Trốn vợ thành công`).

---

### 4.5 Screen 4: Modals & Micro-Flows

#### A. Guest Join & Quick Nickname Modal (`GuestJoinModal.tsx`)

- **Trigger**: New user opens a shared party link.
- **Visuals**:
  - Fun pub tavern illustration / animated beer mug.
  - Headline: _"Gia nhập sòng nhậu BeerVote!"_
  - **Random Nickname Dice Generator**:
    - Input populated with random funny Vietnamese nicknames:
      - _"Chiến Thần Diệt Mồi 🍗"_, _"Beer Thủ Vô Song 🍺"_, _"Bá Chủ Bàn Beer 👑"_, _"Sát Thủ Vỉa Hè 🛵"_, _"Thánh Bàn Lùi 🛑"_, _"Dũng Sĩ Cạn Ly 🥂"_.
    - Dice icon button next to input: 1-click rolls a new witty nickname.
  - Real Name optional sub-input (_"Tên thật để anh em nhận ra bạn"_).
  - Primary CTA: **"Vào Bàn Ngay 🍻"**.
  - Divider: _"Hoặc đăng nhập nhanh bằng Google"_.
  - Google Sign-In One-Tap button.

#### B. 6-Digit Party PIN Keypad Modal (`PartyPinModal.tsx`)

- **Trigger**: Entering a locked/private party room.
- **Visuals**:
  - Lock icon with golden keyhole.
  - Headline: _"Phòng Nhậu Kín — Nhập Mã PIN"_.
  - Subtitle: _"Hỏi chủ sòng nhậu mã PIN 6 số để vào bình chọn."_
  - 6 individual digit input boxes with auto-focus advance, large monospace digits.
  - Shake animation on incorrect PIN entry with crimson error toast: _"Mã PIN không đúng, thử lại nhé!"_.

#### C. Host Lock Event Modal (Chốt Kèo Confirmation)

- **Trigger**: Host clicks _"Chốt Kèo"_ button.
- **Visuals**:
  - Step selector allowing host to confirm or manually pick the winning Time, Place, and Beer.
  - Warning note: _"Sau khi chốt, các thành viên khác sẽ không thể vote thêm."_
  - Primary Confirm CTA: **"🎉 Chốt Kèo & Kích Hoạt Đếm Ngược"**.

#### D. Share & QR Code Modal

- **Visuals**:
  - High-contrast QR code generated in a frosted card.
  - Short URL with 1-click **"Copy Link"** button (shows green checkmark on copy).
  - Quick share buttons to Zalo, Messenger, Telegram.

---

## 5. Responsive Design & Multi-Device Layouts

| Viewport    | Breakpoint         | Layout Strategy                                                                                                                           |
| :---------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile**  | `360px – 480px`    | 100% full width, single column, minimum 44px tap targets, bottom floating navigation/action bar, safe-area-inset padding for iOS notches. |
| **Tablet**  | `768px – 1023px`   | 2-column layout (Left: Voting columns; Right: Chat & Attendees).                                                                          |
| **Desktop** | `1024px – 1440px+` | Wide pub lounge bento layout, max-width 1280px, fixed sticky chat sidebar, ambient floating bubbles across the full canvas.               |

---

## 6. Micro-Interactions & Delighters for Stitch

1. **Beer Foam Progress Fill**:
   - Each option card features a subtle background progress bar representing the percentage of total votes, styled like golden beer liquid with a white foam crest.
2. **Confetti & Cheers Eruption**:
   - When the host clicks _"Chốt Kèo"_, triggering the lock state, a celebratory particle explosion of beer mugs and confetti bursts across the screen.
3. **Optimistic Vote Reaction**:
   - Clicking vote instantly increments the counter and toggles the gold button state with zero perceived latency before WebSocket confirmation.
4. **Live Presence Avatars**:
   - Pulsing green status rings around avatars of users currently connected in the room.

---

## 7. Stitch Prompt Guidelines (How to Prompt Stitch)

When asking Stitch to generate screens based on this document, use the following prompt pattern:

> _"Generate a high-fidelity [Screen Name] for BeerVote using the Cyber Pub Glassmorphism design system specified in design.md. Use the dark obsidian background (#0a0b0d), glowing beer gold accents (#ffb000), frosted glassmorphism cards with Outfit typography, and bilingual Vietnamese/English micro-copy. Emphasize energetic, celebratory social pub vibes with real-time voting badges, attendee avatars, and live countdown timers."_
