const { SlashCommandBuilder } = require("discord.js");
const db = require("../../services/dbService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rewards-list")
        .setDescription("Muestra la lista de recompensas diarias activas por rol."),

    async execute(interaction) {
        // Consultamos la base de datos, ordenando por cantidad descendente (de mayor a menor)
        const rows = await db.query("SELECT role_id, ammount FROM role_rewards ORDER BY ammount ASC");

        if (!rows || rows.length === 0) {
            return interaction.reply({
                embeds: [makeEmbed("info", "Vacío", "No hay recompensas configuradas actualmente.")],
                ephemeral: true
            });
        }

        // Mapeamos los resultados para crear una lista legible
        // Usamos <@&ID> para que Discord muestre el nombre del rol con su color
        const description = rows.map((row, index) => {
            return `**${index + 1}.** <@&${row.role_id}> - **${config.emojis.coin} ${row.ammount.toLocaleString()}** diarios`;
        }).join("\n");

        // Enviamos el embed
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "info",
                    "📜 Tabla de Recompensas",
                    `Aquí tienes la lista de roles que otorgan monedas diarias:\n\n${description}`
                )
            ]
        });
    }
};