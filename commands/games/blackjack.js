const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const cardEmojis = require("../../data/blackjackCards.json");
const { logGameOutcome } = require("../../utils/discordLogger");

const GAME_COOLDOWN = config.games.cooldown;
const COIN = config.emojis.coin;
const MAX_BET = config.games.maxBet;

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

// ... original blackjack internals preserved exactly ...
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

function buildBlackjackPanel(userId, session, isGameOver = false, outcome = null, taxRate = config.games.winTaxRate) {
    const container = new ContainerBuilder();
    
    if (isGameOver) {
        if (outcome === "win" || outcome === "blackjack") {
            container.setAccentColor(2067276); // DarkGreen (éxito/victoria)
        } else if (outcome === "lose") {
            container.setAccentColor(10038562); // DarkRed (derrota/bust)
        } else if (outcome === "push") {
            container.setAccentColor(2303786); // NotQuiteBlack (empate)
        } else {
            container.setAccentColor(2303786);
        }
    } else {
        container.setAccentColor(7419530); // DarkPurple (apuesta activa)
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
            const payout = Math.floor(session.bet * 2.5);
            const profit = payout - session.bet;
            const tax = Math.floor(profit * taxRate);
            const reward = payout - tax;
            description += `💥 **¡BLACKJACK NATURAL!** ¡Ganaste **${COIN}${reward.toLocaleString()}**! *(Impuesto del banco (${(config.games.winTaxRate * 100).toFixed(0)}%): ${COIN}${tax.toLocaleString()})*`;
        } else if (outcome === "win") {
            const payout = session.bet * 2;
            const profit = payout - session.bet;
            const tax = Math.floor(profit * taxRate);
            const reward = payout - tax;
            description += `🏆 **¡Ganaste!** Superaste al dealer. Recibes **${COIN}${reward.toLocaleString()}**. *(Impuesto del banco (${(config.games.winTaxRate * 100).toFixed(0)}%): ${COIN}${tax.toLocaleString()})*`;
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
            const dealerWin = dealerVal <= 21 && (dealerVal > playerVal || playerVal > 21);
            const playerWin = playerVal <= 21 && (dealerVal > 21 || playerVal > dealerVal);
            const push = playerVal <= 21 && playerVal === dealerVal;

            description += `⏳ **Partida Expirada (AFK):** Se plantó tu mano automáticamente.\n`;
            if (playerWin) {
                const payout = session.bet * 2;
                const profit = payout - session.bet;
                const tax = Math.floor(profit * taxRate);
                const reward = payout - tax;
                description += `🏆 ¡Aun así ganaste! Recibes **${COIN}${reward.toLocaleString()}**. *(Impuesto del banco: ${COIN}${tax.toLocaleString()})*`;
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
            
            let dealerVal = calculateHandValue(s.dealerHand);
            while (dealerVal < 17) {
                s.dealerHand.push(s.deck.pop());
                dealerVal = calculateHandValue(s.dealerHand);
            }
            
            const playerVal = calculateHandValue(s.playerHand);
            const playerWin = playerVal <= 21 && (dealerVal > 21 || playerVal > dealerVal);
            const push = playerVal <= 21 && playerVal === dealerVal;
            
            let payout = 0;
            let finalPayout = 0;
            if (playerWin) {
                payout = s.bet * 2;
                const profit = payout - s.bet;
                const tax = Math.floor(profit * taxRate);
                finalPayout = payout - tax;
                
                await userService.addBalance(userId, finalPayout, false);
                await userService.addBalance("server_casino", -finalPayout, false);
                await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Blackjack pagado a <@${userId}>` });
                
                if (tax > 0) {
                    await userService.addBalance("server_casino", -tax, false);
                    await userService.addBalance("server_bank", tax, false);
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -tax, itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco` });
                    await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: tax, itemName: `Impuesto Blackjack (AFK) de <@${userId}>` });
                }
            } else if (push) {
                payout = s.bet;
                finalPayout = s.bet;
                await userService.addBalance(userId, finalPayout, false);
                await userService.addBalance("server_casino", -finalPayout, false);
                await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Empate Blackjack devuelto a <@${userId}>` });
            } else {
                const user = await userService.getUser(userId);
                const casinoTax = Math.floor(s.bet * (user && user.profession === "gambler" ? 0 : config.games.loseTaxRate));
                if (casinoTax > 0) {
                    await userService.addBalance("server_casino", -casinoTax, false);
                    await userService.addBalance("server_bank", casinoTax, false);
                    await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: casinoTax, itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Blackjack (AFK) de <@${userId}>` });
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -casinoTax, itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco` });
                }
                
                

                    const loseContainer = buildBlackjackPanel(userId, session, true, "lose", (user && user.profession === "gambler" ? 0 : config.games.winTaxRate));
                    await interaction.editReply({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                    
                    await logGameOutcome(interaction, "Blackjack", session.bet, session.bet, false);
                    return true;
                } else {
                    resetSessionTimeout(userId, interaction);
                    session.processing = false;

                    const playContainer = buildBlackjackPanel(userId, session);
                    await interaction.editReply({ components: [playContainer], flags: MessageFlags.IsComponentsV2 });
                    return true;
                }
            }

            if (action === "double") {
                const currentBalance = await userService.getBalance(userId);
                if (currentBalance < session.bet) {
                    session.processing = false;
                    await interaction.followUp({ content: "No tienes suficientes monedas para doblar tu apuesta.", flags: MessageFlags.Ephemeral });
                    return true;
                }

                await userService.addBalance(userId, -session.bet, false);
                await userService.addBalance("server_casino", session.bet, false);
                await transactionService.logTransaction({ discordId: "server_casino", type: "bank_deposit", amount: session.bet, itemName: `Doble Apuesta Blackjack de <@${userId}>` });
                session.bet *= 2;

                session.playerHand.push(session.deck.pop());
                const playerVal = calculateHandValue(session.playerHand);

                if (playerVal > 21) {
                    if (session.timeout) clearTimeout(session.timeout);
                    sessions.delete(userId);

                    await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

                    const user = await userService.getUser(userId);
                    const casinoTax = Math.floor(session.bet * (user && user.profession === "gambler" ? 0 : config.games.loseTaxRate));
                    if (casinoTax > 0) {
                        await userService.addBalance("server_casino", -casinoTax, false);
                        await userService.addBalance("server_bank", casinoTax, false);
                        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: casinoTax, itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Blackjack de <@${userId}>` });
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -casinoTax, itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco` });
                    }

                    

                    const loseContainer = buildBlackjackPanel(userId, session, true, "lose", (user && user.profession === "gambler" ? 0 : config.games.winTaxRate));
                    await interaction.editReply({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                    
                    await logGameOutcome(interaction, "Blackjack", session.bet, session.bet, false);
                    return true;
                }

                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);

                let dealerVal = calculateHandValue(session.dealerHand);
                while (dealerVal < 17) {
                    session.dealerHand.push(session.deck.pop());
                    dealerVal = calculateHandValue(session.dealerHand);
                }

                let outcome = "lose";
                let payout = 0;

                let finalPayout = 0;
                if (dealerVal > 21 || playerVal > dealerVal) {
                    outcome = "win";
                    payout = session.bet * 2;
                    const profit = payout - session.bet;
                    const tax = Math.floor(profit * taxRate);
                    finalPayout = payout - tax;
                    
                    await userService.addBalance(userId, finalPayout, false);
                    await userService.addBalance("server_casino", -finalPayout, false);
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Blackjack pagado a <@${userId}>` });
                    
                    if (tax > 0) {
                        await userService.addBalance("server_casino", -tax, false);
                        await userService.addBalance("server_bank", tax, false);
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -tax, itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco` });
                        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: tax, itemName: `Impuesto Blackjack de <@${userId}>` });
                    }
                } else if (playerVal === dealerVal) {
                    outcome = "push";
                    payout = session.bet;
                    finalPayout = session.bet;
                    await userService.addBalance(userId, finalPayout, false);
                    await userService.addBalance("server_casino", -finalPayout, false);
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Empate Blackjack devuelto a <@${userId}>` });
                } else {
                    const user = await userService.getUser(userId);
                    const casinoTax = Math.floor(session.bet * (user && user.profession === "gambler" ? 0 : config.games.loseTaxRate));
                    if (casinoTax > 0) {
                        await userService.addBalance("server_casino", -casinoTax, false);
                        await userService.addBalance("server_bank", casinoTax, false);
                        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: casinoTax, itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Blackjack de <@${userId}>` });
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -casinoTax, itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco` });
                    }

                    
                }

                await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });

                const finishContainer = buildBlackjackPanel(userId, session, true, outcome);
                await interaction.editReply({ components: [finishContainer], flags: MessageFlags.IsComponentsV2 });
                
                if (outcome !== "push") {
                    await logGameOutcome(interaction, "Blackjack", session.bet, finalPayout - session.bet, outcome !== "lose");
                }
                return true;
            }

            if (action === "stand") {
                if (session.timeout) clearTimeout(session.timeout);
                sessions.delete(userId);

                const playerVal = calculateHandValue(session.playerHand);

                let dealerVal = calculateHandValue(session.dealerHand);
                while (dealerVal < 17) {
                    session.dealerHand.push(session.deck.pop());
                    dealerVal = calculateHandValue(session.dealerHand);
                }

                let outcome = "lose";
                let payout = 0;

                let finalPayout = 0;
                if (dealerVal > 21 || playerVal > dealerVal) {
                    outcome = "win";
                    payout = session.bet * 2;
                    const profit = payout - session.bet;
                    const tax = Math.floor(profit * taxRate);
                    finalPayout = payout - tax;
                    
                    await userService.addBalance(userId, finalPayout, false);
                    await userService.addBalance("server_casino", -finalPayout, false);
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Blackjack pagado a <@${userId}>` });
                    
                    if (tax > 0) {
                        await userService.addBalance("server_casino", -tax, false);
                        await userService.addBalance("server_bank", tax, false);
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -tax, itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco` });
                        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: tax, itemName: `Impuesto Blackjack de <@${userId}>` });
                    }
                } else if (playerVal === dealerVal) {
                    outcome = "push";
                    payout = session.bet;
                    finalPayout = session.bet;
                    await userService.addBalance(userId, finalPayout, false);
                    await userService.addBalance("server_casino", -finalPayout, false);
                    await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Empate Blackjack devuelto a <@${userId}>` });
                } else {
                    const user = await userService.getUser(userId);
                    const casinoTax = Math.floor(session.bet * (user && user.profession === "gambler" ? 0 : config.games.loseTaxRate));
                    if (casinoTax > 0) {
                        await userService.addBalance("server_casino", -casinoTax, false);
                        await userService.addBalance("server_bank", casinoTax, false);
                        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: casinoTax, itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Blackjack de <@${userId}>` });
                        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -casinoTax, itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco` });
                    }

                    
                }

                await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalPayout });

                const finishContainer = buildBlackjackPanel(userId, session, true, outcome);
                await interaction.editReply({ components: [finishContainer], flags: MessageFlags.IsComponentsV2 });
                
                if (outcome !== "push") {
                    await logGameOutcome(interaction, "Blackjack", session.bet, finalPayout - session.bet, outcome !== "lose");
                }
                return true;
            }

        } catch (error) {
            console.error("Error en blackjack buttonHandler:", error);
            session.processing = false;
            try {
                await interaction.followUp({ content: "Ocurrió un error procesando tu movimiento.", flags: MessageFlags.Ephemeral });
            } catch {}
            return true;
        }
        
        return false;
    }
};
