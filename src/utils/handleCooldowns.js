async function handleCooldowns(connection, userId, taskName) {
  try {
    // Obtener el cooldown específico para la tarea desde currency_tasks_config
    const [taskConfig] = await connection.execute(
      'SELECT cooldown FROM currency_tasks_config WHERE task_type = ?',
      [taskName]
    );

    if (taskConfig.length === 0) {
      throw new Error(`No se encontró la configuración de cooldown para la tarea: ${taskName}`);
    }

    const cooldownDuration = taskConfig[0].cooldown; // Cooldown en milisegundos
    const currentTime = new Date();
    const cooldownEndTime = new Date(currentTime.getTime() + cooldownDuration);

    // Verificar si el usuario ya tiene un cooldown registrado para la tarea
    const [userCooldown] = await connection.execute(
      `SELECT ${taskName} FROM currency_users_cooldowns WHERE user_id = ?`,
      [userId]
    );

    if (userCooldown.length === 0) {
      // Si no existe un registro, lo creamos
      await connection.execute(
        `INSERT INTO currency_users_cooldowns (user_id, ${taskName}) VALUES (?, ?)`,
        [userId, cooldownEndTime]
      );
      return { cooldownActive: false, remainingCooldown: 0 };
    }

    const cooldownTimestamp = userCooldown[0][taskName];

    if (cooldownTimestamp && new Date(cooldownTimestamp) > currentTime) {
      // Si el cooldown está activo, devolvemos el tiempo restante
      const remainingCooldown = new Date(cooldownTimestamp) - currentTime;
      return { cooldownActive: true, remainingCooldown };
    } else {
      // Si no hay cooldown o ha expirado, actualizamos el cooldown
      await connection.execute(
        `UPDATE currency_users_cooldowns SET ${taskName} = ? WHERE user_id = ?`,
        [cooldownEndTime, userId]
      );
      return { cooldownActive: false, remainingCooldown: 0 };
    }
  } catch (error) {
    console.error(`Error en handleCooldown para la tarea ${taskName}:`, error);
    throw error;
  }
}

module.exports = { handleCooldowns };