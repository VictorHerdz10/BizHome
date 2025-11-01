import { DB_NAME, dbInstance } from './connection.js';

export const NotificationManager = {
    getStatus: async () => {
        const result = await dbInstance.query({
            database: DB_NAME,
            statement: 'SELECT activadas FROM notificaciones WHERE id = 1',
            values: []
        });
        // Cambiar la comparación para manejar diferentes representaciones de booleanos
        return !!result.values?.[0]?.activadas; // Convierte cualquier valor a booleano
    },

    setStatus: async (enabled) => {
        await dbInstance.run({
            database: DB_NAME,
            statement: 'UPDATE notificaciones SET activadas = ?, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id = 1',
            values: [enabled ? 1 : 0] // Asegurar que siempre sea 0 o 1
        });
        return true;
    }
};