# Filter Display Examples & Visual Guide

## 1. School Level Filter Dropdown - Before & After

### BEFORE:
```
All Levels
Primary
Junior Secondary
Senior Secondary
Tertiary
```

### AFTER:
```
All Levels
Base          ← NEW
Primary
Junior Secondary
Senior Secondary
Tertiary
```

---

## 2. Overall Rankings - Filter Dropdowns

### School Level Filter:
```
All (Primary + Jr. Sec)
Base                    ← NEW
Primary
Junior Secondary
```

### Competition Level Filter:
```
All Levels
Zone
Sub-County
County
Region
National
```

### Gender Filter:
```
All Gender
Boys
Girls
Mixed
Male
Female
```

---

## 3. PDF Export Examples

### Example 1: Qualified Teams - Female Filter Applied

**PDF Header:**
```
┌─────────────────────────────────────────────────┐
│ ZARODA SPORTS MANAGEMENT SYSTEM                 │
│ Report: Qualified Teams                         │
│ Championship: National Inter-School Games 2026  │
│ Applied Filters:                                │
│ • Gender: Female                                │
│ Downloaded: 14/05/2026 10:30:45                 │
└─────────────────────────────────────────────────┘
```

**Security Benefit:** Immediately clear this report contains ONLY female athletes

---

### Example 2: Overall Rankings - Multiple Filters

**PDF Header:**
```
┌──────────────────────────────────────────────────┐
│ ZARODA SPORTS MANAGEMENT SYSTEM                  │
│ Report: Overall Rankings                         │
│ Championship: County Athletics 2026              │
│ Applied Filters:                                 │
│ • School Level: Junior Secondary                 │
│ • Competition Level: County                      │
│ • Gender: Female                                 │
│ Downloaded: 14/05/2026 11:15:30                  │
└──────────────────────────────────────────────────┘
```

**Security Benefit:** Complete transparency on scope of report

---

### Example 3: Qualified Teams - Base Level Filter

**PDF Header:**
```
┌─────────────────────────────────────────────────┐
│ ZARODA SPORTS MANAGEMENT SYSTEM                 │
│ Report: Qualified Teams                         │
│ Championship: Inter-School Tournament 2026      │
│ Applied Filters:                                │
│ • School Level: Base                            │
│ Downloaded: 14/05/2026 09:45:12                 │
└─────────────────────────────────────────────────┘
```

**Security Benefit:** Shows this is in-school/base level only

---

### Example 4: Bib Seeding Sheet - Event-Specific

**PDF Header:**
```
┌──────────────────────────────────────────────────┐
│ ZARODA SPORTS — BIB SHEET                        │
│ Championship: National Games 2026                │
│ Event: 100m Girls - County Level                 │
└──────────────────────────────────────────────────┘
```

**Previous:** Generic "BIB SHEET" title  
**Now:** Specific event context shows scope

---

## 4. Admin Dashboard - School Level Filter

### Results Category Filter Options:

```
SELECT SCHOOL LEVEL FIRST:
┌─────────────────────────────┐
│ ▼ Choose Category...        │
├─────────────────────────────┤
│ Base                    NEW! │
│ Primary                     │
│ Junior Secondary            │
│ Primary/Junior School       │
│ Senior Secondary            │
│ Tertiary                    │
│ Open Tournament             │
└─────────────────────────────┘
```

---

## 5. Gender Filter Display Clarity

### When filtered by Gender - Title reflects this:

| Filter Applied | Title Display |
|---|---|
| Female | "Female" explicitly shown |
| Male | "Male" explicitly shown |
| Girls | "Girls" explicitly shown |
| Boys | "Boys" explicitly shown |
| Mixed | "Mixed" explicitly shown |
| No gender filter | No gender line in filters |

### Examples:

**Female Filter:**
```
Applied Filters:
• Gender: Female
```

**Boys Filter:**
```
Applied Filters:
• Gender: Boys
```

**Multiple Genders:**
```
When showing unfiltered data by gender, PDF shows no gender line
When showing filtered data, gender is ALWAYS listed
```

---

## 6. Print Output - What Users Will See

### Qualified Teams - Female Only (Printed):

```
═══════════════════════════════════════════════════════════════════════════════
                    ZARODA SPORTS MANAGEMENT SYSTEM
                      Report: Qualified Teams
                  Championship: Regional Games 2026
                    Applied Filters:
                    • Gender: Female

═══════════════════════════════════════════════════════════════════════════════

┌─────┬────────────────┬─────────────────────┬──────────┬────────┐
│ No. │ Game           │ Name                │ Team     │ Status │
├─────┼────────────────┼─────────────────────┼──────────┼────────┤
│ 1   │ 100m Girls     │ Jane Kamau          │ Premier  │ Qual.  │
│ 2   │ 100m Girls     │ Sarah Kipchoge      │ Sunshine │ Qual.  │
│ 3   │ 200m Girls     │ Mary Koech          │ Premier  │ Qual.  │
│ ... │ ...            │ ...                 │ ...      │ ...    │
└─────┴────────────────┴─────────────────────┴──────────┴────────┘

Downloaded: 14/05/2026 10:30:45                         Page 1 of 3
```

✓ **Clear indication:** Only female athletes shown

---

## 7. Championship View - Filter Options

### School Level Filter in Championship View:

```
FILTERS:
┌──────────────────────────┐
│ All School Levels     ▼  │
├──────────────────────────┤
│ ✓ All School Levels      │
│  Base          (NEW)      │
│  Primary                  │
│  Junior Secondary         │
│  Senior Secondary         │
│  Tertiary                 │
└──────────────────────────┘
```

---

## 8. Comparison: Before vs After Implementation

### BEFORE - Risky Scenario:
Admin exports qualified teams for all schools. Accidentally forgets to mention 
that some filters were applied. Document header shows no indication of filtering.

**Risk:** Stakeholder receives incomplete data thinking it's comprehensive.

---

### AFTER - Protected Scenario:
Same export. Document clearly shows:
```
Applied Filters:
• School Level: Primary
• Gender: Female
```

**Benefit:** Impossible to be misunderstood. Stakeholder knows exactly what data they received.

---

## 9. Configuration Checklist for Admins

When exporting reports, verify:

- [ ] If filtering by **gender** → Check PDF shows "Male", "Female", "Boys", or "Girls"
- [ ] If filtering by **school level** → Check PDF shows correct level including "Base" if applicable
- [ ] If filtering by **competition level** → Check "Zone", "Sub-County", "County", "Region", or "National" is shown
- [ ] If **unfiltered** → PDF header shows no "Applied Filters" section (normal, not an error)
- [ ] Timestamp is present → Audit trail complete

---

## 10. Common Scenarios

### Scenario A: Coach wants qualified girls for training
**Export:** Qualified Teams, Female filter only
**PDF Shows:**
```
Applied Filters:
• Gender: Female
```
✓ Correct - shows only female athletes

---

### Scenario B: Vice-Principal needs base level results
**Export:** Rankings, Base level filter
**PDF Shows:**
```
Applied Filters:
• School Level: Base
```
✓ Correct - shows only in-school competition

---

### Scenario C: Regional Director needs all county-level rankings
**Export:** Overall Rankings, No filters applied
**PDF Shows:**
```
(No Applied Filters section)
```
✓ Correct - comprehensive data shown

---

### Scenario D: Principal needs female qualifiers from Primary only
**Export:** Qualified Teams, Gender: Female, School Level: Primary
**PDF Shows:**
```
Applied Filters:
• School Level: Primary
• Gender: Female
```
✓ Correct - clearly shows both filter parameters

---

## 11. Filter Persistence Notes

The system maintains filter state:
- **Session:** Filters stay while user is on the page
- **PDF Export:** Filters are captured at time of export
- **New Session:** Filters reset to defaults (no cross-session persistence)

---

## 12. Implementation Details

### Code Pattern Used:

```typescript
const filterDescriptions: string[] = [];

if (schoolLevelFilter && schoolLevelFilter !== 'all') {
  filterDescriptions.push(`School Level: ${levelLabels[schoolLevelFilter]}`);
}

if (genderFilter && genderFilter !== 'all') {
  filterDescriptions.push(`Gender: ${GENDER_LABELS[genderFilter]}`);
}

if (levelFilter && levelFilter !== 'all') {
  filterDescriptions.push(`Competition Level: ${levelFilter...}`);
}

// In PDF generation:
if (filterDescriptions.length > 0) {
  pdf.text('Applied Filters:', 8, yPos);
  yPos += 4;
  filterDescriptions.forEach(desc => {
    pdf.text(`• ${desc}`, 12, yPos);
    yPos += 4;
  });
}
```

This ensures:
- Filters only shown if actually applied
- Consistent formatting with bullet points
- Human-readable labels
- No hardcoded strings (uses constants)

---

## Testing Scenarios for Verification

1. ✓ Export with no filters → No "Applied Filters" section
2. ✓ Export with gender filter → Gender appears in header
3. ✓ Export with school level "Base" → Shows "Base" in header
4. ✓ Export with multiple filters → All appear with bullets
5. ✓ PDF title never misleading → Always reflects actual data shown

---

**Last Updated:** May 14, 2026  
**Version:** 1.0
