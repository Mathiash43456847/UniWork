# Focus Room Sharing URL Fix & Bot Isolation Plan

Fix focus room sharing URLs so direct join links work seamlessly, and ensure study bots only appear in the global focus room (`000000`), removing bots from all custom/private focus rooms.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Direct Join Links**: When users click share in a focus room, a working direct join URL (`?room=CODE`) will be copied. When opening this URL, the app will automatically open the focus room view and join that room.
> - **Bot Isolation**: Study bots will be strictly limited to the Global Focus Room (`000000` / `isGlobal`). Custom focus rooms will have 0 bots.

## 1. Overview & Core Concept

- **What It Does**: 
  1. Fixes focus room sharing so colleagues/classmates can click a shared link and join the room instantly.
  2. Ensures custom study pods remain purely peer-to-peer without study bots, preserving realistic group study environments.
- **Key Value**: Reliable room sharing and clean, bot-free custom rooms.

## 2. User Experience & Visual Design

- **Sharing Modal / Button**: Clicking "Share Room" copies a pristine, working URL (`https://.../?room=XXXXXX`) with a confirmation toast.
- **Focus Room Experience**: Global room displays AI study companions; custom rooms display only real peers (and user).

## 3. Key Technical Architecture & Implementation Steps

1. **Fix Focus Room Sharing URL**:
   - In `FocusRoomView.tsx`, update the share action to generate `window.location.origin + window.location.pathname + '?room=' + room.code`.
   - In `App.tsx` / `FocusRoomView.tsx`, ensure URL parameters (like `?room=XXXXXX`) or initial room code are correctly detected on app load and mount so direct links open the room immediately.

2. **Isolate Study Bots**:
   - In `FocusRoomView.tsx`, update bot fetching/rendering logic so bots are only loaded/displayed when `room.code === '000000'` or `room.isGlobal` is true. For custom rooms (`room.code !== '000000'`), bot list is empty (`[]`).
