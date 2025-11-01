import { DB_NAME, dbInstance } from './connection.js';

export async function addProduct(producto) {
  try {
    const result = await dbInstance.run({
      database: DB_NAME,
      statement: `
        INSERT INTO productos 
        (nombre, categoria_id, precio_compra, precio_venta, tipo_unidad, stock, descripcion, imagen_path, codigo_barras) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        producto.nombre,
        producto.categoria_id,
        producto.precio_compra,
        producto.precio_venta,
        producto.tipo_unidad,
        producto.stock || 0,
        producto.descripcion || null,
        producto.imagen_path || null,
        producto.codigo_barras || null
      ]
    });
    return result.changes?.lastId || 0;
  } catch (error) {
    console.log(error)
    throw error;
  }
}

export async function getProducts() { 
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.nombre ASC
      `,
      values: [] 
    });
    return result.values || [];
  } catch (error) {
    console.error("Error al obtener productos:", error);
    throw error;
  }
}

export async function updateProduct(id, productData) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: `
        UPDATE productos 
        SET nombre = ?, categoria_id = ?, precio_compra = ?, 
            precio_venta = ?, tipo_unidad = ?, stock = ?,
            descripcion = ?, imagen_path = ?, codigo_barras = ?
        WHERE id = ?
      `,
      values: [
        productData.nombre,
        productData.categoria_id,
        productData.precio_compra,
        productData.precio_venta,
        productData.tipo_unidad,
        productData.stock || 0,
        productData.descripcion || null,
        productData.imagen_path || null,
        productData.codigo_barras || null,
        id
      ]
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteProduct(id) {
  try {
    // Primero eliminar la imagen asociada si existe
    const product = await getProductById(id);
    if (product.imagen_path) {
      try {
        await Filesystem.deleteFile({
          path: product.imagen_path,
          directory: Directory.Data
        });
      } catch (fileError) {
        console.warn("No se pudo eliminar la imagen:", fileError);
      }
    }

    await dbInstance.run({
      database: DB_NAME,
      statement: 'DELETE FROM productos WHERE id = ?',
      values: [id]
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function getProductById(id) {
  const result = await dbInstance.query({
    database: DB_NAME,
    statement: `
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?
    `,
    values: [id]
  });
  return result.values?.[0] || null;
}

export async function updateStock(productoId, cantidad) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: 'UPDATE productos SET stock = stock + ? WHERE id = ?',
      values: [cantidad, productoId]
    });
    return true;
  } catch (error) {
    throw error;
  }
}
export async function getProductStock(productId) {
    try {
        const result = await dbInstance.query({
            database: DB_NAME,
            statement: "SELECT stock FROM productos WHERE id = ?",
            values: [productId],
        });
        return result.values?.[0]?.stock || 0;
    } catch (error) {
        console.error("Error al obtener stock del producto:", error);
        return 0;
    }
}