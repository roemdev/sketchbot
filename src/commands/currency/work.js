const { SlashCommandBuilder } = require("discord.js");
const taskHandler = require("../../utils/taskHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Este comando te permite trabajar y ganar créditos."),
  async execute(interaction) {
    await taskHandler(interaction, "work");
  },
};
