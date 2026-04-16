const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;
const MULTIPLIER = 1.25;
const MAX_BET = 100_000;

function nextValue(current) {
    return Math.floor(current * MULTIPLIER);
}

function buildTowerPanel(userId, bet, current) {
    return new ContainerBuilder()
        .setAccentColor(0x6C3483)
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
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger("amount");

        await userService.createUser(userId, interaction.user.username);

        const currentBalance = await userService.getBalance(userId);
        if (currentBalance < bet) {
            interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
            return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
        }

        await userService.addBalance(userId, -bet, false);

        return interaction.reply({ components: [buildTowerPanel(userId, bet, bet)], flags: MessageFlags.IsComponentsV2 });
    }
};

module.exports.buttonHandler = async (interaction) => {
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

    if (action === "risk") {
        if (Math.random() < 0.9) {
            const next = nextValue(current);

            const winContainer = new ContainerBuilder()
                .setAccentColor(0xF4C542)
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

            return interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
        } else {
            await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

            const loseContainer = new ContainerBuilder()
                .setAccentColor(0xC0392B)
                .addTextDisplayComponents(t =>
                    t.setContent(`### 💥 La torre colapsó\nUn paso de más. Perdiste **${COIN}${current.toLocaleString()}**.`)
                );

            return interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }

    if (action === "cashout") {
        await userService.addBalance(userId, current, false);
        await transactionService.logTransaction({ discordId: userId, type: "game", amount: current });

        const cashoutContainer = new ContainerBuilder()
            .setAccentColor(0xF4C542)
            .addTextDisplayComponents(t =>
                t.setContent(`### 💰 ¡Te retiraste!\nSupiste cuándo parar. Te llevas **${COIN}${current.toLocaleString()}**.`)
            );

        return interaction.update({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
    }

    return false;
};