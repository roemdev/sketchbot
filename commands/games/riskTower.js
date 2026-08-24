const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { logGameOutcome } = require("../../utils/discordLogger");

const GAME_COOLDOWN = config.games.cooldown;
const COIN = config.emojis.coin;
const MULTIPLIER = config.games.riskTower.multiplier;
const MAX_BET = config.games.maxBet;

function nextValue(current) {
    return Math.floor(current * MULTIPLIER);
}

function buildTowerPanel(userId, bet, current) {
    return new ContainerBuilder()
        .setAccentColor(7419530) // DarkPurple (apuestas activas)
        .addTextDisplayComponents(t =>
            t.setContent(
                `### 🏗️ Torre de Riesgo\n` +
                `Apuesta inicial: **${COIN}${bet.toLocaleString()}**\n` +
                `En juego ahora: **${COIN}${current.toLocaleString()}**\n\n` +
                `Cada nivel multiplica por ${MULTIPLIER}x. Si fallas, lo pierdes todo.`
            )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
            row.setComponents(
                new ButtonBuilder().setCustomId(`torre_risk_${userId}_${bet}_${current}`).setLabel("🎲 Arriesgar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`torre_cashout_${userId}_${bet}_${current}`).setLabel("💰 Retirarse").setStyle(ButtonStyle.Success)
            )
        );
}

async function initGame(interaction, bet, isEphemeral) {
    const userId = interaction.user.id;

    // Diferir respuesta al principio para evitar el límite de los 3 segundos
    await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

    await userService.createUser(userId, interaction.user.username);

    const currentBalance = await userService.getBalance(userId);
    if (currentBalance < bet) {
        if (!isEphemeral) {
            interaction.client.cooldowns.get("torre")?.delete(userId);
        }
        return interaction.editReply({ content: "No tienes suficientes monedas para esa apuesta." });
    }

    await userService.addBalance(userId, -bet, false);
    await userService.addBalance("server_casino", bet, false);
    await transactionService.logTransaction({
        discordId: "server_casino",
        type: "bank_deposit",
        amount: bet,
        itemName: `Apuesta Torre de Riesgo de <@${userId}>`
    });

    const panel = buildTowerPanel(userId, bet, bet);
    await interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    cooldown: GAME_COOLDOWN,
    data: new SlashCommandBuilder()
        .setName("torre")
        .setDescription("Sube la torre. Cada nivel multiplica tu apuesta, pero un fallo y lo pierdes todo.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription(`Monedas a apostar (máx ${MAX_BET.toLocaleString()})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_BET)
        ),

    async execute(interaction) {
        const bet = interaction.options.getInteger("amount");
        await initGame(interaction, bet, false);
    },

    async handleModal(interaction) {
        const betStr = interaction.fields.getTextInputValue("amount");
        const bet = parseInt(betStr, 10);
        if (isNaN(bet) || bet <= 0 || bet > MAX_BET) {
            return interaction.reply({ content: `❌ Por favor ingresa una cantidad de apuesta válida entre 1 y ${MAX_BET.toLocaleString()}.`, flags: MessageFlags.Ephemeral });
        }
        await initGame(interaction, bet, true);
    },

    // --- HANDLER DE EVENTOS DE BOTONES ---

    async buttonHandler(interaction) {
        if (!interaction.isButton()) return false;
        if (!interaction.customId.startsWith("torre_")) return false;

        const parts = interaction.customId.split("_");
        const action = parts[1];
        const userId = parts[2];
        const bet = parseInt(parts[3], 10);
        const current = parseInt(parts[4], 10);

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: "Esa no es tu torre.", flags: MessageFlags.Ephemeral });
        }

        // Diferir la actualización inmediatamente para evitar el límite de los 3 segundos
        try {
            await interaction.deferUpdate();
        } catch {}

        if (action === "risk") {
            if (Math.random() < 0.80) {
                const next = nextValue(current);

                const winContainer = new ContainerBuilder()
                    .setAccentColor(2067276) // DarkGreen (éxito)
                    .addTextDisplayComponents(t =>
                        t.setContent(
                            `### ⬆️ ¡Subes de nivel!\n` +
                            `La torre aguanta. Ahora tienes **${COIN}${next.toLocaleString()}** en juego.\n` +
                            `¿Sigues o te retiras?`
                        )
                    )
                    .addSeparatorComponents(s => s)
                    .addActionRowComponents(row =>
                        row.setComponents(
                            new ButtonBuilder().setCustomId(`torre_risk_${userId}_${bet}_${next}`).setLabel("🎲 Arriesgar").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId(`torre_cashout_${userId}_${bet}_${next}`).setLabel("💰 Retirarse").setStyle(ButtonStyle.Success)
                        )
                    );

                return interaction.editReply({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
            } else {
                await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

                const casinoTax = Math.floor(bet * config.games.loseTaxRate);
                if (casinoTax > 0) {
                    await userService.addBalance("server_casino", -casinoTax, false);
                    await userService.addBalance("server_bank", casinoTax, false);
                    await transactionService.logTransaction({
                        discordId: "server_bank",
                        type: "bank_tax",
                        amount: casinoTax,
                        itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Torre de Riesgo de <@${userId}>`
                    });
                    await transactionService.logTransaction({
                        discordId: "server_casino",
                        type: "bank_withdrawal",
                        amount: -casinoTax,
                        itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco`
                    });
                }

                const loseContainer = new ContainerBuilder()
                    .setAccentColor(10038562) // DarkRed (fail)
                    .addTextDisplayComponents(t =>
                        t.setContent(`### 💥 La torre colapsó\nUn paso de más. Perdiste **${COIN}${current.toLocaleString()}**.`)
                    );

                await interaction.editReply({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
                
                await logGameOutcome(interaction, "Torre de Riesgo", bet, bet, false);
                return true;
            }
        }

        if (action === "cashout") {
            let tax = 0;
            let finalPayout = current;
            if (current > bet) {
                tax = Math.floor((current - bet) * config.games.winTaxRate);
                finalPayout = current - tax;
            }

            await userService.addBalance(userId, finalPayout, false);
            await userService.addBalance("server_casino", -finalPayout, false);
            await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalPayout, itemName: `Premio Torre de Riesgo pagado a <@${userId}>` });
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

            const cashoutContainer = new ContainerBuilder()
                .setAccentColor(2067276) // DarkGreen (éxito)
                .addTextDisplayComponents(t =>
                    t.setContent(
                        `### 💰 ¡Te retiraste!\n` +
                        `Supiste cuándo parar. Te llevas **${COIN}${finalPayout.toLocaleString()}**` +
                        (tax > 0 ? ` (Impuesto de 10%: -${COIN}${tax.toLocaleString()})` : "") +
                        `.`
                    )
                );

            await interaction.editReply({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
            
            await logGameOutcome(interaction, "Torre de Riesgo", bet, finalPayout - bet, true);
            return true;
        }

        return false;
    }
};