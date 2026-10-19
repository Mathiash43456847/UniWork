# Comprehensive Implementation Plan: Focus Room Enhancements & Goal Clean-up

## 1. Remove Target-Directed Time Widget
*   **Action**: Locate and remove the "Target-Directed Time: 25.7h / 93.4h 28% Aligned" card/block from `GoalsView.tsx`.

## 2. Tasks at Hand Top Bar Widget in Focus Room Hub
*   **Action**: Update `FocusRoomView.tsx` to accept `tasks: Task[]` and `activeFocusTask: Task | null`.
*   **UI**: Add a sleek horizontal "Tasks at Hand" card row in the top header area of the main focus room view.
*   **Status Tags**:
    *   **"Not Started"** (slate/gray badge) for tasks that are not active.
    *   **"Started"** (blue/emerald badge) for the active task.
*   **Manual Start**: Ensure selecting a task sets it active **without auto-starting the timer** (`isFocusRunning = false`), allowing users to press start themselves.

## 3. Upgraded Focus Room Profile Edit Modal (Name + Avatar Customization)
*   **Action**: Update the "Edit Your Student Profile" modal in `FocusRoomView.tsx`.
*   **Features**:
    *   Display name input field.
    *   A 12-avatar selection grid with a **Shuffle Choices** button (similar to Settings) so users can customize their avatar picture and seed independently of their display name.
    *   Persist both name and avatar selections to backend DB (`/api/user/profile` and `/api/user/avatar`).

## 4. Verification Plan
*   Verify Target-Directed Time block is removed from Goals View.
*   Verify Tasks at Hand appear in the Focus Room top bar with "Not Started" / "Started" tags, and selecting them does not auto-start the timer.
*   Verify opening the Focus Room profile edit modal lets you change both your name and avatar picture using the 12-avatar grid and shuffle button.
