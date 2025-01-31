const { SlashCommandBuilder } = require("discord.js");
const taskHandler = require("../../utils/taskHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pray")
    .setDescription("Este comando te permite rezar y ganar créditos."),
  async execute(interaction) {
    await taskHandler(interaction, "pray");
  },
};
