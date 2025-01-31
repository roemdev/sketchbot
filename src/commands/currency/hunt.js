const { SlashCommandBuilder } = require("discord.js");
const taskHandler = require("../../utils/taskHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("Este comando te permite cazar y ganar créditos."),
  async execute(interaction) {
    await taskHandler(interaction, "hunt");
  },
};
