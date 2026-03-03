# Bolt's Journal

## 2024-03-01 - Redundant SELECT after UPDATE
**Learning:** Found a pattern where state mutation methods (`addBalance`, `removeBalance`, `updateUsername`) perform an `UPDATE` followed immediately by a `SELECT` to return the updated entity, even when callers don't need the updated entity. In high-frequency paths (like economy commands), this doubles the database load unnecessarily.
**Action:** Always check if the caller actually needs the updated entity before returning it. Return the database execution result instead to save a query.

## 2024-03-02 - Redundant SELECT after INSERT
**Learning:** Found a performance bottleneck where `userService.createUser` always performed an `INSERT OR IGNORE` followed by an immediate `SELECT` (via `getUser`) to return the user object, even when callers only needed to guarantee the user's existence and ignored the returned object. In high-frequency commands like economy and games, this resulted in an unnecessary database query.
**Action:** Modified `createUser` to accept a `returnUser` boolean parameter (defaulting to `true` for backward compatibility). Updated callers that don't need the user object (like `manageCredits`, `task`, `transfer`, `coinflip`, `giftbox`, `riskTower`) to pass `false`, skipping the redundant `SELECT` query.
