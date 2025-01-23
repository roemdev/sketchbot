const { SlashCommandBuilder } = require("discord.js");
const taskHandler = require("../../helpers/taskHandler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fish") 
    .setDescription("Este comando te permite pescar y ganar créditos."),
  async execute(interaction) {
    await taskHandler(interaction, "fish");
  },
};
