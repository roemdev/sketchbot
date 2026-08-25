const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { logGameOutcome } = require("../../utils/discordLogger");

const GAME_COOLDOWN = config.games.cooldown;
const COIN = config.emojis.coin;
const MAX_BET = config.games.maxBet;

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

function getMultiplier(mines, gemsFound, rtp = config.games.minas.rtp) {
    const totalCells = 9;
    const totalGems = totalCells - mines;
    if (gemsFound <= 0) return 1.0;
    if (gemsFound > totalGems) return 0;
    
    const waysTotal = getCombination(totalCells, gemsFound);
    const waysGems = getCombination(totalGems, gemsFound);
    
    if (waysGems === 0) return 0;
    
    const fairMultiplier = waysTotal / waysGems;
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

function buildMinasPanel(userId, session, isGameOver = false, perfectWin = false, tax = 0) {
    const container = new ContainerBuilder();
    
    // Configurar color de panel según estado
    if (isGameOver) {
        if (perfectWin || session.gemsFound > 0) {
            container.setAccentColor(2067276); // DarkGreen
        } else {
            container.setAccentColor(10038562); // DarkRed
        }
    } else {
        container.setAccentColor(7419530); // DarkPurple
    }

    const currentMultiplier = getMultiplier(session.minesCount, session.gemsFound, session.rtp);
    const nextMultiplier = getMultiplier(session.minesCount, session.gemsFound + 1, session.rtp);
    
    const currentPayout = Math.floor(session.bet * currentMultiplier);
    
    let description = `### 💣 Campo de Minas\n` +
                      `Jugador: <@${userId}>\n` +
                      `Apuesta inicial: **${COIN}${session.bet.toLocaleString()}**\n` +
                      `Minas ocultas: **${session.minesCount}** | Gemas encontradas: **${session.gemsFound}**\n\n`;

    if (isGameOver) {
        if (perfectWin) {
            const profit = currentPayout - session.bet;
            const finalTax = tax > 0 ? tax : Math.floor(profit * config.games.winTaxRate);
            const reward = currentPayout - finalTax;
            description += `🏆 **¡PERFECTO!** Encontraste todas las gemas libres. Te llevas **${COIN}${reward.toLocaleString()}** *(Impuesto del banco (${(config.games.winTaxRate * 100).toFixed(0)}%): -${COIN}${finalTax.toLocaleString()})*`;
        } else if (session.gemsFound > 0) {
            const profit = currentPayout - session.bet;
            const finalTax = tax > 0 ? tax : Math.floor(profit * config.games.winTaxRate);
            const reward = currentPayout - finalTax;
            description += `💰 **¡Te retiraste!** Ganaste **${COIN}${reward.toLocaleString()}** con un multiplicador de **${currentMultiplier}x** *(Impuesto de banco: -${COIN}${finalTax.toLocaleString()})*`;
        } else {
            description += `💥 **¡PUM!** Pisaste una mina. Perdiste tu apuesta de **${COIN}${session.bet.toLocaleString()}**.`;
        }
    }
    
    if (session.cashbackText) {
        description += session.cashbackText;
    }

    container.addTextDisplayComponents(t => t.setContent(description));
    container.addSeparatorComponents(s => s);

    // Renderizar tablero 3x3
    for (let r = 0; r < 3; r++) {
        container.addActionRowComponents(row => {
            const buttons = [];
            for (let c = 0; c < 3; c++) {
                const index = r * 3 + c;
                const isRevealed = session.revealed[index];
                const isMine = session.board[index];
                
                const btn = new ButtonBuilder()
                    .setCustomId(`minas_click_${userId}_${index}`);
                
                if (isGameOver) {
                    btn.setDisabled(true);
                    if (isMine) {
                        btn.setEmoji("💣").setStyle(ButtonStyle.Danger);
                    } else if (isRevealed) {
                        btn.setEmoji("💎").setStyle(ButtonStyle.Success);
                    } else {
                        btn.setEmoji("⬜").setStyle(ButtonStyle.Secondary);
                    }
                } else {
                    if (isRevealed) {
                        btn.setEmoji("💎").setStyle(ButtonStyle.Success).setDisabled(true);
                    } else {
                        btn.setEmoji("❓").setStyle(ButtonStyle.Secondary);
                    }
                }
                buttons.push(btn);
            }
            return row.setComponents(buttons);
        });
    }

    // Agregar botón de cashout si el juego sigue activo
    if (!isGameOver) {
        container.addSeparatorComponents(s => s);
        container.addActionRowComponents(row => {
            const totalGems = 9 - session.minesCount;
            // Solo permitir cashout si ha descubierto al menos 2 gemas (o el máximo si hay más de 7 minas)
            const canCashout = session.gemsFound >= 2 || totalGems < 2;
            
            return row.setComponents(
                new ButtonBuilder()
                    .setCustomId(`minas_cashout_${userId}`)
                    .setLabel("💰 Retirar monedas")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!canCashout)
            );
        });
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
            // Auto cashout en la última cantidad ganada en caso de expirar
            const multiplier = getMultiplier(s.minesCount, s.gemsFound, s.rtp);
            const payout = Math.floor(s.bet * multiplier);
            
            let tax = 0;
            let finalPayout = payout;
            if (payout > s.bet) {
                tax = Math.floor((payout - s.bet) * config.games.winTaxRate);
                finalPayout = payout - tax;
            }
            
            await userService.addBalance(userId, finalPayout, false);
            await userService.addBalance("server_casino", -finalPayout, false);
            await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Retiro Expiración Minas de <@${userId}>` });
            await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
            
            if (tax > 0) {
                await userService.addBalance("server_casino", -tax, false);
                await userService.addBalance("server_bank", tax, false);
                await transactionService.logTransaction({
                    discordId: "server_casino",
                    type: "bank_withdrawal",
                    amount: -tax,
                    itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco`
                });
                await transactionService.logTransaction({
                    discordId: "server_bank",
                    type: "bank_tax",
                    amount: tax,
                    itemName: `Impuesto sobre apuesta de <@${userId}>`
                });
            }
            
            sessions.delete(userId);

            // Log a Discord
            await logGameOutcome(s.interaction || interaction, "Minas (Expirado)", s.bet, finalPayout - s.bet, true);
            
            try {
                const expiredContainer = new ContainerBuilder()
                    .setAccentColor(2303786)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `### ⏳ Partida Expirada\n` +
                            `La partida de minas de <@${userId}> expiró por inactividad. Se retiró automáticamente **${COIN}${finalPayout.toLocaleString()}** (Gemas: **${s.gemsFound}**)` +
                            (tax > 0 ? ` (Impuesto de 10%: -${COIN}${tax.toLocaleString()})` : "") +
                            `.`
                        )
                    );
                await s.interaction.editReply({ components: [expiredContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch (e) {
                console.error("Error al expirar partida de minas:", e);
            }
        }
    }, 3 * 60 * 1000); // 3 minutos de inactividad
}

async function initGame(interaction, bet, minesCount, isEphemeral) {
    const userId = interaction.user.id;

    // Diferir respuesta al principio para evitar el límite de los 3 segundos
    await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

    const user = await userService.createUser(userId, interaction.user.username);

    // Controlar si ya tiene una sesión abierta
    if (sessions.has(userId)) {
        if (!isEphemeral) {
            interaction.client.cooldowns.get("minas")?.delete(userId);
        }
        return interaction.editReply({ 
            content: "Ya tienes una partida de minas en curso. Termínala antes de empezar otra."
        });
    }

    const currentBalance = await userService.getBalance(userId);
    if (currentBalance < bet) {
        if (!isEphemeral) {
            interaction.client.cooldowns.get("minas")?.delete(userId);
        }
        return interaction.editReply({ 
            content: "No tienes suficientes monedas para esa apuesta."
        });
    }

    // Restar balance inicial y depositar en el casino
    await userService.addBalance(userId, -bet, false);
    await userService.addBalance("server_casino", bet, false);
    await transactionService.logTransaction({
        discordId: "server_casino",
        type: "bank_deposit",
        amount: bet,
        itemName: `Apuesta Campo de Minas de <@${userId}>`
    });

    // Generar estado de juego
    let sessionRtp = config.games.minas.rtp;
    if (user && user.profession === "gambler") {
        sessionRtp += 0.05; // 5% mejor RTP
        await userService.addProfessionXp(userId, Math.max(1, Math.floor(bet / 10000)));
    }

    const session = {
        userId,
        bet,
        minesCount,
        rtp: sessionRtp,
        board: generateBoard(minesCount),
        revealed: Array(9).fill(false),
        gemsFound: 0,
        messageId: null,
        channelId: interaction.channelId,
        timeout: null,
        processing: false,
        interaction,
        isEphemeral
    };

    sessions.set(userId, session);

    // Enviar tablero inicial
    const panel = buildMinasPanel(userId, session);
    const msg = await interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    session.messageId = msg.id;

    resetSessionTimeout(userId, interaction);
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
        const bet = interaction.options.getInteger("amount");
        const minesCount = interaction.options.getInteger("mines") || 2;
        await initGame(interaction, bet, minesCount, false);
    },

    async handleModal(interaction) {
        const betStr = interaction.fields.getTextInputValue("amount");
        const minesStr = interaction.fields.getTextInputValue("mines") || "2";

        const bet = parseInt(betStr, 10);
        if (isNaN(bet) || bet <= 0 || bet > MAX_BET) {
            return interaction.reply({ content: `❌ Por favor ingresa una cantidad de apuesta válida entre 1 y ${MAX_BET.toLocaleString()}.`, flags: MessageFlags.Ephemeral });
        }

        const minesCount = parseInt(minesStr, 10);
        if (isNaN(minesCount) || minesCount < 1 || minesCount > 8) {
            return interaction.reply({ content: "❌ El número de minas debe estar entre 1 y 8.", flags: MessageFlags.Ephemeral });
        }

        await initGame(interaction, bet, minesCount, true);
    },

    // --- HANDLER DE EVENTOS DE BOTONES ---

    async buttonHandler(interaction) {
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

        if (action === "cashout") {
            const totalGems = 9 - session.minesCount;
            if (session.gemsFound < 2 && totalGems >= 2) {
                session.processing = false;
                return interaction.reply({ content: "Debes encontrar al menos 2 gemas antes de poder retirarte.", flags: MessageFlags.Ephemeral });
            }
        }

        // Lock antipánico
        if (session.processing) {
            try {
                await interaction.deferUpdate();
            } catch {}
            return true;
        }
        session.processing = true;

        // Diferir la actualización inmediatamente para evitar el límite de los 3 segundos
        try {
            await interaction.deferUpdate();
        } catch {}

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
                    
                    const casinoTax = Math.floor(session.bet * config.games.loseTaxRate);
                    if (casinoTax > 0) {
                        await userService.addBalance("server_casino", -casinoTax, false);
                        await userService.addBalance("server_bank", casinoTax, false);
                        await transactionService.logTransaction({
                            discordId: "server_bank",
                            type: "bank_tax",
                            amount: casinoTax,
                            itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Minas de <@${userId}>`
                        });
                        await transactionService.logTransaction({
                            discordId: "server_casino",
                            type: "bank_withdrawal",
                            amount: -casinoTax,
                            itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco`
                        });
                    }
                    
                    const cashback = await userService.handleGamblerCashback(userId, session.bet);
                    if (cashback > 0) {
                        await transactionService.logTransaction({ discordId: userId, type: "cashback", amount: cashback, itemName: "Cashback Ludópata 5%" });
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -cashback, itemName: `Cashback a <@${userId}>` });
                        session.cashbackText = `\n*(Cashback 5%: Recuperaste ${COIN}${cashback.toLocaleString()})*`;
                    }
                    
                    const loseContainer = buildMinasPanel(userId, session, true, false);
                    await interaction.editReply({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                    
                    await logGameOutcome(interaction, "Minas", session.bet, session.bet, false);
                    return true;
                } else {
                    // ¡Encontró una gema!
                    session.gemsFound++;
                    const totalGems = 9 - session.minesCount;
                    
                    if (session.gemsFound === totalGems) {
                        // Victoria perfecta automática
                        if (session.timeout) clearTimeout(session.timeout);
                        sessions.delete(userId);
                        
                        const multiplier = getMultiplier(session.minesCount, session.gemsFound, session.rtp);
                        const payout = Math.floor(session.bet * multiplier);
                        
                        let tax = 0;
                        let finalPayout = payout;
                         if (payout > session.bet) {
                            tax = Math.floor((payout - session.bet) * config.games.winTaxRate);
                            finalPayout = payout - tax;
                        }
                        
                        await userService.addBalance(userId, finalPayout, false);
                        await userService.addBalance("server_casino", -finalPayout, false);
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Minas pagado a <@${userId}>` });
                        await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
                        
                        if (tax > 0) {
                            await userService.addBalance("server_casino", -tax, false);
                            await userService.addBalance("server_bank", tax, false);
                            await transactionService.logTransaction({
                                discordId: "server_casino",
                                type: "bank_withdrawal",
                                amount: -tax,
                                itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco`
                            });
                            await transactionService.logTransaction({
                                discordId: "server_bank",
                                type: "bank_tax",
                                amount: tax,
                                itemName: `Impuesto sobre apuesta de <@${userId}>`
                            });
                        }
                        
                        const winContainer = buildMinasPanel(userId, session, true, true, tax);
                        await interaction.editReply({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
                        
                        await logGameOutcome(interaction, "Minas", session.bet, finalPayout - session.bet, true);
                        return true;
                    } else {
                        // Sigue jugando
                        resetSessionTimeout(userId, interaction);
                        session.processing = false;
                        
                        const playContainer = buildMinasPanel(userId, session, false, false);
                        await interaction.editReply({ components: [playContainer], flags: MessageFlags.IsComponentsV2 });
                        return true;
                    }
                }
            }

            if (action === "cashout") {
                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);
                
                const multiplier = getMultiplier(session.minesCount, session.gemsFound, session.rtp);
                const payout = Math.floor(session.bet * multiplier);
                
                let tax = 0;
                let finalPayout = payout;
                 if (payout > session.bet) {
                     tax = Math.floor((payout - session.bet) * config.games.winTaxRate);
                     finalPayout = payout - tax;
                 }
                
                await userService.addBalance(userId, finalPayout, false);
                await userService.addBalance("server_casino", -finalPayout, false);
                await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Minas pagado a <@${userId}>` });
                await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });
                
                if (tax > 0) {
                    await userService.addBalance("server_casino", -tax, false);
                    await userService.addBalance("server_bank", tax, false);
                    await transactionService.logTransaction({
                        discordId: "server_casino",
                        type: "bank_withdrawal",
                        amount: -tax,
                        itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco`
                    });
                    await transactionService.logTransaction({
                        discordId: "server_bank",
                        type: "bank_tax",
                        amount: tax,
                        itemName: `Impuesto sobre apuesta de <@${userId}>`
                    });
                }
                
                const cashoutContainer = buildMinasPanel(userId, session, true, false, tax);
                await interaction.editReply({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
                
                await logGameOutcome(interaction, "Minas", session.bet, finalPayout - session.bet, true);
                return true;
            }

        } catch (error) {
            console.error("Error en minas buttonHandler:", error);
            session.processing = false;
            try {
                await interaction.editReply({ content: "Ocurrió un error procesando tu jugada." });
            } catch {}
            return true;
        }
        
        return false;
    }
};
