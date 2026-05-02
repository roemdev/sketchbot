<div align="center">
  <h1>🎨 Sketchbot</h1>
  <p>Un bot de Discord multifuncional desarrollado en Node.js, impulsado por Supabase y con inteligencia artificial integrada.</p>
</div>

**Sketchbot** es un avanzado bot de Discord diseñado para gestionar sistemas de economía, recompensas diarias, minijuegos, una tienda integrada con servidores de Minecraft y ahora, respuestas inteligentes potenciadas por IA.

---

## 🚀 Características Principales

Sketchbot está diseñado para fomentar la actividad y la interacción en tu servidor de Discord. Sus principales capacidades incluyen:

*   **🪙 Economía Completa:**
    *   Consultar balance (`/balance`).
    *   Ganar monedas realizando tareas (`/task`).
    *   Transferir monedas entre usuarios (`/transfer`).
    *   Intercambiar monedas o convertirlas a créditos (`/swap`, `/coinsToCredits`).
    *   Gestión administrativa de créditos (`/manageCredits`).
*   **🎁 Recompensas y Fidelización:**
    *   Recompensas diarias para todos los usuarios (`/dailyClaim`).
    *   Recompensas exclusivas basadas en roles (`/roleRewards`).
    *   Lista de recompensas disponibles (`/rewardList`).
*   **🎲 Minijuegos (Gambling):**
    *   **Coinflip:** Apuesta cara o cruz para duplicar tu dinero (`/coinflip`).
    *   **Risk Tower:** Escala una torre de riesgo para multiplicar tus ganancias (`/riskTower`).
    *   **Smash:** Participa en el juego de "smash" (`/smash`).
*   **🛒 Tienda y Minecraft:**
    *   Sistema de tienda virtual (`/store`).
    *   Configuración de la tienda (`/storeConfig`).
    *   Integración directa con Minecraft mediante RCON.
*   **🤖 Inteligencia Artificial:**
    *   Menciona a `@Sketchbot` en cualquier canal y te responderá inteligentemente gracias a su integración nativa con **Ollama** (ideal para correr modelos locales como `phi4-mini`).
*   **🎤 Gestión de Voz:**
    *   Creación automática de canales de voz temporales ("Join to Create").
    *   Configuración y personalización de utilidades de voz y colores (`/setupVoice`, `/setup-colors`).
*   **☁️ Base de Datos Moderna:**
    *   Totalmente migrado a **Supabase** para un rendimiento y escalabilidad óptimos.

## 📋 Requisitos Previos

Para instalar y ejecutar este bot, necesitarás:

*   [Node.js](https://nodejs.org/) (v22.22.1 o superior recomendado).
*   Un proyecto en [Supabase](https://supabase.com/) (para la base de datos PostgreSQL).
*   Un servidor con [Ollama](https://ollama.com/) (opcional, si deseas habilitar la IA integrada).
*   Un servidor de Minecraft (opcional, si deseas usar la integración de la tienda).

## 🛠️ Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/roemdev/sketchbot.git
    cd sketchbot
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

## ⚙️ Configuración

### 1. Archivo `config.json`
Debes crear un archivo llamado `config.json` en la raíz del proyecto. Este archivo contiene las credenciales sensibles, incluyendo las nuevas de Supabase.

```json
{
  "token": "TU_TOKEN_DE_DISCORD_AQUI",
  "clientId": "TU_CLIENT_ID_DE_LA_APLICACION",
  "guildId": "TU_ID_DEL_SERVIDOR_(GUILD)",
  "supabase": {
    "url": "https://TU_PROYECTO.supabase.co",
    "serviceRoleKey": "TU_SERVICE_ROLE_KEY"
  },
  "rcon": {
    "host": "ip_servidor_minecraft",
    "port": 25575,
    "password": "password_rcon"
  }
}
```

### 2. Archivo `core.json`
Este archivo controla la lógica del juego y la economía. Puedes ajustarlo según tus necesidades:

*   **economy:** Tasa de cambio y moneda.
*   **emojis:** Emojis usados por el bot.
*   **tasks:** Configuración de ganancias mínimas/máximas, duración y enfriamiento.
*   **dailyClaim:** Tiempo de espera para la recompensa diaria.
*   **game:** Cooldown general para juegos.
*   **voice:** Configuraciones de "Join to Create".
*   **smash:** Configuraciones del juego Smash.

## ▶️ Ejecución y Uso

1.  **Registrar Comandos:**
    Antes de iniciar el bot por primera vez (o al añadir nuevos comandos), debes registrarlos en Discord:
    ```bash
    node deploy-commands.js
    ```

2.  **Iniciar el Bot:**
    ```bash
    node index.js
    ```
    *(Recomendamos usar `pm2` o similar para mantener el bot activo en producción).*

## 📜 Lista de Comandos

### 🪙 Economía
*   `/balance [user]`: Muestra tu saldo o el de otro usuario.
*   `/task`: Realiza una tarea para ganar monedas.
*   `/transfer <user> <amount>`: Transfiere monedas a otro usuario.
*   `/swap <amount>`: Intercambia monedas.
*   `/coinsToCredits <amount>`: Convierte tus monedas en créditos.
*   `/manageCredits <add|remove> <user> <amount>`: (Admin) Añade o quita créditos.

### 🎲 Juegos
*   `/coinflip <amount> <side>`: Apuesta a cara o cruz.
*   `/riskTower <amount>`: Juega al Risk Tower.
*   `/smash`: Inicia una partida de Smash.

### 🛒 Tienda
*   `/store`: Muestra los ítems disponibles.
*   `/storeConfig`: (Admin) Configura los ítems de la tienda.

### 🎁 Recompensas
*   `/dailyClaim`: Reclama tu recompensa diaria.
*   `/roleRewards`: Reclama recompensas por tus roles.
*   `/rewardList`: Ve la lista de recompensas.

### 🛠️ Utilidades
*   `/ping`: Comprueba la latencia del bot.
*   `/setupVoice`: Configura el canal "Join to Create".
*   `/setup-colors`: Configura roles de colores en el servidor.
