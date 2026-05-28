const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const cardEmojis = require("../../data/cards.json");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;
const MAX_BET = 300_000;

const sessions = new Map();

// --- FUNCIONES INTERNAS DE BLACKJACK ---

function createDeck() {
    const suits = ["♠️", "♥️", "♦️", "♣️"];
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.rank === "A") {
            aces++;
            value += 11;
        } else if (["J", "Q", "K"].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank, 10);
        }
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

function calculateVisibleHandValue(hand, hideFirst = false) {
    if (hideFirst) {
        return calculateHandValue(hand.slice(1));
    }
    return calculateHandValue(hand);
}

function formatHand(hand, hideFirst = false) {
    if (hideFirst) {
        return `🎴 ` + hand.slice(1).map(c => cardEmojis[c.rank]?.[c.suit] || `\`[ ${c.rank}${c.suit} ]\``).join(" ");
    }
    return hand.map(c => cardEmojis[c.rank]?.[c.suit] || `\`[ ${c.rank}${c.suit} ]\``).join(" ");
}

// --- GENERADOR DE INTERFAZ DE DISCORD (CONTAINERBUILDER) ---

function buildBlackjackPanel(userId, session, isGameOver = false, outcome = null) {
    const container = new ContainerBuilder();
    
    // Asignar color de panel según estado utilizando la paleta estándar de SketchBot
    if (isGameOver) {
        if (outcome === "win" || outcome === "blackjack") {
            container.setAccentColor(0xF4C542); // Dorado Éxito/Retirada
        } else if (outcome === "lose") {
            container.setAccentColor(0xC0392B); // Rojo Fracaso
        } else if (outcome === "push") {
            container.setAccentColor(0x5B7FA6); // Gris azulado neutral
        } else {
            container.setAccentColor(0x5B7FA6);
        }
    } else {
        container.setAccentColor(0x6C3483); // Morado para juego activo (Torre de riesgo/Minas)
    }

    const playerVal = calculateHandValue(session.playerHand);
    const dealerVal = calculateHandValue(session.dealerHand);
    const visibleDealerVal = isGameOver ? dealerVal : calculateVisibleHandValue(session.dealerHand, true);

    let description = `### 🃏 Blackjack\n` +
                      `Jugador: <@${userId}>\n` +
                      `Apuesta: **${COIN}${session.bet.toLocaleString()}**\n\n` +
                      `**Tu Mano:**\n` +
                      `${formatHand(session.playerHand)} — Valor: **${playerVal}**\n\n` +
                      `**Mano del Dealer:**\n` +
                      `${formatHand(session.dealerHand, !isGameOver)} — Valor: **${visibleDealerVal}**\n\n`;

    if (isGameOver) {
        if (outcome === "blackjack") {
            const reward = Math.floor(session.bet * 2.5); // Paga 3:2 (ej. 100 apuesta -> retorna 250)
            description += `💥 **¡BLACKJACK NATURAL!** ¡Ganaste **${COIN}${reward.toLocaleString()}**!`;
        } else if (outcome === "win") {
            const reward = session.bet * 2;
            description += `🏆 **¡Ganaste!** Superaste al dealer. Recibes **${COIN}${reward.toLocaleString()}**.`;
        } else if (outcome === "lose") {
            if (playerVal > 21) {
                description += `💥 **¡Te pasaste! (Bust)** Perdiste tu apuesta de **${COIN}${session.bet.toLocaleString()}**.`;
            } else if (dealerVal > 21) {
                description += `🏆 **¡El Dealer se pasó! (Bust)** Ganaste **${COIN}${(session.bet * 2).toLocaleString()}**.`;
            } else {
                description += `📉 **¡Perdiste!** El dealer te superó. Perdiste **${COIN}${session.bet.toLocaleString()}**.`;
            }
        } else if (outcome === "push") {
            description += `🤝 **¡Empate! (Push)** Se devuelve tu apuesta de **${COIN}${session.bet.toLocaleString()}**.`;
        } else if (outcome === "timeout") {
            // Se resolverá mostrando el dealer y las ganancias finales si ganó con stand automático
            const dealerWin = dealerVal <= 21 && (dealerVal > playerVal || playerVal > 21);
            const playerWin = playerVal <= 21 && (dealerVal > 21 || playerVal > dealerVal);
            const push = playerVal <= 21 && playerVal === dealerVal;

            description += `⏳ **Partida Expirada (AFK):** Se plantó tu mano automáticamente.\n`;
            if (playerWin) {
                description += `🏆 ¡Aun así ganaste! Recibes **${COIN}${(session.bet * 2).toLocaleString()}**.`;
            } else if (push) {
                description += `🤝 ¡Quedó en empate! Recuperas tu apuesta de **${COIN}${session.bet.toLocaleString()}**.`;
            } else {
                description += `📉 Perdiste tu apuesta de **${COIN}${session.bet.toLocaleString()}**.`;
            }
        }
    } else {
        description += `¿Qué deseas hacer?`;
    }

    container.addTextDisplayComponents(t => t.setContent(description));
    container.addSeparatorComponents(s => s);

    if (!isGameOver) {
        container.addActionRowComponents(row => {
            const buttons = [
                new ButtonBuilder()
                    .setCustomId(`blackjack_hit_${userId}`)
                    .setLabel("🎰 Pedir")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`blackjack_stand_${userId}`)
                    .setLabel("🛑 Plantarse")
                    .setStyle(ButtonStyle.Success)
            ];

            const isInitialHand = session.playerHand.length === 2;
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`blackjack_double_${userId}`)
                    .setLabel("⚡ Doblar")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!isInitialHand)
            );

            return row.setComponents(buttons);
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
            sessions.delete(userId);
            
            // Jugar la mano del dealer bajo reglas estándar
            let dealerVal = calculateHandValue(s.dealerHand);
            while (dealerVal < 17) {
                s.dealerHand.push(s.deck.pop());
                dealerVal = calculateHandValue(s.dealerHand);
            }
            
            const playerVal = calculateHandValue(s.playerHand);
            const playerWin = playerVal <= 21 && (dealerVal > 21 || playerVal > dealerVal);
            const push = playerVal <= 21 && playerVal === dealerVal;
            
            let payout = 0;
            if (playerWin) {
                payout = s.bet * 2;
                await userService.addBalance(userId, payout, false);
            } else if (push) {
                payout = s.bet;
                await userService.addBalance(userId, payout, false);
            }
            
            await transactionService.logTransaction({ discordId: userId, type: "game", amount: payout });
            
            try {
                const msg = await interaction.channel.messages.fetch(s.messageId).catch(() => null);
                if (msg) {
                    const expiredContainer = buildBlackjackPanel(userId, s, true, "timeout");
                    await msg.edit({ components: [expiredContainer], flags: MessageFlags.IsComponentsV2 });
                }
            } catch (e) {
                console.error("Error al expirar partida de blackjack:", e);
            }
        }
    }, 3 * 60 * 1000); // 3 minutos de inactividad
}

// --- COMANDO SLASH ---

module.exports = {
    cooldown: GAME_COOLDOWN,
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Juega una partida interactiva de Blackjack contra la banca.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription(`Monedas a apostar (máx ${MAX_BET.toLocaleString()})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_BET)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger("amount");

        await userService.createUser(userId, interaction.user.username);

        // Controlar si ya tiene una sesión abierta
        if (sessions.has(userId)) {
            interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
            return interaction.reply({ content: "Ya tienes una partida de Blackjack en curso. Termínala antes de empezar otra.", flags: MessageFlags.Ephemeral });
        }

        const currentBalance = await userService.getBalance(userId);
        if (currentBalance < bet) {
            interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
            return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
        }

        // Restar balance inicial
        await userService.addBalance(userId, -bet, false);

        // Generar estado de juego y baraja clásica
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const session = {
            userId,
            bet,
            deck,
            playerHand,
            dealerHand,
            messageId: null,
            channelId: interaction.channelId,
            timeout: null,
            processing: false
        };

        sessions.set(userId, session);

        // Comprobación de Blackjack Natural inicial
        const playerVal = calculateHandValue(playerHand);
        const dealerVal = calculateHandValue(dealerHand);

        if (playerVal === 21) {
            sessions.delete(userId);
            let outcome = "blackjack";
            let payout = Math.floor(bet * 2.5);

            if (dealerVal === 21) {
                outcome = "push";
                payout = bet;
                await userService.addBalance(userId, payout, false);
            } else {
                await userService.addBalance(userId, payout, false);
            }

            await transactionService.logTransaction({ discordId: userId, type: "game", amount: payout });
            const panel = buildBlackjackPanel(userId, session, true, outcome);
            return interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        }

        // Enviar tablero inicial si no hubo blackjack natural directo
        const panel = buildBlackjackPanel(userId, session);
        await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        
        const msg = await interaction.fetchReply();
        session.messageId = msg.id;

        resetSessionTimeout(userId, interaction);
    }
};

// --- HANDLER DE EVENTOS DE BOTONES ---

module.exports.buttonHandler = async (interaction) => {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("blackjack_")) return false;

    const parts = interaction.customId.split("_");
    const action = parts[1];
    const userId = parts[2];

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: "Esta no es tu partida de Blackjack.", flags: MessageFlags.Ephemeral });
    }

    const session = sessions.get(userId);
    if (!session) {
        return interaction.reply({ content: "Esta partida ya ha terminado o expiró.", flags: MessageFlags.Ephemeral });
    }

    // Lock de procesamiento antipánico
    if (session.processing) {
        try {
            await interaction.deferUpdate();
        } catch {}
        return true;
    }
    session.processing = true;

    try {
        if (action === "hit") {
            // Roba carta
            session.playerHand.push(session.deck.pop());
            const playerVal = calculateHandValue(session.playerHand);

            if (playerVal > 21) {
                // Bust! Pierde de inmediato
                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);

                await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

                const loseContainer = buildBlackjackPanel(userId, session, true, "lose");
                await interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                return true;
            } else {
                // Sigue jugando
                resetSessionTimeout(userId, interaction);
                session.processing = false;

                const playContainer = buildBlackjackPanel(userId, session);
                await interaction.update({ components: [playContainer], flags: MessageFlags.IsComponentsV2 });
                return true;
            }
        }

        if (action === "double") {
            const currentBalance = await userService.getBalance(userId);
            if (currentBalance < session.bet) {
                session.processing = false;
                return interaction.reply({ content: "No tienes suficientes monedas para doblar tu apuesta.", flags: MessageFlags.Ephemeral });
            }

            // Deducir segunda apuesta
            await userService.addBalance(userId, -session.bet, false);
            session.bet *= 2;

            // Roba exactamente una carta
            session.playerHand.push(session.deck.pop());
            const playerVal = calculateHandValue(session.playerHand);

            if (playerVal > 21) {
                // Bust! Pierde
                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);

                await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

                const loseContainer = buildBlackjackPanel(userId, session, true, "lose");
                await interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                return true;
            }

            // Si no busteo, se planta automáticamente tras doblar
            if (session.timeout) clearTimeout(session.timeout);
            sessions.delete(userId);

            // Juega el dealer
            let dealerVal = calculateHandValue(session.dealerHand);
            while (dealerVal < 17) {
                session.dealerHand.push(session.deck.pop());
                dealerVal = calculateHandValue(session.dealerHand);
            }

            let outcome = "lose";
            let payout = 0;

            if (dealerVal > 21 || playerVal > dealerVal) {
                outcome = "win";
                payout = session.bet * 2;
                await userService.addBalance(userId, payout, false);
            } else if (playerVal === dealerVal) {
                outcome = "push";
                payout = session.bet;
                await userService.addBalance(userId, payout, false);
            }

            await transactionService.logTransaction({ discordId: userId, type: "game", amount: payout });

            const finishContainer = buildBlackjackPanel(userId, session, true, outcome);
            await interaction.update({ components: [finishContainer], flags: MessageFlags.IsComponentsV2 });
            return true;
        }

        if (action === "stand") {
            if (session.timeout) clearTimeout(session.timeout);
            sessions.delete(userId);

            const playerVal = calculateHandValue(session.playerHand);

            // Juega el dealer
            let dealerVal = calculateHandValue(session.dealerHand);
            while (dealerVal < 17) {
                session.dealerHand.push(session.deck.pop());
                dealerVal = calculateHandValue(session.dealerHand);
            }

            let outcome = "lose";
            let payout = 0;

            if (dealerVal > 21 || playerVal > dealerVal) {
                outcome = "win";
                payout = session.bet * 2;
                await userService.addBalance(userId, payout, false);
            } else if (playerVal === dealerVal) {
                outcome = "push";
                payout = session.bet;
                await userService.addBalance(userId, payout, false);
            }

            await transactionService.logTransaction({ discordId: userId, type: "game", amount: payout });

            const finishContainer = buildBlackjackPanel(userId, session, true, outcome);
            await interaction.update({ components: [finishContainer], flags: MessageFlags.IsComponentsV2 });
            return true;
        }

    } catch (error) {
        console.error("Error en blackjack buttonHandler:", error);
        session.processing = false;
        try {
            await interaction.reply({ content: "Ocurrió un error procesando tu movimiento.", flags: MessageFlags.Ephemeral });
        } catch {}
        return true;
    }
    
    return false;
};
