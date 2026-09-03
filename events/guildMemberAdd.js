const { Events } = require('discord.js');
const publicLogService = require('../services/publicLogService');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      await publicLogService.logMemberJoin(member);
    } catch (err) {
      console.error("[EVENT] Error en guildMemberAdd log:", err);
    }
  }
};
