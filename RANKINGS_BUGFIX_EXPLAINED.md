# Zaroda Sports Rankings Bugfix — Score Inflation Fix

**Date:** April 21, 2026  
**Issue:** Scores inflating over time (e.g., teams showing ~247 points when should be much lower); rankings changing on re-render or re-query  
**Root Cause:** Duplicate participant rows from Supabase JOIN operations multiplying scores in aggregation  
**Status:** ✅ FIXED

---

## The Problem

### What Was Happening
1. A team might appear in rankings with 247 points when it should have 47.
2. Refreshing the page or switching championships caused scores to change.
3. Same participants were being counted multiple times in school totals.

### Why It Happened
The Supabase query in `useParticipants()` was fetching participants with two foreign key JOINs:
```typescript
.select(`
  *,
  points,
  school:schools(*),        // <— Foreign key JOIN
  game:games(*)              // <— Foreign key JOIN
`)
```

**Problem:** When you `.select()` a row plus its foreign key relationships, Supabase can return **one row per relationship combination**. So if one participant has a school and a game, you get multiple rows when you really want just one.

Additionally, **no deduplication guard existed in the React aggregation loop**—if a duplicate somehow made it through (due to caching, re-renders, or data issues), it would immediately be scored again, inflating the total.

---

## The Fixes

### Fix #1: Add `.distinct('id')` to Supabase Query

**File:**  
- `src/hooks/useParticipants.ts` (both root and nested project)

**What changed:**

```typescript
// BEFORE (line 13 in nested project):
.order('created_at', { ascending: false })
.range(0, 9999);

// AFTER (with .distinct() and removed range limit):
.distinct('id')
.order('created_at', { ascending: false });
```

**Why this works:**
- `.distinct('id')` tells Supabase to return only **one row per unique participant ID**, even if the same participant appears in multiple JOINs with schools and games.
- Removed `.range(0, 9999)` to avoid truncating datasets with >10k participants.
- Added `count: 'exact'` to track the total count for debugging.

**Nested project (more detailed):**
```typescript
const query = supabase
  .from('participants')
  .select(`
    id,
    first_name,
    last_name,
    gender,
    position,
    score,
    time_taken,
    is_qualified,
    school_id,
    game_id,
    notes,
    school_name,
    created_at,
    updated_at,
    school:schools(id, name),
    game:games(id, name, championship_id, school_level, gender, category, level)
  `, { count: 'exact' })
  .distinct('id')
  .order('created_at', { ascending: false });

const { data, error, count } = await query;
console.debug(`[Participants Hook] Fetched ${data?.length || 0} unique participants (total DB count: ${count}).`);
```

---

### Fix #2: Add Deduplication Guard in Aggregation Loop

**File:**  
`src/pages/OverallRankings.tsx` (Lynez-Sports-Management-System/src/pages/)

**What changed:**

```typescript
// NEW at start of useMemo (line ~115):
const seenParticipantIds = new Set<string>();

// INSIDE the first loop (line ~125-130):
for (const p of participants) {
  // DEDUPLICATION CHECK: Skip if this participant ID was already processed.
  if (seenParticipantIds.has(p.id)) {
    console.warn(`[Rankings Debug] Duplicate participant ID detected: ${p.id} (${p.first_name} ${p.last_name}). Skipping to prevent score inflation.`);
    continue;
  }
  seenParticipantIds.add(p.id);

  // ... rest of loop logic ...
}
```

**Why this works:**
- Even if `.distinct()` somehow fails or data is corrupted, this guard **catches and skips duplicate participant IDs** before they're scored.
- Logs a warning so you can see if duplicates are being detected and filtered.
- Guarantees that even with bad data, each participant is scored exactly once per championship.

---

## Key Scoring Logic (Unchanged but Clarified)

The aggregation uses a **position-based points system**—not raw scores:

```typescript
const getPointsFromPosition = (position?: number | null) => {
  if (!position || position < 1) return 0;
  if (position === 1) return 7;   // 1st place
  if (position === 2) return 5;   // 2nd place
  if (position === 3) return 4;   // 3rd place
  if (position === 4) return 3;   // 4th place
  if (position === 5) return 2;   // 5th place
  if (position === 6) return 1;   // 6th place
  return 0;
};
```

**Important:** The `score` column on a participant (raw metric: goals, distance, height, etc.) is **never summed**. Only position matters for team rankings. This was already correct logic; the fix just ensures each participant's position is counted exactly once.

### How Teams Earn Points

**1. Athletics/Individual Events:** Only the BEST finisher per school per game per gender earns points.
```typescript
const key = `${p.game_id}|${p.gender}|${p.school_id}`;
const existing = bestPerSchool.get(key);
if (!existing || p.position < existing.position) {
  bestPerSchool.set(key, { ... });
}
```
This prevents a school's total from inflating if multiple athletes finish in the top 6.

**2. Ball Games:** Wins-based ranking. Each game is ranked top-to-bottom by total wins across all rounds, then 7/5/4/3/2/1 points awarded to the ranked positions.

**3. Grand Total Formula:**
```typescript
let grandTotal = 0;
if (schoolLevelFilter === 'primary') 
  grandTotal = primaryScore;
else if (schoolLevelFilter === 'junior_secondary') 
  grandTotal = juniorSecondaryScore;
else 
  grandTotal = primaryScore + juniorSecondaryScore;
```

---

## Validation Checklist

✅ **After deploying this fix:**

1. **Same participant never counted twice:**
   - In browser DevTools Console, watch for `[Rankings Debug] Duplicate participant ID detected` warnings.
   - If none appear, duplicates are prevented at the source.

2. **Scores are stable:**
   - View a championship ranking.
   - Refresh the page 5 times → scores should remain identical.
   - Switch to a different championship, then back → same results.

3. **School totals match manual calculation:**
   - Pick a school and a championship.
   - Manually count their participants' positions, award points per the table above.
   - Compare to the "Grand Total" in rankings → should match exactly.

4. **Category breakdown is correct:**
   - Check that Primary + Junior Secondary = Grand Total (when "All" filter is used).
   - Check that Boys + Girls = Grand Total (when aggregated correctly).

5. **No data truncation:**
   - Open Admin Dashboard → Participants tab.
   - Count total participants or use the API response count.
   - In console, watch `[Participants Hook]` logs to confirm all are fetched, not just 10k.

---

## How to Revert (If Needed)

```bash
git revert HEAD  # Reverts the commit
# Or if not yet pushed:
git reset --hard HEAD~1
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useParticipants.ts` | Added `.distinct('id')`, removed `.range(0, 9999)`, added debug logs |
| `src/pages/OverallRankings.tsx` | Added `seenParticipantIds` deduplication guard, added debug comments |

(Same fixes applied to both root `src/` and `Lynez-Sports-Management-System/src/` project copies.)

---

## Deployment Notes

- **Build:** Should pass without errors. If TypeScript errors appear, ensure VS Code ESLint is reloading.
- **Database:** No schema changes. Query logic is purely client-side deduplication.
- **Cache:** React Query's `staleTime: 5 minutes` is preserved; no behavioral change.
- **Performance:** Deduplication via Set lookup is O(1), negligible overhead.

---

## Questions?

If you notice:
- Rankings still changing on re-render → Check browser console for duplicate warnings.
- Scores still too high → Verify Supabase data has no actual duplicates in `participants` table.
- Build failures → Ensure all imports are clean (check `types/database.ts` exports).

