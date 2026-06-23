# Finish-up Plan

This resolves every item from your message. Where two instructions conflicted, I picked the interpretation in **Decisions** below — tell me if any is wrong.

## Decisions (please confirm)
1. **Pricing**: Keep **Base = free**. Activate **only Essential** with three paid levels — **Ward, Sub-County, County — each KSh 8,800 per tournament**. Deactivate every Professional, Elite, Season Bundle plan and the old Zone / Regional / National plans.
2. **Ward** is a brand-new competition level (it doesn't exist yet), so it needs to be added to the database. Order becomes: Base → Ward → Sub-County → County.
3. **Open Tournament** is treated as its own paid product at KSh 8,800 too (so nobody can pay a lower level and run an open tournament).
4. **Background photo**: I'll use the most recent upload `IMG-20260508-WA0037.jpg` as the full-page background (no centre logo). If that's the wrong file, name the right one.

## 1. Lock championship name to the paid level
- Every championship name automatically gets its level appended (`My Champs - Ward`, `... - County`, `... - Base`) via `formatChampionshipName`, applied in signup, pricing, and the admin "Create Championship" form.
- A database trigger re-derives the suffix from the row's `level` on insert/update, so a name can never carry a different level than what was paid for. Paying for Ward and renaming to "County" becomes impossible.

## 2. Payment tiers (data + UI)
- Deactivate all non-Essential plans; set Essential Ward / Sub-County / County to 8,800 each; add Ward plan.
- `PricingPage` collapses to a single Essential view showing Base (free) + Ward / Sub-County / County cards. Remove the Professional/Elite/Season tabs.
- Server-side (`initialize-payment`) validates that the plan's level matches the championship being created and rejects mismatches — price and level come from the DB plan, never the client.

## 3. Hard paywall (no access without paying)
- `AdminContext` already gates on `tenant_has_active_access` + a free Base championship. I'll add a `ProtectedRoute` guard: a tenant with **no active paid subscription and no Base championship** is redirected to `/pricing` instead of seeing the dashboard.
- Tenants only ever see/manage **their own** championships (scope every query by `tenant_id`); they cannot manage championships they aren't part of, and the "manage others" leak is closed.

## 4. Fix "can't create game / not picking championship"
- The game form's championship dropdown is filtered by `school_level`; when a tenant's only championship doesn't match the selected school level the list is empty, so creation fails. Fix: default the game form's school level + championship to the tenant's actual championship and fall back to showing all of the tenant's championships.

## 5. Open Tournament cleanup
- Open Tournament manager + signup stop pulling any school-level data; the championship picker lists only `school_level = 'open'` championships. No school sublevels appear for open accounts.

## 6. Remove paybill
- Remove the manual paybill/M-Pesa account text anywhere it appears; all payment goes through the existing Paystack flow (already wired to your Paystack secret).

## 7. Background photo
- Add the chosen upload to `src/assets`, apply as a fixed full-bleed background on the public landing/hero with a readable overlay, no centre logo.

## Technical notes
- DB migration: `ALTER TYPE competition_level ADD VALUE 'ward'`; add championship-name suffix trigger; update `LEVEL_LABELS`, `TEAM_NAME_BY_LEVEL`, and `CompetitionLevel` type to include `ward`.
- Plan data updates done via data tool (not migration).
- Edge function `initialize-payment` gains level/plan validation.
- After changes I'll run the test suite and typecheck.

Approve and I'll implement all of it.