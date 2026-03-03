## 2024-05-18 - [Missing Input Boundaries on Admin Commands]
**Vulnerability:** Admin commands that manage balances (`manageCredits.js`) lacked minimum value constraints on the amount integer parameter.
**Learning:** Even administrative interfaces need strict boundary checking at the Discord slash command level (`.setMinValue(1)`). Otherwise, a negative input on a "remove" operation becomes addition (`balance - (-100)`), allowing an admin account to accidentally or maliciously bypass restrictions.
**Prevention:** Always add `.setMinValue(1)` (or appropriate bounds) to numeric options in Discord.js `SlashCommandBuilder` configs, especially for economy/balance modifying endpoints.

## 2024-05-18 - [SQLite Silent Updates Bypass Balance Checks]
**Vulnerability:** Game economy commands (`coinflip.js`, `giftbox.js`, `riskTower.js`) relied on `addBalance(user, -bet)` and a `try-catch` block to check for insufficient funds. However, SQLite `UPDATE` statements do not throw an error when a balance goes negative, nor does `db.run` throw an error when `changes === 0` (such as when `WHERE balance >= bet` fails). This allowed users to accrue infinite negative debt.
**Learning:** SQLite driver `db.run` operations (or raw `UPDATE` logic) will silently succeed with `changes: 0` if conditions aren't met, or blindly allow values to drop below 0 if unsigned boundaries aren't strictly enforced.
**Prevention:** Always manually inspect `result.changes` after an `UPDATE` operation expected to modify a record, and manually throw an error if `changes === 0`. Furthermore, sanitize `addBalance` logic to gracefully handle negative amounts using a proper `removeBalance` check.
