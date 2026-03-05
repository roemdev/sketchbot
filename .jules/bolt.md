# Bolt's Journal

## 2024-03-01 - Missing index on balance for leaderboard queries
**Learning:** Found a missing index on the `balance` column of the `user_stats` table in SQLite. Because `/balance top-10` executes `ORDER BY balance DESC`, this previously caused a full table scan and sort across all users in the database, locking the database unnecessarily as user counts grow.
**Action:** Created `idx_user_stats_balance` descending index in SQLite DB initialization script to change this query from O(N log N) to O(1) fetching the top elements from the B-Tree index.

## 2024-03-01 - Redundant SELECT after UPDATE
**Learning:** Found a pattern where state mutation methods (`addBalance`, `removeBalance`, `updateUsername`) perform an `UPDATE` followed immediately by a `SELECT` to return the updated entity, even when callers don't need the updated entity. In high-frequency paths (like economy commands), this doubles the database load unnecessarily.
**Action:** Always check if the caller actually needs the updated entity before returning it. Return the database execution result instead to save a query.
