const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;
const MAX_BET = 300_000;

const sessions = new Map();

// --- FUNCIONES MATEMÁTICAS ---

function getCombination(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 1; i <= k; i++) {
        result = (result * (n - i + 1)) / i;
    }
    return Math.round(result);
}

function getMultiplier(mines, gemsFound) {
    const totalCells = 9;
    const totalGems = totalCells - mines;
    if (gemsFound <= 0) return 1.0;
    if (gemsFound > totalGems) return 0;
    
    const waysTotal = getCombination(totalCells, gemsFound);
    const waysGems = getCombination(totalGems, gemsFound);
    
    if (waysGems === 0) return 0;
    
    const fairMultiplier = waysTotal / waysGems;
    const rtp = 0.97; // 97% RTP (Retorno al Jugador)
    return parseFloat((fairMultiplier * rtp).toFixed(2));
}

function generateBoard(minesCount) {
    const board = Array(9).fill(false); // false = Gema, true = Mina
    let placed = 0;
    while (placed < minesCount) {
        const index = Math.floor(Math.random() * 9);
        if (!board[index]) {
            board[index] = true;
            placed++;
        }
    }
    return board;
}

// --- GENERADOR DE INTERFAZ DE DISCORD (CONTAINERBUILDER) ---

function buildMinasPanel(userId, session, isGameOver = false, won = false, tax = 0) {
    const container = new ContainerBuilder();
    
    // Asignar color de panel según estado
    if (isGameOver) {
        container.setAccentColor(won ? 0x27AE60 : 0xAE3D3D); // Verde tenue para victoria, Rojo tenue para derrota
    } else {
        container.setAccentColor(0x2F3136); // NotQuiteBlack para juego activo
    }
    
    const totalMines = session.minesCount;
    const gemsFound = session.gemsFound;
    const totalGems = 9 - totalMines;
    
    const currentMult = getMultiplier(totalMines, gemsFound);
    const nextMult = getMultiplier(totalMines, gemsFound + 1);
    
    const currentPayout = Math.floor(session.bet * currentMult);
    const nextPayout = Math.floor(session.bet * nextMult);
    
    let description = "";
    if (isGameOver) {
        if (won) {
            const isPerfect = gemsFound === totalGems;
            description = isPerfect
                ? `### 🏆 ¡Victoria Perfecta!\n` +
                  `¡Encontraste todas las gemas en el campo de minas sin explotar!\n` +
                  `Ganancia total: **${COIN}${currentPayout.toLocaleString()}** (${currentMult}x)`
                : `### 💰 ¡Te retiraste!\n` +
                  `Supiste cuándo parar.\n` +
                  `Ganancia total: **${COIN}${currentPayout.toLocaleString()}** (${currentMult}x)`;
            
            if (tax > 0) {
                const finalProfit = currentPayout - tax;
                description += `\n🏛️ **Impuesto del Banco (10%):** -${COIN}**${tax.toLocaleString("es-DO")}**\n` +
                               `Total recibido: **${COIN}${finalProfit.toLocaleString("es-DO")}**`;
            }
        } else {
            description = `### 💥 ¡BOOM! Pisaste una mina\n` +
                          `El campo de minas explotó y perdiste todo.\n` +
                          `Apuesta perdida: **${COIN}${session.bet.toLocaleString()}**`;
        }
    } else {
        description = `### 💣 Campo de Minas\n` +
                      `Apuesta inicial: **${COIN}${session.bet.toLocaleString()}** (Minas: **${totalMines}**)\n` +
                      `Gemas encontradas: **💎 ${gemsFound} / ${totalGems}**\n` +
                      `Acumulado actual: **${COIN}${currentPayout.toLocaleString()}** (${currentMult}x)\n` +
                      (gemsFound < totalGems ? `Siguiente gema: **${COIN}${nextPayout.toLocaleString()}** (${nextMult}x)` : `¡Ya no quedan gemas!`);
        
        if (gemsFound < 2 && totalGems >= 2) {
            description += `\n\n⚠️ *Debes encontrar al menos 2 gemas para poder retirarte.*`;
        }
    }
    
    container.addTextDisplayComponents(t => t.setContent(description));
    container.addSeparatorComponents(s => s);
    
    // Crear el tablero 3x3 de botones
    for (let r = 0; r < 3; r++) {
        container.addActionRowComponents(row => {
            const buttons = [];
            for (let c = 0; c < 3; c++) {
                const index = r * 3 + c;
                const isMine = session.board[index];
                const isRevealed = session.revealed[index];
                
                const btn = new ButtonBuilder();
                
                if (isGameOver) {
                    btn.setDisabled(true);
                    if (isMine) {
                        if (isRevealed) {
                            btn.setCustomId(`minas_cell_${userId}_${index}`)
                               .setEmoji("💥")
                               .setStyle(ButtonStyle.Danger);
                        } else {
                            btn.setCustomId(`minas_cell_${userId}_${index}`)
                               .setEmoji("💣")
                               .setStyle(ButtonStyle.Secondary);
                        }
                    } else {
                        btn.setCustomId(`minas_cell_${userId}_${index}`)
                           .setEmoji("💎")
                           .setStyle(isRevealed ? ButtonStyle.Success : ButtonStyle.Primary);
                    }
                } else {
                    if (isRevealed) {
                        btn.setCustomId(`minas_cell_${userId}_${index}`)
                           .setEmoji("💎")
                           .setStyle(ButtonStyle.Success)
                           .setDisabled(true);
                    } else {
                        btn.setCustomId(`minas_click_${userId}_${index}`)
                           .setEmoji("❓")
                           .setStyle(ButtonStyle.Secondary);
                    }
                }
                buttons.push(btn);
            }
            return row.setComponents(buttons);
        });
    }
    
    // Fila adicional para el botón de Retirarse
    if (!isGameOver) {
        container.addActionRowComponents(row =>
            row.setComponents(
                new ButtonBuilder()
                    .setCustomId(`minas_cashout_${userId}`)
                    .setLabel(`💰 Retirarse (${currentPayout.toLocaleString()})`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(gemsFound < 2)
            )
        );
    }
    
    return container;
}

// --- GESTIÓN DE TIMEOUT PARA EXPIRACIÓN ---

function resetSessionTimeout(userId, interaction) {
    const session = sessions.get(userId);
    if (!session) return;
    if (session.timeout) clearTimeout(session.timeout);
    
    session.timeout = setTimeout(async () => {
        const s = sessions.get(userId);
        if (s) {
            const currentMult = getMultiplier(s.minesCount, s.gemsFound);
            const payout = Math.floor(s.bet * currentMult);
            
            let tax = 0;
            let finalPayout = payout;
            if (payout > s.bet) {
                tax = Math.floor((payout - s.bet) * 0.1);
                finalPayout = payout - tax;
            }
            
            await userService.addBalance(userId, finalPayout, false);
            await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
            
            if (tax > 0) {
                await userService.addBalance("server_bank", tax, false);
                await transactionService.logTransaction({
                    discordId: "server_bank",
                    type: "bank_tax",
                    amount: tax,
                    itemName: `Impuesto sobre apuesta de <@${userId}>`
                });
            }
            
            sessions.delete(userId);
            
            try {
                const msg = await interaction.channel.messages.fetch(s.messageId).catch(() => null);
                if (msg) {
                    const expiredContainer = new ContainerBuilder()
                        .setAccentColor(0x2F3136)
                        .addTextDisplayComponents(t =>
                            t.setContent(
                                `### ⏳ Partida Expirada\n` +
                                `La partida de minas de <@${userId}> expiró por inactividad. Se retiró automáticamente **${COIN}${finalPayout.toLocaleString()}** (Gemas: **${s.gemsFound}**)` +
                                (tax > 0 ? ` (Impuesto de 10%: -${COIN}${tax.toLocaleString()})` : "") +
                                `.`
                            )
                        );
                    await msg.edit({ components: [expiredContainer], flags: MessageFlags.IsComponentsV2 });
                }
            } catch (e) {
                console.error("Error al expirar partida de minas:", e);
            }
        }
    }, 3 * 60 * 1000); // 3 minutos de inactividad
}

// --- COMANDO SLASH ---

module.exports = {
    cooldown: GAME_COOLDOWN,
    data: new SlashCommandBuilder()
        .setName("minas")
        .setDescription("Juega al Campo de Minas. Encuentra gemas y evita minas para multiplicar tu apuesta.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription(`Monedas a apostar (máx ${MAX_BET.toLocaleString()})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_BET)
        )
        .addIntegerOption(o =>
            o.setName("mines")
                .setDescription("Número de minas ocultas (1 a 8, por defecto 2)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(8)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger("amount");
        const minesCount = interaction.options.getInteger("mines") || 2;

        await userService.createUser(userId, interaction.user.username);

        // Controlar si ya tiene una sesión abierta
        if (sessions.has(userId)) {
            interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
            return interaction.reply({ content: "Ya tienes una partida de minas en curso. Termínala antes de empezar otra.", flags: MessageFlags.Ephemeral });
        }

        const currentBalance = await userService.getBalance(userId);
        if (currentBalance < bet) {
            interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
            return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
        }

        // Restar balance inicial
        await userService.addBalance(userId, -bet, false);

        // Generar estado de juego
        const session = {
            userId,
            bet,
            minesCount,
            board: generateBoard(minesCount),
            revealed: Array(9).fill(false),
            gemsFound: 0,
            messageId: null,
            channelId: interaction.channelId,
            timeout: null,
            processing: false
        };

        sessions.set(userId, session);

        // Enviar tablero inicial
        const panel = buildMinasPanel(userId, session);
        await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        
        // Obtener ID del mensaje para el sistema de timeout
        const msg = await interaction.fetchReply();
        session.messageId = msg.id;

        resetSessionTimeout(userId, interaction);
    }
};

// --- HANDLER DE EVENTOS DE BOTONES ---

module.exports.buttonHandler = async (interaction) => {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("minas_")) return false;

    const parts = interaction.customId.split("_");
    const action = parts[1];
    const userId = parts[2];

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esta no es tu partida de minas.", flags: MessageFlags.Ephemeral });
    }

    const session = sessions.get(userId);
    if (!session) {
        return interaction.reply({ content: "Esta partida ya ha terminado o expiró.", flags: MessageFlags.Ephemeral });
    }

    // Lock de procesamiento antipánico para clics rápidos
    if (session.processing) {
        try {
            await interaction.deferUpdate();
        } catch {}
        return true;
    }
    session.processing = true;

    try {
        if (action === "click") {
            const cellIndex = parseInt(parts[3], 10);
            session.revealed[cellIndex] = true;
            
            const isMine = session.board[cellIndex];
            
            if (isMine) {
                // EXPLO EXPLO! Perdió todo
                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);
                
                await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });
                
                const loseContainer = buildMinasPanel(userId, session, true, false);
                await interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                return true;
            } else {
                // ¡Encontró una gema!
                session.gemsFound++;
                const totalGems = 9 - session.minesCount;
                
                if (session.gemsFound === totalGems) {
                    // Victoria perfecta automática
                    if (session.timeout) clearTimeout(session.timeout);
                    sessions.delete(userId);
                    
                    const multiplier = getMultiplier(session.minesCount, session.gemsFound);
                    const payout = Math.floor(session.bet * multiplier);
                    
                    let tax = 0;
                    let finalPayout = payout;
                    if (payout > session.bet) {
                        tax = Math.floor((payout - session.bet) * 0.1);
                        finalPayout = payout - tax;
                    }
                    
                    await userService.addBalance(userId, finalPayout, false);
                    await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
                    
                    if (tax > 0) {
                        await userService.addBalance("server_bank", tax, false);
                        await transactionService.logTransaction({
                            discordId: "server_bank",
                            type: "bank_tax",
                            amount: tax,
                            itemName: `Impuesto sobre apuesta de <@${userId}>`
                        });
                    }
                    
                    const winContainer = buildMinasPanel(userId, session, true, true, tax);
                    await interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
                    return true;
                } else {
                    // Sigue jugando
                    resetSessionTimeout(userId, interaction);
                    session.processing = false;
                    
                    const playContainer = buildMinasPanel(userId, session, false, false);
                    await interaction.update({ components: [playContainer], flags: MessageFlags.IsComponentsV2 });
                    return true;
                }
            }
        }

        if (action === "cashout") {
            const totalGems = 9 - session.minesCount;
            if (session.gemsFound < 2 && totalGems >= 2) {
                session.processing = false;
                return interaction.reply({ content: "Debes encontrar al menos 2 gemas antes de poder retirarte.", flags: MessageFlags.Ephemeral });
            }

            if (session.timeout) clearTimeout(session.timeout);
            sessions.delete(userId);
            
            const multiplier = getMultiplier(session.minesCount, session.gemsFound);
            const payout = Math.floor(session.bet * multiplier);
            
            let tax = 0;
            let finalPayout = payout;
            if (payout > session.bet) {
                tax = Math.floor((payout - session.bet) * 0.1);
                finalPayout = payout - tax;
            }
            
            await userService.addBalance(userId, finalPayout, false);
            await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
            
            if (tax > 0) {
                await userService.addBalance("server_bank", tax, false);
                await transactionService.logTransaction({
                    discordId: "server_bank",
                    type: "bank_tax",
                    amount: tax,
                    itemName: `Impuesto sobre apuesta de <@${userId}>`
                });
            }
            
            const cashoutContainer = buildMinasPanel(userId, session, true, true, tax);
            await interaction.update({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
            return true;
        }
    } catch (error) {
        console.error("Error en minas buttonHandler:", error);
        session.processing = false;
        try {
            await interaction.reply({ content: "Ocurrió un error procesando tu movimiento.", flags: MessageFlags.Ephemeral });
        } catch {}
        return true;
    }
    
    return false;
};
