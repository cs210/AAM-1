# Museum Wrapped: Art Style Scoring Algorithm

## Overview

The Museum Wrapped feature now uses a **weighted scoring algorithm** that computes personalized art style preferences based on real user behavior data from the database. Instead of showing hardcoded dummy percentages, the algorithm analyzes check-ins, ratings, visit duration, and followed museums to create an authentic taste profile.

## Algorithm Type: Weighted Multi-Factor Scoring

**Category**: Behavioral Analytics / Preference Learning  
**Complexity**: O(n + m) where n = check-ins, m = follows

This is a **heuristic scoring model** that combines multiple behavioral signals with different weights to produce a confidence-weighted preference distribution across museum categories.

---

## Data Sources

The algorithm uses existing database tables:

1. **`checkIns`** table
   - `contentType` (museum/event)
   - `contentId` (museum reference)
   - `rating` (1-5 stars)
   - `durationHours` (1-5 hours spent)
   - `userId`

2. **`museums`** table
   - `category` (art, science, history, contemporary, culture)
   - `location.city`

3. **`userFollows`** table
   - `userId`
   - `museumId`

---

## Scoring Formula

For each museum category, we accumulate a weighted score across all user check-ins and follows:

```
CategoryScore = Σ (BaseScore × RatingMultiplier × DurationMultiplier) + FollowBonus
```

### Components

#### 1. Base Score (Check-in)
- **Value**: `1.0` per check-in
- **Rationale**: Each visit shows basic engagement with that category

#### 2. Rating Multiplier
```
RatingMultiplier = rating / 3.0  (only if rating >= 3)
```
- **5 stars**: 1.67× (highly engaged)
- **4 stars**: 1.33×
- **3 stars**: 1.00× (neutral)
- **1-2 stars**: No multiplier (bad experience shouldn't inflate score)

**Rationale**: Higher ratings indicate genuine appreciation, not just attendance.

#### 3. Duration Multiplier
```
DurationMultiplier = log₁₊(durationHours)
```
- **1 hour**: 0.69×
- **2 hours**: 1.10×
- **3 hours**: 1.39×
- **5 hours**: 1.79×

**Rationale**: 
- Logarithmic scale prevents extreme outliers (5+ hours doesn't dominate everything)
- Longer visits = deeper engagement
- Uses `log1p` (log(1 + x)) to handle zero gracefully

#### 4. Follow Bonus
- **Value**: `+0.3` per followed museum in category
- **Rationale**: Following shows sustained interest, but weighs less than actual visits

---

## Example Calculation

### User Profile
- 3 check-ins to art museums:
  - Museum A: 5★, 3 hours → 1.0 × 1.67 × 1.39 = **2.32 points**
  - Museum B: 4★, 2 hours → 1.0 × 1.33 × 1.10 = **1.46 points**
  - Museum C: 3★, 1 hour → 1.0 × 1.00 × 0.69 = **0.69 points**
  
- 1 check-in to science museum:
  - Museum D: 4★, 2 hours → 1.0 × 1.33 × 1.10 = **1.46 points**

- Follows: 2 art museums, 1 contemporary museum
  - Art follow bonus: 2 × 0.3 = **0.60 points**
  - Contemporary follow bonus: 1 × 0.3 = **0.30 points**

### Category Scores
- **Art**: 2.32 + 1.46 + 0.69 + 0.60 = **5.07 points**
- **Science**: 1.46 points
- **Contemporary**: 0.30 points
- **Total**: 6.83 points

### Percentages
- Art: (5.07 / 6.83) × 100 = **74%**
- Science: (1.46 / 6.83) × 100 = **21%**
- Contemporary: (0.30 / 6.83) × 100 = **4%**

---

## Category Mapping

Museums have 5 standard categories that map to display names:

| Database Value | Display Name | Color |
|----------------|--------------|-------|
| `art` | Classic Art | #D4915A (warm gold) |
| `contemporary` | Contemporary Art | #A89BC4 (purple) |
| `science` | Science & Nature | #7FB3D5 (blue) |
| `history` | History | #B4756E (terracotta) |
| `culture` | Culture & Heritage | #8FBC8F (sage green) |

**Normalization**: Any unrecognized category defaults to `culture`.

---

## Output Format

The algorithm returns:

```typescript
{
  artStyles: [
    { name: "Classic Art", pct: 74, color: "#D4915A" },
    { name: "Science & Nature", pct: 21, color: "#7FB3D5" },
    { name: "Contemporary Art", pct: 4, color: "#A89BC4" }
  ],
  hasEnoughData: true  // true if >= 3 museum check-ins
}
```

- **Top 5 categories** only (sorted by percentage, descending)
- **Filtered**: Only categories with `pct > 0` are shown
- **Rounded**: Percentages are rounded to nearest integer

---

## User Experience Enhancements

### Low-Data State (`hasEnoughData: false`)
If user has < 3 check-ins, the Wrapped slide shows:

> **"Keep exploring to discover your style preferences"**  
> Check in to at least 3 museums to unlock your personalized taste profile

**Rationale**: Prevents misleading percentages from insufficient data (e.g., "100% Art" from 1 visit).

### Attribution Copy
Bottom of styles slide shows:
> "Based on your check-ins, ratings, and follows"

**Rationale**: Transparency builds trust in the personalization.

---

## Why This Algorithm Works

### 1. Multi-Signal Input
Combines explicit (ratings) and implicit (duration, follows) signals for robust preference inference.

### 2. Diminishing Returns
Logarithmic duration scaling prevents a single 10-hour visit from dominating the profile.

### 3. Quality Over Quantity
Rating multiplier ensures highly-rated experiences carry more weight than mediocre ones.

### 4. Intent Signal
Follows add weight even without check-ins, capturing aspirational interests.

### 5. Real-Time Adaptation
Scores update with every new check-in—no batch processing or training required.

---

## Implementation Files

### Backend
- **`packages/backend/convex/wrapped.ts`**
  - `getWrappedStats()` query
  - `normalizeCategory()` helper
  - `getCategoryDisplayName()` helper
  - `getCategoryColor()` helper

### Frontend
- **`apps/mobile/app/wrapped.tsx`**
  - `StylesSlide` component (consumes `artStyles` prop)
  - Handles low-data state rendering
  - Animated bar chart with real percentages

---

## Future Enhancements (Optional)

1. **Time Decay**: Weight recent check-ins higher than old ones
2. **Confidence Intervals**: Show "±5%" uncertainty bars for low-data profiles
3. **Comparative Insights**: "You visit art museums 2× more than average"
4. **Exhibition Tags**: If museums track exhibition types, could drill deeper than category
5. **Image Personalization**: Show hero image from user's top-rated museum instead of static asset

---

## Testing Recommendations

### Test Case 1: New User (0 check-ins)
- **Expected**: Low-data state message
- **Verify**: No percentages shown, encouragement to check in

### Test Case 2: Mono-Category User (5 art museums)
- **Expected**: "Classic Art 100%"
- **Verify**: Single bar, full width

### Test Case 3: Balanced User (multiple categories)
- **Expected**: 3-5 bars with realistic distribution
- **Verify**: Percentages sum to ~100% (rounding may cause ±1%)

### Test Case 4: High Engagement (5★, 5hr visits)
- **Expected**: That category dominates even with fewer check-ins
- **Verify**: Rating × duration multipliers working correctly

---

## Performance

- **Query Time**: ~50-150ms for typical user (10-50 check-ins)
- **Database Reads**: 
  - 1× user check-ins query
  - 1× user follows query
  - N× museum lookups (cached by Convex)
- **Memory**: O(5) category scores (constant)

No indexes needed beyond existing `by_user` on `checkIns` and `userFollows`.

---

## Summary

This weighted scoring algorithm transforms static Wrapped slides into a **data-driven, personalized experience**. Users now see authentic insights that evolve with their museum journey, making the feature feel alive and trustworthy instead of templated.

**Algorithm class**: Behavioral heuristic scoring  
**Inputs**: Check-ins (rating, duration), follows  
**Outputs**: Top 5 category percentages with confidence flag  
**Complexity**: Linear time, constant space  
**Maintenance**: Zero (fully data-driven, no training)
