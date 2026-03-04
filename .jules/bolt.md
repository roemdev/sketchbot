# Bolt's Journal

## 2024-03-01 - Redundant SELECT after UPDATE
**Learning:** Found a pattern where state mutation methods (`addBalance`, `removeBalance`, `updateUsername`) perform an `UPDATE` followed immediately by a `SELECT` to return the updated entity, even when callers don't need the updated entity. In high-frequency paths (like economy commands), this doubles the database load unnecessarily.
**Action:** Always check if the caller actually needs the updated entity before returning it. Return the database execution result instead to save a query.

## 2024-03-05 - Redundant SELECT after INSERT OR IGNORE
**Learning:** Similar to the mutation methods, `userService.createUser` uses `INSERT OR IGNORE` and immediately runs a `SELECT` query to fetch the user. This is often called simply to ensure a record exists before an operation, with the return value entirely discarded (e.g. in games or transactions). This creates unnecessary database queries.
**Action:** Extend the optional `returnUser = true` pattern to creation methods like `createUser`, passing `false` in routes that do not need the database record.
