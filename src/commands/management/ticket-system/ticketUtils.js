const { PermissionsBitField } = require("discord.js");

const ROLE_SUPPORT_ID = "1370375082492428490";
const TICKET_CATEGORY_ID = "1370376649970815047";

function getTicketPermissions(guild, user) {
  return [
    {
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
    {
      id: ROLE_SUPPORT_ID,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
  ];
}

module.exports = { getTicketPermissions, ROLE_SUPPORT_ID, TICKET_CATEGORY_ID };