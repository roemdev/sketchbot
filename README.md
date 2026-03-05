# Sketchbot

**Sketchbot** es un bot de Discord multifuncional desarrollado en Node.js, diseñado para gestionar sistemas de economía, recompensas diarias, minijuegos y una tienda integrada con servidores de Minecraft. Además, ofrece utilidades para la gestión de canales de voz temporales.

## 🚀 Potencial y Características

Sketchbot está diseñado para fomentar la actividad y la interacción en tu servidor de Discord. Sus principales capacidades incluyen:

*   **Economía Completa:**
    *   Consultar balance (`/balance`).
    *   Ganar monedas realizando tareas (`/task`).
    *   Intercambiar monedas (`/swap`).
    *   Gestión administrativa de créditos (`/manageCredits`).
*   **Recompensas y Fidelización:**
    *   Recompensas diarias para todos los usuarios (`/dailyClaim`).
    *   Recompensas exclusivas basadas en roles (`/roleRewards`).
*   **Minijuegos (Gambling):**
    *   **Coinflip:** Apuesta cara o cruz para duplicar tu dinero (`/coinflip`).
    *   **Giftbox:** Abre una caja regalo con posibilidad de premio o nada (`/giftbox`).
    *   **Risk Tower:** Escala una torre de riesgo para multiplicar tus ganancias (`/riskTower`).
*   **Tienda y Minecraft:**
    *   Sistema de tienda virtual (`/store`).
    *   Compra de ítems que se entregan automáticamente en un servidor de Minecraft (`/buy`) mediante integración RCON.
*   **Gestión de Voz:**
    *   Creación automática de canales de voz temporales cuando los usuarios se unen a un canal "Join to Create".
*   **Utilidades:**
    *   Comandos de diagnóstico como `/ping`, `/uptime`.

## 📋 Requisitos Previos

Para instalar y ejecutar este bot, necesitarás:

*   [Node.js](https://nodejs.org/) (v16.9.0 o superior).
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
Debes crear un archivo llamado `config.json` en la raíz del proyecto. Este archivo contiene las credenciales sensibles.

```json
{
  "token": "TU_TOKEN_DE_DISCORD_AQUI",
  "clientId": "TU_CLIENT_ID_DE_LA_APLICACION",
  "guildId": "TU_ID_DEL_SERVIDOR_(GUILD)",
  "database": {
    "filename": "database.sqlite"
  },
  "rcon": {
    "host": "ip_servidor_minecraft",
    "port": 25575,
    "password": "password_rcon"
  }
}
```

### 2. Archivo `core.json`
Este archivo ya existe en el repositorio y controla la lógica del juego y la economía. Puedes ajustarlo según tus necesidades:

*   **economy:** Tasa de cambio.
*   **emojis:** Emojis usados por el bot.
*   **tasks:** Configuración de ganancias mínimas/máximas, duración y enfriamiento (cooldown).
*   **dailyClaim:** Tiempo de espera para la recompensa diaria.
*   **game:** Cooldown general para juegos.
*   **voice:** ID del canal de voz "Join to Create" y plantilla para el nombre de los canales temporales.

### 3. Configuración de la Base de Datos
El bot utiliza **SQLite** para el almacenamiento de datos. El archivo de la base de datos (por defecto `database.sqlite`) y todas las tablas necesarias se crearán automáticamente al ejecutar el bot por primera vez.

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

### Economía
*   `/balance [user]`: Muestra tu saldo o el de otro usuario.
*   `/task`: Realiza una tarea para ganar monedas.
*   `/swap <amount>`: Intercambia monedas (funcionalidad específica a definir).
*   `/manageCredits <add|remove> <user> <amount>`: (Admin) Añade o quita créditos.

### Juegos
*   `/coinflip <amount> <side>`: Apuesta a cara o cruz.
*   `/giftbox`: Abre una caja sorpresa.
*   `/riskTower <amount>`: Juega al Risk Tower.

### Tienda
*   `/store`: Muestra los ítems disponibles.
*   `/buy <item> [mc_nick]`: Compra un ítem. Si es para Minecraft, proporciona tu nick.

### Recompensas
*   `/dailyClaim`: Reclama tu recompensa diaria.
*   `/roleRewards`: Reclama recompensas por tus roles.

### Utilidades
*   `/ping`: Comprueba la latencia del bot.
*   `/uptime`: Muestra cuánto tiempo lleva activo el bot.
