# Detailed Implementation Plan: 30-Second Live Points & 7-Day (168-Hour) Rolling Stats with Exact Formula

## 1. Exact Current Calculation System (`server.ts`)
The current UniWork point calculation function in `server.ts` uses planned minutes ($P$) and actual minutes ($A$):
```ts
function calculateUniWorkPoints(plannedMin: number, actualMin: number): number {
  const P = Math.max(1, Math.round(plannedMin || 25));
  const A = Math.max(0, Math.round(actualMin || 0));
  const Z = Math.floor(P * 0.80);

  let points = 0;
  if (A >= Z && A < P) {
    points = P + Math.round((P - A) * 0.5);
  } else if (A === P) {
    points = P;
  } else if (A < Z) {
    points = A;
  } else if (P < A && A <= P + 10) {
    points = P - (A - P);
  } else if (A > P + 10) {
    points = Math.round(P * 0.10);
  }

  return Math.max(0, points);
}
```

And the 7-day rolling stats (168 hours) query sums up all points earned where `completed_at >= NOW() - INTERVAL '7 days'`:
```sql
SELECT SUM(points_earned) as sum_points 
FROM uniwork_focus_points_logs 
WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days'
```
Rolling average = `Math.round(sumPoints / 7)`.

---

## 2. Adapting to 30-Second Live Incremental Updates
- **Incremental Slices**: Instead of running this calculation only once at session completion, every 30 seconds during active study (`is_running = true`), we will attribute a 30-second slice of study time (0.5 minutes) to the session.
- **Incremental Points Award**: For each 30-second active tick, we calculate the proportional points earned using the formula above scaled to the elapsed active minutes, logging small incremental point entries into `uniwork_focus_points_logs`.
- **Real-Time 168-Hour Window**: Because these incremental point logs are saved in real-time every 30 seconds with a current timestamp, the 7-day (`NOW() - INTERVAL '7 days'` / 168 hours) SQL query will automatically include them, making the dashboard stats tick up live.

---

## 3. Verification Plan
- Start an active study session.
- Verify that every 30 seconds:
  1. An incremental point log is recorded using the exact calculation logic.
  2. The 7-day (168-hour) rolling average and total points update in real-time on the frontend stats display.
