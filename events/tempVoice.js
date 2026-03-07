const config = require("../core.json");
const db = require("../services/dbService"); // Importamos la base de datos

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const client = oldState.client;

    if (!client.tempVCs) {
      client.tempVCs = new Map();
    }

    const joinChannelId = config.voice.vcJoinChannel;
    const guild = newState.guild || oldState.guild;

    // Lógica para CREAR el canal
    if (
      oldState.channelId !== newState.channelId &&
      newState.channelId === joinChannelId
    ) {
      const parent = newState.channel.parent;

      const channelName = config.voice.vcNameTemplate.replace(
        "{username}",
        newState.member.displayName ?? newState.member.user.username
      );

      try {
        const tempChannel = await guild.channels.create({
          name: channelName,
          type: 2, // GuildVoice
          parent: parent ?? null,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: ["ViewChannel", "Connect"]
            }
          ]
        });

        await newState.setChannel(tempChannel);

        // Guardamos en la memoria RAM
        client.tempVCs.set(tempChannel.id, {
          ownerId: newState.id
        });

        // Guardamos en la Base de Datos
        await db.execute(
          "INSERT INTO temp_channels (channel_id, owner_id) VALUES (?, ?)",
          [tempChannel.id, newState.id]
        );

      } catch (error) {
        console.error("Error al crear o mover al canal temporal:", error);
      }
    }

    // Lógica para ELIMINAR el canal si queda vacío
    if (oldState.channelId && client.tempVCs.has(oldState.channelId)) {
      const channel = oldState.channel;

      if (!channel) {
        client.tempVCs.delete(oldState.channelId);
        await db.execute("DELETE FROM temp_channels WHERE channel_id = ?", [oldState.channelId]);
        return;
      }

      if (channel.members.size === 0) {
        try {
          await channel.delete();
        } catch (error) {
          console.error(`Error al eliminar el canal temporal ${channel.id}:`, error);
        } finally {
          // Eliminamos de la memoria y de la base de datos
          client.tempVCs.delete(oldState.channelId);
          await db.execute("DELETE FROM temp_channels WHERE channel_id = ?", [oldState.channelId]);
        }
      }
    }
  }
};