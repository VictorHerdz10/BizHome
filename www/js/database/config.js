import { DB_NAME, dbInstance } from './connection.js';

export async function getConfig(clave) {
  const result = await dbInstance.query({
    database: DB_NAME,
    statement: 'SELECT valor FROM configuracion WHERE clave = ?',
    values: [clave]
  });
  return result.values?.[0]?.valor || null;
}

export async function updateConfig(clave, valor) {
    // Validar que la clave exista
    const existing = await dbInstance.query({
        database: DB_NAME,
        statement: 'SELECT 1 FROM configuracion WHERE clave = ?',
        values: [clave]
    });
    
    if (!existing.values || existing.values.length === 0) {
        // Insertar nueva configuración si no existe
        await dbInstance.run({
            database: DB_NAME,
            statement: 'INSERT INTO configuracion (clave, valor) VALUES (?, ?)',
            values: [clave, valor]
        });
    } else {
        // Actualizar existente
        await dbInstance.run({
            database: DB_NAME,
            statement: 'UPDATE configuracion SET valor = ? WHERE clave = ?',
            values: [valor, clave]
        });
    }
    return true;
}

export async function getConfiguracionCompleta() {
  const result = await dbInstance.query({
    database: DB_NAME,
    statement: 'SELECT * FROM configuracion',
    values: []
  });
  return result.values || [];
}



