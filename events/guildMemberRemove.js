const { Events } = require('discord.js');
const publicLogService = require('../services/publicLogService');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      await publicLogService.logMemberLeave(member);
    } catch (err) {
      console.error("[EVENT] Error en guildMemberRemove log:", err);
    }
  }
};
