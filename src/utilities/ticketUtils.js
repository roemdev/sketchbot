const { PermissionsBitField } = require("discord.js");

const ROLE_SUPPORT_ID = "1339053275563036745";
const TICKET_CATEGORY_ID = "1338007081760063568";

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