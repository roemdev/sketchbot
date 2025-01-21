const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const newRoleId = "1321665235505119357";
    const oldRoleId = "1215767915329228890";

    // Verificar si se asignó el rol nextlvl
    const roleAdded =
      !oldMember.roles.cache.has(newRoleId) &&
      newMember.roles.cache.has(newRoleId);
    if (!roleAdded) return;

    // Intentar eliminar el rol new member si está presente
    try {
      if (newMember.roles.cache.has(oldRoleId)) {
        await newMember.roles.remove(oldRoleId);
      }
    } catch (error) {
      console.error("Error al eliminar el rol:", error);
    }
  },
};
