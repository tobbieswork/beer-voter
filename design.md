# 🍻 BeerVote — Design System & UI Specification for Stitch

> **Document Purpose**: This specification provides complete design guidance, component hierarchy, visual tokens, layout architectures, and screen-by-screen blueprints for **Stitch** to generate cohesive, high-fidelity UI designs for **BeerVote**.
>
> **Active Design System**: **Craft Pollen (Material Design 3)** (`assets/184dc696cd5c4eb2bf1d74b487a84659`)  
> **Nocturnal Companion**: **Cyber Pub Glassmorphism** (`assets/8bbc9a62b14d435f9377b256d08b0ef7`)

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

- **Aesthetic**: _Craft Pollen (Material Design 3)_ — channels the warmth, communal hospitality, and artisanal craftsmanship of craft brewing through the disciplined, expressive framework of Material Design 3.
- **Tone & Voice**: Celebratory, witty, energetic, warm, and distinctly Vietnamese drinking culture blended with modern craft brewery aesthetics.
- **Metaphors**: Foaming pint glasses, golden malt grains, roasted chestnuts, clinking mugs (🍻), pub meters, and diamond beer ranks (💎).

---

## 2. Visual Design System: Craft Pollen (Material Design 3)

### 2.1 Color Palette & Role Mapping

```
+--------------------------------------------------------------------------+
|  SURFACE CONTAINERS & CANVAS                                             |
|  [#FFF8F6] Surface Canvas     [#FFF1EB] Container Low  [#FEEAE1] Default |
|  [#F8E4DC] Container High     [#F2DFD6] Highest        [#FFFFFF] Lowest  |
+--------------------------------------------------------------------------+
|  ARTISANAL CRAFT BREWERY ACCENTS                                         |
|  [#8E4A00] / [#B86200] Warm Amber Primary                                |
|  [#77574E] Roasted Chestnut Secondary                                    |
|  [#6C5D2F] Harvest Grain / Hops Gold Tertiary                            |
+--------------------------------------------------------------------------+
|  OUTLINES & TYPOGRAPHY                                                   |
|  [#231914] On-Surface Text    [#554337] On-Surface Variant                |
|  [#887365] Outline            [#DBC2B1] Outline Variant                  |
+--------------------------------------------------------------------------+
```

| Token Name                                | Hex Value | Usage / Description                                                         |
| :---------------------------------------- | :-------- | :-------------------------------------------------------------------------- |
| `surface` / `--bg-primary`                | `#FFF8F6` | Soft, warm cream canvas establishing a welcoming, luminous backdrop         |
| `surface-container-low`                   | `#FFF1EB` | Subtle background grouping layer for list items and section clusters        |
| `surface-container` / `--bg-card`         | `#FEEAE1` | Default card background and floating action bar backdrop                    |
| `surface-container-high`                  | `#F8E4DC` | Elevated modules, nested sheets, and interactive item wells                 |
| `surface-container-highest`               | `#F2DFD6` | Active pressed states, search bars, and segmented button wells              |
| `primary` / `--accent-gold`               | `#B86200` | Drives primary voting actions, key callouts, and main CTA buttons           |
| `primary-hover`                           | `#8E4A00` | Deep honey amber for active hover and press states                          |
| `secondary`                               | `#77574E` | Roasted chestnut: handles secondary buttons and supporting UI elements      |
| `tertiary`                                | `#6C5D2F` | Harvest grain / hops gold: tasting notes, award badges, ABV/IBU micro-stats |
| `on-surface` / `--text-primary`           | `#231914` | Deep espresso high-contrast text for headlines and titles                   |
| `on-surface-variant` / `--text-secondary` | `#554337` | Roasted chestnut text for body copy, subtitles, and labels                  |
| `outline` / `--text-muted`                | `#887365` | Boundary definition for unfocused inputs and structural dividing lines      |
| `outline-variant` / `--border-glass`      | `#DBC2B1` | Soft, low-contrast borders for resting cards, chips, and dividers           |
| `error` / `--accent-red`                  | `#BA1A1A` | Danger state, locked badges, and destructive actions                        |
| `success` / `--accent-green`              | `#2E6C38` | Active session indicators and confirmed checkmarks                          |

### 2.2 Elevation & Depth (M3 Tonal Stepped Paradigm)

- **Level 0 (Flat)**: `Surface` (`#FFF8F6`). Unraised background views, clean sheet backdrops. Zero shadow.
- **Level 1 (Card & In-List Surfaces)**: `Surface Container Low` (`#FFF1EB`) with a crisp `1px` border of `Outline Variant` (`#DBC2B1`). Ambient shadow: `0px 1px 3px 1px rgba(119, 87, 78, 0.08)`.
- **Level 2 (Active Interactive Cards & Scrolled Bars)**: `Surface Container` (`#FEEAE1`). Ambient shadow: `0px 2px 6px 2px rgba(119, 87, 78, 0.12)`.
- **Level 3 (Floating Action Button & Bottom Sheets)**: `Surface Container High` (`#F8E4DC`). Ambient shadow: `0px 4px 12px 3px rgba(184, 98, 0, 0.16)`. Warm amber radiance provides physical lift.
- **Level 4 & 5 (Dialogs, Overlays)**: `Surface Container Highest` (`#F2DFD6`) with deep ambient diffusion: `0px 8px 24px 4px rgba(119, 87, 78, 0.20)`.

### 2.3 Typography

- **Headlines & Display**: `Outfit` (Rounded geometric curves that mirror pill shapes and beer foam).
- **Body & Technical Data**: `Inter` or `Outfit` (Optimal readability for vote counts, timestamps, and venue addresses).
- **Hierarchy Scale**:
  - **Display 1 (Hero Title)**: 32px–40px / Weight 800 / Letter-spacing: -0.02em
  - **Headline 2 (Section Title)**: 22px–26px / Weight 700 / Line-height 1.25
  - **Title (Card Header)**: 18px–20px / Weight 600 / Line-height 1.3
  - **Body 1 (Main Text, Options)**: 15px–16px / Weight 400–500
  - **Body 2 (Metadata, Labels)**: 13px–14px / Weight 400
  - **Badge / Micro (Status, Counters)**: 11px–12px / Weight 700 / Uppercase / Letter-spacing: 0.04em

### 2.4 Shapes & Curvature

- **Pill / Fully Rounded (`rounded-full` / `9999px`)**: Primary CTA buttons, voting tally pills, search bars, filter chips, navigation indicators, and FABs.
- **Extra Large Containers (`rounded-2xl` / `1.5rem` / `24px`)**: Applied to primary cards, modal dialogs, and bottom sheets.
- **Medium Elements (`rounded-lg` / `12px`–`16px`)**: Secondary input fields and tag wrappers.

---

## 3. Screen Specifications: Home Lounge (`a82883fcf8a64573a4c9cd19cf6c766e`)

### 3.1 Top Bar / Header

- **Brand Mark**: Minimalist geometric beer mug merged with vote badge ("🍻 BeerVote") + subtitle _"Kèo Nhậu Tới Bến"_.
- **Language Selector**: Pill toggle (`🇻🇳 VI | 🇬🇧 EN`).
- **User Profile Capsule**: Pill container displaying active user nickname (e.g. _"🍗 Chiến Thần Diệt Mồi"_ or Google Avatar) + status indicator.

### 3.2 Hero Welcoming & Action Section

- **Greeting**: _"Sẵn sàng cạn ly chưa, Chiến Thần? 🍻"_
- **Tagline**: _"Lên kèo nhanh chóng, chọn quán đỉnh cao, không lo bàn lùi."_
- **Primary CTA**: **"+ Tạo Kèo Mới"** in radiant Warm Amber (`#B86200`), full pill shape, white text, ambient warm shadow.
- **Quick PIN Room Entry Card**:
  - Container: Soft container fill (`#FFF1EB`) with outline (`#DBC2B1`).
  - Title: _"🔑 Vào nhanh bằng mã PIN 6 số"_
  - Input: 6-digit numeric input with placeholder _"Nhập mã PIN phòng..."_.
  - Action Button: _"Vào Phòng →"_.

### 3.3 "Kèo Đang Chờ Bạn" (Active Sessions / Bento Cards)

- **Card 1: Active Live Voting Session**:
  - Title: _"Thứ Sáu Bùng Nổ 🚀"_
  - Creator Tag: _"👑 Tạo bởi Alex"_
  - Status Pill: Glowing green pulse dot + _"🟢 Đang Vote (Live)"_ + vote tally.
  - Top Leading Picks Preview (with beer foam progress meters):
    - 🕒 `19:30 Thứ 6 (67% • 6 votes)`
    - 📍 `Bia Hơi Vỉa Hè Bờ Sông (70% • 7 votes)`
    - 🍺 `Craft IPA Hoa Bia Thơm Nồng (5 votes)`
  - Attendees Stack: Overlapping avatar bubbles.
  - Action: _"Vào Bình Chọn Ngay →"_.
- **Card 2: Locked / Finalized Session ("Chốt Kèo")**:
  - Title: _"Mừng Lương Về 🎉"_
  - Creator Tag: _"👑 Tạo bởi Bảo"_
  - Status Pill: _"🔒 ĐÃ CHỐT KÈO"_
  - Countdown Snippet: `[02 Giờ : 15 Phút]` nữa khai tiệc.
  - Confirmed Winner: _"🏆 Quán Lẩu Dê Đồng Quê • 19:00 Hôm Nay"_.
  - Action: _"Xem Địa Điểm & Chỉ Đường 📍"_.

### 3.4 Drinking Stats Widget (Pub Meter)

- Frosted container banner:
  - _"🍻 3 kèo đã tham gia • 48 ly cạn cùng anh em tuần này! Cấp bậc: Bợm Nhậu Kim Cương 💎"_

### 3.5 Past Events Accordion ("Kèo Cũ Đã Tàn")

- Muted cards displaying historical parties with participant totals and dates.

### 3.6 Bottom Navigation Dock

- Fixed bottom M3 navigation dock with frosted pill:
  - **Lounge** (Active pill indicator)
  - **Kèo Của Tôi**
  - **Quán Ngon**
  - **Hồ Sơ**

---

## 4. Screen Specifications: Voting Room (`c3a788dba19e43c082609b2744e0ed01`)

- **Top Bar**: Back navigation to Lounge, party title, host badge, QR share button.
- **Winner / Countdown Banner**: Real-time flip countdown blocks with rotating slogans.
- **3 Voting Pillars**:
  1. 🕒 **Thời Gian (When)**: Leading date option cards with vote counts, avatar stacks, and "+1 Vote" / "✓ Đã vote" toggles.
  2. 📍 **Địa Điểm (Where)**: Venue cards with Google Maps links and address badges.
  3. 🍺 **Loại Bia (Drink)**: Craft & draught beer option chips.
- **Inline Proposal Bar**: Quick "+ Đề xuất quán / giờ mới" input.
- **Banter Drawer**: Live commentary feed with 1-tap reaction chips (`🍻 Cạn ly!`, `🏃‍♂️ Đang tới!`, `🍕 Gọi mồi đê!`).
- **Sticky Host Action**: Floating Amber **"🔒 Chốt Kèo"** button.

---

## 5. Technical Implementation Mapping

```
Stitch Token                   CSS Variable                Tailwind Utility
-----------------------------------------------------------------------------
surface                        --bg-primary                bg-bg-primary
surface-container-low          --bg-secondary              bg-bg-secondary
surface-container              --bg-card                   bg-bg-card
surface-container-high         --bg-card-hover             bg-bg-card-hover
primary (#B86200)              --accent-gold               bg-gold, text-gold
primary-hover (#8E4A00)        --accent-gold-hover         hover:bg-gold-hover
on-surface (#231914)           --text-primary              text-text-primary
on-surface-variant (#554337)   --text-secondary            text-text-secondary
outline (#887365)              --text-muted                text-text-muted
outline-variant (#DBC2B1)      --border-glass              border-border-glass
```
