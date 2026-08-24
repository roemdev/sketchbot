# Changelog

All notable changes to **SketchBot** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **`/robar`** — Nuevo comando independiente de robo a usuarios. El ladrón elige una víctima con @mención; si tiene éxito roba un % de su balance total de la cartera. Si falla, recibe una multa basada en su propio balance total (con posible deuda).

### Fixed
- **`/balance` — `DiscordAPIError[10062]`:** Añadido `deferReply()` en la ejecución principal y `deferUpdate()` en el manejador de botones (`buttonHandler`) antes de las llamadas a Supabase para evitar que la interacción expire si la BD tarda más de 3 segundos. Se ajustaron las respuestas posteriores a `editReply`/`followUp`.
- **`/balance` — Botón "Depositar 10%":** El mensaje de error del límite del banco estaba hardcodeado en `2,000,000`; ahora usa `config.bank.maxLimit` dinámicamente.

### Changed
- **Límite del banco** aumentado de **2,000,000** a **6,000,000** monedas (`bank.maxLimit` en `economy.json` y descripción de `/depositar`).
- **Sistema de penalizaciones por crimen** actualizado: la multa ahora se calcula sobre el **balance total del usuario** (cartera + banco), pero se descuenta únicamente de la **cartera**. Si la cartera no tiene fondos suficientes, el saldo queda **negativo** (deuda) y se cubre automáticamente con las próximas ganancias.

### Removed
- **Smash eliminado por completo:** bloque `smash` de `economy.json` y la propiedad `smash` de `utils/config.js` eliminados (el comando `smash.js` había sido removido en una sesión anterior).

---

## [1.0.0] - 2026-08-24

### Added
- Initial release of SketchBot with full closed-loop macroeconomic system.
- **Economy system**: `/balance`, `/banco`, `/casino`, `/depositar`, `/retirar`, `/swap`, `/store`, `/storeConfig`, `/economia` (admin), `/emergencia`, `/transfer`, `/clasificacion`.
- **Games**: `/blackjack` (interactive 21 vs dealer), `/cara-cruz` (coinflip), `/minas` (3×3 minefield), `/torre` (risk tower), `/cartas` (collectible card system with pack opening).
- **Collectible card system** (`setupSobres.js`): Pack purchasing, daily rewards, rarity tiers, interactive card reveals with image precaching.
- **Daily rewards**: `/diario` (daily claim deducted from `server_bank`), role-based reward configuration.
- **Levels system**: XP gain via chat and voice channels, automatic role sync, `/nivel`, `/manageXp`, `/resetXp`, `/syncRoles`.
- **Utility**: `/ping`, `/leave`, `/resetCooldown`, `setupColors`, `setupVoice`.
- **Crime system** (`/crimen`): Robbery, fraud, and hacking with fines deposited into `server_bank`.
- **Coins-to-credits conversion** (`/coinsToCredits`): Integration with Paymenter.
- **Giveaway system**: Full giveaway lifecycle management with persistence and automated resolution.
- **Minecraft RCON integration** via `minecraftService.js`.
- **AI integration** via Ollama (local LLM).
- Supabase (PostgreSQL) backend with service role key security.
- Closed-loop accounting: `server_bank` and `server_casino` as the two fiscal vaults.
- Docker + docker-compose support for containerized deployment.
- Stylized startup diagnostic banner.
- `economy.json`, `levels.json`, `settings.json`, `cards.json`, `blackjackCards.json` as centralized config files.

### Fixed
- Defer interaction and switch to `followUp`/`editReply` in `dailyClaim` to prevent timeout errors.
- Properly handle serialized card data containing underscores in the sobres reveal command.

### Changed
- Renamed Arkania envelope system to **collectible cards** in setup message.
- Rewrote `riskTower` game logic and added task tracker service.
- Updated pack reset logic from daily to **12-hour intervals** based on UTC-4 time.
- Updated giveaway container accent colors for active and ended statuses.
- Adjusted economy pack rarity weights to reduce legendary and higher-tier drops.
- Replaced pagination button labels with emojis; switched to `interaction.update` for state transitions in classification rankings.
- Updated rank formatting and replaced pagination emojis in classification command.
- Updated classification button custom IDs to use descriptive action prefixes.

---

[Unreleased]: https://github.com/roemdev/sketchbot/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/roemdev/sketchbot/releases/tag/v1.0.0
