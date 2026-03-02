# Bolt's Journal

## 2024-03-01 - Redundant SELECT after UPDATE
**Learning:** Found a pattern where state mutation methods (`addBalance`, `removeBalance`, `updateUsername`) perform an `UPDATE` followed immediately by a `SELECT` to return the updated entity, even when callers don't need the updated entity. In high-frequency paths (like economy commands), this doubles the database load unnecessarily.
**Action:** Always check if the caller actually needs the updated entity before returning it. Return the database execution result instead to save a query.
