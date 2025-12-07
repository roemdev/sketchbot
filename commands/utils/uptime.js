const { SlashCommandBuilder } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");
const serverService = require("../../services/serversService");
const fetch = require("node-fetch");

const PANEL_URL = "https://arkania.ddns.net";
const API_KEY = "ptlc_mgfiyoHiZgpnIFyp1Fm0zrEEMAyPjlAjU6cI9cbfRLS";

async function getServerStatus(serverId) {
  try {
    const res = await fetch(`${PANEL_URL}/api/client/servers/${serverId}/resources`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "Application/vnd.pterodactyl.v1+json",
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.attributes.current_state;
  } catch (err) {
    console.error(`Error consultando servidor ${serverId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Muestra el estado de los servidores registrados."),

  async execute(interaction) {
    await interaction.deferReply();
    const servers = await serverService.getServers();
    if (!servers || servers.length === 0) {
      return interaction.reply({
        embeds: [makeEmbed("info", "Sin servidores", "No hay servidores registrados.")]
      });
    }

    const nombres = [];
    const estados = [];

    for (const server of servers) {
      const status = await getServerStatus(server.server_id);
      nombres.push(server.name);
      estados.push(status === "running" ? "`✔️`" : "`❌`");
    }

    // Creamos el embed
    const embed = makeEmbed("base", "Estado de los servidores | ArkaniaHost", ""); // descripción vacía
    embed.addFields(
      { name: "Servidor", value: nombres.join("\n"), inline: true },
      { name: "Estado", value: estados.join("\n"), inline: true },
      { name: " ", value: "-# **NOTA**: Si no respondo es una caída general." }
    );

    return interaction.editReply({ embeds: [embed] });
  }
};
