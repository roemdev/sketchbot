const supabase = require("./dbService");
const chalk = require("chalk");

class RoleRewardService {
  /**
   * Fetches all role rewards from the database sorted by `level` ascending.
   * @returns {Promise<Array<{role_id: string, ammount: number, level: number}>>}
   */
  async getSortedRoleRewards() {
    const { data, error } = await supabase
      .from("role_rewards")
      .select("role_id, ammount, level")
      .order("level", { ascending: true });
    
    if (error) {
      console.error(chalk.red("[ROLE-REWARD] Error fetching role rewards:"), error);
      throw error;
    }
    return data || [];
  }

  /**
   * Assigns the highest qualified level role to a member and removes any other level roles.
   * @param {GuildMember} member - The guild member to update.
   * @param {number} level - The level of the user.
   * @returns {Promise<{added: string[], removed: string[]}>}
   */
  async syncMemberRoles(member, level) {
    try {
      const roleRewards = await this.getSortedRoleRewards();
      if (!roleRewards.length) return { added: [], removed: [] };

      // Find the highest role that the user qualifies for
      const qualifiedRoles = roleRewards.filter(r => r.level <= level);
      const targetRole = qualifiedRoles.length > 0 ? qualifiedRoles[qualifiedRoles.length - 1] : null;
      const targetRoleId = targetRole ? targetRole.role_id : null;

      const allRewardRoleIds = roleRewards.map(r => r.role_id);
      const memberRoleIds = [...member.roles.cache.keys()];

      // We should only ADD the highest qualified role if they don't have it
      const rolesToAdd = targetRoleId && !memberRoleIds.includes(targetRoleId) ? [targetRoleId] : [];

      // We should REMOVE all other reward roles that the member has
      const rolesToRemove = allRewardRoleIds.filter(id => {
        return memberRoleIds.includes(id) && id !== targetRoleId;
      });

      const added = [];
      const removed = [];

      // Apply changes to member
      if (rolesToAdd.length > 0) {
        for (const roleId of rolesToAdd) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role).catch(err => {
              console.error(chalk.yellow(`[ROLE-REWARD] Error adding role ${role.name} to ${member.user.username}:`), err.message);
            });
            added.push(roleId);
          }
        }
      }

      if (rolesToRemove.length > 0) {
        for (const roleId of rolesToRemove) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.remove(role).catch(err => {
              console.error(chalk.yellow(`[ROLE-REWARD] Error removing role ${role.name} from ${member.user.username}:`), err.message);
            });
            removed.push(roleId);
          }
        }
      }

      return { added, removed };
    } catch (error) {
      console.error(chalk.red(`[ROLE-REWARD] Error syncing roles for ${member.user.username}:`), error);
      throw error;
    }
  }

  async syncAllMembers(guild) {
    const roleRewards = await this.getSortedRoleRewards();
    if (!roleRewards.length) return { processed: 0, updated: 0 };

    const allRewardRoleIds = roleRewards.map(r => r.role_id);

    // Fetch all users from database
    const { data: users, error } = await supabase
      .from("user_stats")
      .select("discord_id, level");
    
    if (error) {
      throw error;
    }

    let processed = 0;
    let updated = 0;

    for (const user of users) {
      const memberId = user.discord_id;
      const level = user.level || 1;

      // Skip bank accounts and special non-user records
      if (!memberId || memberId.includes("_") || isNaN(memberId)) continue;

      // Fetch the member individually. This works without the privileged GuildMembers intent!
      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member || member.user.bot) continue;

      processed++;

      // Find the highest role that the user qualifies for
      const qualifiedRoles = roleRewards.filter(r => r.level <= level);
      const targetRole = qualifiedRoles.length > 0 ? qualifiedRoles[qualifiedRoles.length - 1] : null;
      const targetRoleId = targetRole ? targetRole.role_id : null;

      const memberRoleIds = [...member.roles.cache.keys()];

      // We should only ADD the highest qualified role if they don't have it
      const rolesToAdd = targetRoleId && !memberRoleIds.includes(targetRoleId) ? [targetRoleId] : [];

      // We should REMOVE all other reward roles that the member has
      const rolesToRemove = allRewardRoleIds.filter(id => {
        return memberRoleIds.includes(id) && id !== targetRoleId;
      });

      if (rolesToAdd.length > 0 || rolesToRemove.length > 0) {
        let memberUpdated = false;

        if (rolesToAdd.length > 0) {
          for (const roleId of rolesToAdd) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
              try {
                await member.roles.add(role);
                memberUpdated = true;
              } catch (err) {
                console.error(`[ROLE-REWARD-SYNC] Error adding role ${role.name} to ${member.user.username}:`, err.message);
              }
            }
          }
        }

        if (rolesToRemove.length > 0) {
          for (const roleId of rolesToRemove) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
              try {
                await member.roles.remove(role);
                memberUpdated = true;
              } catch (err) {
                console.error(`[ROLE-REWARD-SYNC] Error removing role ${role.name} from ${member.user.username}:`, err.message);
              }
            }
          }
        }

        if (memberUpdated) {
          updated++;
        }
      }
    }

    return { processed, updated };
  }
}

module.exports = new RoleRewardService();
