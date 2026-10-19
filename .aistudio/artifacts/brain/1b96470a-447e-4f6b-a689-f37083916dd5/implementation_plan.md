# Updated Implementation Plan: Calendar Time-Left Lock & 30-Second Periodic Point Calculation

## 1. Calendar Time Block Time-Left Lock
*   **Action**: Anchor the time-left display (`"78m left"`) strictly to the calendar task's scheduled `endTime` (`task.endTime`).
*   **Mechanism**: `remainingSec = Math.max(0, Math.floor((taskEndTimeMs - Date.now()) / 1000))`, ensuring the time-left countdown is locked to wall-clock time and cannot be fooled or manipulated.

## 2. 30-Second Periodic Point Calculation & Sync
*   **Action**: Keep the existing `calculateUniWorkPoints(plannedMin, actualMin)` formula intact, but **trigger it every 30 seconds** during an active study session instead of only at the end.
*   **Mechanism**:
    *   While the focus timer is running, every 30 seconds the client sends a periodic checkpoint or sync request to the server with current elapsed minutes.
    *   The server computes points using `calculateUniWorkPoints` and updates the user's rolling points log in PostgreSQL in real-time.

## 3. Verification Plan
*   Verify time left is strictly anchored to calendar event `endTime`.
*   Verify points calculate and update every 30 seconds during active study sessions using the standard formula.
