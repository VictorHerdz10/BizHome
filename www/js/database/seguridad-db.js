import { DB_NAME, dbInstance } from './connection.js';

export const SeguridadDB = {
  async getConfig() {
    try {
      const result = await dbInstance.query({
        database: DB_NAME,
        statement: 'SELECT * FROM seguridad WHERE id = 1',
        values: []
      });
      return result.values?.[0] || {
        activado: false,
        metodo: null,
        pin_hash: null,
        password_hash: null,
        patron_hash: null,
        intentos_fallidos: 0,
        bloqueado_hasta: null
      };
    } catch (error) {
      console.error("Error getting security config:", error);
      return {
        activado: false,
        metodo: null,
        pin_hash: null,
        password_hash: null,
        patron_hash: null,
        intentos_fallidos: 0,
        bloqueado_hasta: null
      };
    }
  },

  async updateConfig(config) {
    try {
      await dbInstance.run({
        database: DB_NAME,
        statement: `UPDATE seguridad SET 
          activado = ?,
          metodo = ?,
          pin_hash = ?,
          password_hash = ?,
          patron_hash = ?,
          intentos_fallidos = ?,
          bloqueado_hasta = ?,
          ultima_actualizacion = CURRENT_TIMESTAMP
          WHERE id = 1`,
        values: [
          config.activado,
          config.metodo,
          config.pin_hash,
          config.password_hash,
          config.patron_hash,
          config.intentos_fallidos || 0,
          config.bloqueado_hasta || null
        ]
      });
      return true;
    } catch (error) {
      console.error("Error updating security config:", error);
      throw error;
    }
  },

  async resetFailedAttempts() {
    try {
      await dbInstance.run({
        database: DB_NAME,
        statement: 'UPDATE seguridad SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = 1',
        values: []
      });
      return true;
    } catch (error) {
      console.error("Error resetting failed attempts:", error);
      throw error;
    }
  },

  async incrementFailedAttempts() {
    try {
      await dbInstance.run({
        database: DB_NAME,
        statement: 'UPDATE seguridad SET intentos_fallidos = intentos_fallidos + 1 WHERE id = 1',
        values: []
      });
      return true;
    } catch (error) {
      console.error("Error incrementing failed attempts:", error);
      throw error;
    }
  },

  async setLockoutTime(minutes) {
    try {
      const lockoutTime = new Date(Date.now() + minutes * 60000).toISOString();
      await dbInstance.run({
        database: DB_NAME,
        statement: 'UPDATE seguridad SET bloqueado_hasta = ? WHERE id = 1',
        values: [lockoutTime]
      });
      return true;
    } catch (error) {
      console.error("Error setting lockout time:", error);
      throw error;
    }
  }
};