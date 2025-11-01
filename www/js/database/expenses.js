import { DB_NAME, dbInstance } from "./connection.js";

export async function addGasto(gasto) {
  try {
    const result = await dbInstance.run({
      database: DB_NAME,
      statement:
        "INSERT INTO gastos_hogar (descripcion, cantidad, fecha) VALUES (?, ?, ?)",
      values: [gasto.descripcion, gasto.cantidad, gasto.fecha],
    });
    return result.changes?.lastId || 0;
  } catch (error) {
    throw error;
  }
}

export async function getGastos() {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT id, descripcion, cantidad, fecha 
        FROM gastos_hogar
        ORDER BY fecha DESC
      `,
      values: [],
    });
    return result.values || [];
  } catch (error) {
    console.error("Error en getGastos:", error);
    throw error;
  }
}

export async function updateGasto(gasto) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: `
        UPDATE gastos_hogar SET
          descripcion = ?,
          cantidad = ?,
          fecha = ?
        WHERE id = ?
      `,
      values: [gasto.descripcion, gasto.cantidad, gasto.fecha, gasto.id],
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteGasto(id) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: "DELETE FROM gastos_hogar WHERE id = ?",
      values: [id],
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function getDailyExpensesRanking() {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT 
          date(fecha) as day,
          SUM(cantidad) as total
        FROM gastos_hogar
        GROUP BY day
        ORDER BY total DESC
        LIMIT 5
      `,
      values: [],
    });
    return result.values || [];
  } catch (error) {
    throw error;
  }
}

export async function getExpensesByDay(day) {
  try {
    const expenses = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT * FROM gastos_hogar
        WHERE date(fecha) = ?
        ORDER BY fecha DESC
      `,
      values: [day],
    });

    const total = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT SUM(cantidad) as total
        FROM gastos_hogar
        WHERE date(fecha) = ?
      `,
      values: [day],
    });

    return {
      expenses: expenses.values || [],
      total: total.values[0]?.total || 0,
    };
  } catch (error) {
    throw error;
  }
}
// Añadir al final de expenses.js
export async function getDailyLimit() {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: "SELECT valor FROM configuracion WHERE clave = ?",
      values: ["limite_diario_gastos"],
    });
    return parseFloat(result.values?.[0]?.valor) || 500;
  } catch (error) {
    console.error("Error getting daily limit:", error);
    return 500; // Valor por defecto
  }
}

export async function setDailyLimit(limit) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: `
        INSERT OR REPLACE INTO configuracion (clave, valor) 
        VALUES (?, ?)
      `,
      values: ["limite_diario_gastos", limit.toString()],
    });
    return true;
  } catch (error) {
    console.error("Error setting daily limit:", error);
    throw error;
  }
}
