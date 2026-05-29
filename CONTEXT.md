# Ficha de Contexto y Alineación de SketchBot (CONTEXT.md)

Este documento está diseñado para ser entregado a los asistentes de desarrollo de IA (como Antigravity) al iniciar cualquier sesión posterior de Pair Programming. Contiene la especificación completa, arquitectura, reglas contables y guías de desarrollo de **SketchBot**.

---

## 📋 Resumen del Proyecto

**SketchBot** es un bot de Discord premium desarrollado sobre **Discord.js v14**, integrado con **Supabase** (PostgreSQL) y con soporte para **RCON de Minecraft** e **Inteligencia Artificial local (Ollama)**. 

Su característica distintiva es un **ecosistema macroeconómico de circuito cerrado** (de suma cero), donde las monedas no se crean de la nada en los juegos, sino que fluyen a través de arcas públicas y privadas bien balanceadas.

---

## 🏛️ Sistema Contable y Macroeconomía (Closed-Loop)

Toda la economía del servidor se basa en la transferencia física de monedas entre las cuentas de los usuarios y dos fondos de reserva centrales:

### 1. El Banco del Servidor (`server_bank`)
*   **Propósito:** Actúa como el tesoro público del servidor y financia las recompensas de la comunidad.
*   **Fuentes de Ingresos (Sinks):**
    *   **Trabajo (`/trabajo`):** Cada trabajo inyecta monedas (entre `100,000` y `240,000` según `economy.json`) al banco.
    *   **Impuesto a las Ganancias (10%):** En `/blackjack`, `/minas`, `/torre`, `/cara-cruz` y `/smash`, el 10% (dinámico desde `economy.json`) de la ganancia neta del ganador se extrae de la bóveda del casino y se deposita en el banco.
    *   **Impuesto del Casino (20%):** El casino paga al banco el 20% (dinámico desde `economy.json`) de cada apuesta perdida por los jugadores.
    *   **Multas por Delincuencia:** Las multas cobradas de `/crimen` fallidos (Robos, Fraude o Hackeo) se depositan en el banco.
*   **Egresos (Sources):**
    *   **Subsidio Diario (`/diario`):** Se deduce íntegramente de `server_bank`. Si el banco tiene menos balance que el premio diario del usuario, se declara en **Quiebra Central** y rechaza la reclamación temporalmente.
    *   **Premios por Subida de Nivel:** Los premios financieros otorgados al subir de nivel (por chat o canales de voz) se debitan del banco central.

### 2. El Casino del Servidor (`server_casino`)
*   **Propósito:** Funciona como la casa de juego independiente y custodia todos los pozos de apuestas.
*   **Fuentes de Ingresos (Sinks):**
    *   **Apuestas Iniciales:** El 100% de la apuesta de `/blackjack`, `/minas`, `/torre`, `/cara-cruz` y `/smash` se extrae del jugador y se ingresa en el casino.
*   **Egresos (Sources):**
    *   **Pago de Premios:** El 100% del premio bruto ganado se debita del casino (el jugador recibe el premio neto y el impuesto del 10% va al banco).
    *   **Impuesto de Pérdidas:** Al perder el jugador, el casino le paga al banco el 20% de la apuesta retenida.
    *   **Impuesto de Ganancias:** Al ganar el jugador, el casino paga el impuesto sobre la ganancia neta al banco.

---

## 📂 Arquitectura de Directorios

```
sketchbot/
├── assets/                # Assets gráficos y visuales del bot
│   ├── banco.png          # Banner panorámico 16:9 del banco central
│   └── casino.png         # Banner panorámico 16:9 de la bóveda del casino
├── commands/              # Comandos de barra (Slash) de Discord
│   ├── dailyRewards/
│   │   ├── dailyClaim.js  # Reclamación diaria (/diario)
│   │   ├── rewardList.js  # Listado de premios
│   │   └── roleRewards.js # Configuración de recompensas por rol
│   ├── economy/
│   │   ├── balance.js     # Consulta de balance personal
│   │   ├── banco.js       # Visualización de arcas fiscales (/banco)
│   │   ├── casino.js      # Visualización de arcas del casino (/casino)
│   │   ├── crimen.js      # Delitos e infracciones (/crimen)
│   │   ├── depositar.js   # Depósitos en el banco
│   │   ├── retirar.js     # Retiros del banco
│   │   ├── task.js        # Trabajo interactivo (/trabajo)
│   │   ├── store.js       # Tienda virtual (/store)
│   │   ├── storeConfig.js # Configuración de la tienda (/storeConfig)
│   │   ├── swap.js        # Conversión de monedas a créditos (/swap)
│   │   └── coinsToCredits.js # Conversión de monedas a créditos Paymenter
│   ├── games/
│   │   ├── blackjack.js   # Blackjack interactivo 21 contra el dealer
│   │   ├── coinflip.js    # Coinflip / cara-cruz de apuestas
│   │   ├── minas.js       # Campo de minas interactivo 3x3
│   │   ├── riskTower.js   # Torre de riesgo interactiva
│   │   └── smash.js       # Apuestas multijugador hosteadas para Smash Bros
│   ├── levels/
│   │   ├── manageXp.js    # Control administrativo de XP y niveles de usuarios
│   │   ├── nivel.js       # Visualización del nivel propio o de otro usuario
│   │   ├── resetXp.js     # Reseteo de nivel y XP
│   │   └── syncRoles.js   # Sincronización manual de roles de nivel
│   └── utility/
│       ├── leave.js       # Salir de un canal de voz
│       ├── ping.js        # Latencia y latencia de API del bot
│       ├── resetCooldown.js # Reinicio de enfriamientos de usuarios
│       ├── setupColors.js # Configuración de roles de colores autogestionados (renombrado a CamelCase)
│       └── setupVoice.js  # Configuración del canal de creación de voz temporal
├── data/                  # Base de datos de configuración local
│   ├── cards.json         # Emojis dinámicos de naipes de poker
│   ├── economy.json       # Centralizado: Parámetros de enfriamientos, tasas de apuestas y economía
│   ├── levels.json        # Centralizado: Rangos de XP, intervalos de voz y emojis de niveles
│   ├── settings.json      # Centralizado: Colores semánticos de embeds, canales temp y roles de colores
│   └── smash.json         # Base de datos de luchadores de Smash Bros con emojis
├── services/              # Lógica de negocio y conectores de base de datos
│   ├── dbService.js       # Conexión nativa a Supabase
│   ├── userService.js     # Creación, balance, XP y niveles de usuarios
│   ├── transactionService.js # Historial de transacciones de Supabase
│   ├── cooldownService.js # Enfriamientos en base de datos
│   ├── memoryCooldownService.js # Enfriamientos interactivos en memoria
│   ├── minecraftService.js # Conector RCON de Minecraft
│   ├── roleRewardService.js # Sincronización automática de roles de nivel
│   ├── storeService.js    # Lógica de compras en la tienda
│   └── voiceXpService.js  # Escáner de voz de ganancia de XP y premios
├── utils/
│   ├── validation.js      # Validaciones y sanidad de inputs
│   ├── voiceController.js # Controlador e interacciones de voz temporal
│   └── config.js          # Agrupador y mezclador estructurado de configuraciones
├── config.json            # Credenciales de Discord, Supabase y Minecraft
├── index.js               # Punto de entrada principal del bot
└── deploy-commands.js     # Registrador de comandos slash con Discord API
```

---

## 🎨 Sistema de Colores y Estética Estándar

Es imperativo preservar estrictamente los colores semánticos definidos para mantener la identidad visual en todos los paneles (`ContainerBuilder`). Solo está permitido usar los siguientes cuatro colores:

*   **General-informativo y demás (NotQuiteBlack):** `2303786` (hex: `#23272A` / `0x23272A`). Utilizado para balances, clasificaciones, menús, configuraciones y empates/timeouts neutros.
*   **Fail / Derrota / Bust (DarkRed):** `10038562` (hex: `#992D22` / `0x992D22`). Utilizado para derrotas de juegos, colapsos, fallos y multas de crímenes.
*   **Éxito / Victoria / Payouts (DarkGreen):** `2067276` (hex: `#1F8B4C` / `0x1F8B4C`). Utilizado para reclamaciones diarias, subidas de nivel, victorias y cobros exitosos.
*   **Apuestas activas / Juegos (DarkPurple):** `7419530` (hex: `#71368A` / `0x71368A`). Utilizado para el estado activo de juegos en curso (torre, minas, blackjack, smash) y el balance del casino.

Los errores no llevan contenedor, sino texto plano y se responden en efímero.

---

## ⚙️ Reglas de Desarrollo y Buenas Prácticas

1.  **Suma Cero Absoluto:** Nunca uses `userService.addBalance` de forma aislada para dar recompensas de juego o niveles. Toda moneda que gane un jugador debe debitarse del Casino o del Banco Central, y toda moneda que pierda debe depositarse en las arcas correctas.
2.  **Seguridad Supabase:** Modifica siempre la base de datos utilizando la llave `serviceRoleKey` en `config.json` para evitar infracciones de RLS (Row-Level Security) en los procesos administrativos del bot.
3.  **Banners 16:9:** Los banners del banco y el casino deben cargarse desde `assets/banco.png` y `assets/casino.png` respectivamente. Deben ser imágenes con relación de aspecto panorámica **16:9** para evitar estiramientos no deseados en la interfaz de Discord.
4.  **Registro de Comandos:** Siempre que añadas o modifiques las firmas en `data` de algún comando, ejecuta `node deploy-commands.js` en la consola para reflejarlo en Discord API.
5.  **Sin Fallbacks en Código:** No utilices valores por defecto en variables de configuración (por ejemplo, `config.tasks.minBankEarn || 100000`). Todas las propiedades de configuración deben cargarse estrictamente desde sus archivos JSON centralizados (`economy.json`, `levels.json`, `settings.json`) para que el bot falle de forma inmediata y controlada si la configuración es incorrecta.
6.  **Emojis Personalizados:** Utiliza el archivo `data/cards.json` y el objeto `config.emojis` para evitar colocar textos planos o emojis por defecto, garantizando la experiencia visual premium diseñada.
