const { SlashCommandBuilder } = require("discord.js");
const taskHandler = require("../../utils/taskHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mine")
    .setDescription("Este comando te permite minar y ganar créditos."),
  async execute(interaction) {
    await taskHandler(interaction, "mine");
  },
};
