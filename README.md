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
*   Una base de datos [MySQL](https://www.mysql.com/).
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
    "host": "localhost",
    "user": "root",
    "password": "tu_password_mysql",
    "name": "nombre_base_de_datos"
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
Debes crear una base de datos MySQL y las tablas necesarias. A continuación se muestra un esquema sugerido basado en el código:

```sql
CREATE TABLE IF NOT EXISTS user_stats (
    discord_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100),
    balance INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    server_id VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS store (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    price INT,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'out_of_stock'
    minecraft_item VARCHAR(100) -- Comando o ID del ítem para Minecraft
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(20),
    type VARCHAR(20), -- 'buy', 'swap', 'task'
    item_name VARCHAR(100),
    mc_nick VARCHAR(50),
    amount INT,
    total_price INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cooldowns (
    discord_id VARCHAR(20),
    command VARCHAR(50),
    expires_at DATETIME,
    PRIMARY KEY (discord_id, command)
);
```

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
