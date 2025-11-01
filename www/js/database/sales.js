import { getConfig } from "./config.js";
import { DB_NAME, dbInstance } from "./connection.js";

export async function addVenta(venta) {
  try {
    // Calcular valores base
    const total = venta.cantidad * venta.precio_unitario;
    const producto = await dbInstance.query({
      database: DB_NAME,
      statement: "SELECT precio_compra FROM productos WHERE id = ?",
      values: [venta.producto_id],
    });

    if (!producto.values || producto.values.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const precio_compra = producto.values[0].precio_compra;
    const ganancia_bruta = total - precio_compra * venta.cantidad;

    // Obtener configuración
    const retener = await getConfig("retener_ganancias");
    const porcentaje = parseFloat(
      (await getConfig("porcentaje_retencion")) || "10"
    );

    // Calcular retención
    let retencion = 0;
    let ganancia_neta = ganancia_bruta;

    if (retener === "true") {
      retencion = ganancia_bruta * (porcentaje / 100);
      ganancia_neta = ganancia_bruta - retencion;
    }
const fecha = venta.fecha;

    // Registrar la venta con todos los datos
    const result = await dbInstance.run({
      database: DB_NAME,
      statement: `
        INSERT INTO ventas 
        (producto_id, cantidad, precio_unitario, total, 
         ganancia_bruta, retencion, ganancia_neta, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        venta.producto_id,
        venta.cantidad,
        venta.precio_unitario,
        total,
        ganancia_bruta,
        retencion,
        ganancia_neta,
        fecha,
      ],
    });
    return result.changes?.lastId || 0;
  } catch (error) {
    throw error;
  }
}

export async function getVentas() {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT v.*, p.nombre as producto_nombre, p.tipo_unidad 
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        ORDER BY v.fecha DESC
      `,
      values: [],
    });
    return result.values || [];
  } catch (error) {
    console.error("Error en getVentas:", error);
    throw error;
  }
}

export async function updateVenta(venta) {
  try {
    // Calcular valores base
    const total = venta.cantidad * venta.precio_unitario;
    const producto = await dbInstance.query({
      database: DB_NAME,
      statement: "SELECT precio_compra FROM productos WHERE id = ?",
      values: [venta.producto_id],
    });

    if (!producto.values || producto.values.length === 0) {
      throw new Error("Producto no encontrado");
    }

    const precio_compra = producto.values[0].precio_compra;
    const ganancia_bruta = total - precio_compra * venta.cantidad;

    // Obtener configuración
    const retener = await getConfig("retener_ganancias");
    const porcentaje = parseFloat(
      (await getConfig("porcentaje_retencion")) || "10"
    );

    // Calcular retención
    let retencion = 0;
    let ganancia_neta = ganancia_bruta;

    if (retener === "true") {
      retencion = ganancia_bruta * (porcentaje / 100);
      ganancia_neta = ganancia_bruta - retencion;
    }

    // Actualizar la venta
    await dbInstance.run({
      database: DB_NAME,
      statement: `
        UPDATE ventas SET
          producto_id = ?,
          cantidad = ?,
          precio_unitario = ?,
          total = ?,
          ganancia_bruta = ?,
          retencion = ?,
          ganancia_neta = ?
        WHERE id = ?
      `,
      values: [
        venta.producto_id,
        venta.cantidad,
        venta.precio_unitario,
        total,
        ganancia_bruta,
        retencion,
        ganancia_neta,
        venta.id,
      ],
    });

    return true;
  } catch (error) {
    throw error;
  }
}
export async function getRetencionesAcumuladas() {
  const result = await dbInstance.query({
    database: DB_NAME,
    statement: "SELECT SUM(retencion) as total_retenido FROM ventas",
    values: [],
  });
  return result.values?.[0]?.total_retenido || 0;
}

export async function deleteVenta(id) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: "DELETE FROM ventas WHERE id = ?",
      values: [id],
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function getVentaById(id) {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT v.*, p.nombre as producto_nombre, p.tipo_unidad 
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        WHERE v.id = ?
      `,
      values: [id],
    });
    return result.values?.[0] || null;
  } catch (error) {
    throw error;
  }
}

export async function getTopSalesDays(limit = 5) {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT 
          date(fecha) as fecha,
          SUM(total) as total_ventas,
          COUNT(id) as cantidad_ventas
        FROM ventas
        GROUP BY date(fecha)
        ORDER BY total_ventas DESC
        LIMIT ?
      `,
      values: [limit]
    });
    return result.values || [];
  } catch (error) {
    console.error('Error al obtener días con más ventas:', error);
    throw error;
  }
}