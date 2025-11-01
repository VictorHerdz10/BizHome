import { DB_NAME, dbInstance } from './connection.js';

export async function addCategory(categoria) {
  try {
    const result = await dbInstance.run({
      database: DB_NAME,
      statement: 'INSERT INTO categorias (nombre, descripcion, icono) VALUES (?, ?, ?)',
      values: [
        categoria.nombre, 
        categoria.descripcion,
        categoria.icono || 'folder' // Valor por defecto si no se especifica
      ]
    });
    return result.changes?.lastId || 0;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('El nombre de categoría ya existe');
    }
    throw error;
  }
}

export async function getCategories() {
  try {
    // Consulta que incluye el conteo de productos asociados
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT 
          c.*, 
          COUNT(p.id) as cantidad_productos
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id
        GROUP BY c.id
        ORDER BY c.nombre ASC
      `,
      values: []
    });
    
    return result.values || [];
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
}

export async function updateCategory(categoria) {
  try {
    await dbInstance.run({
      database: DB_NAME,
      statement: 'UPDATE categorias SET nombre = ?, descripcion = ?, icono = ? WHERE id = ?',
      values: [
        categoria.nombre, 
        categoria.descripcion,
        categoria.icono || 'folder',
        categoria.id
      ]
    });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteCategory(id) {
  try {
    // Verificar si hay productos asociados
    const productos = await dbInstance.query({
      database: DB_NAME,
      statement: 'SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?',
      values: [id]
    });
    
    if (productos.values[0].count > 0) {
      throw new Error('No se puede eliminar la categoría porque tiene productos asociados');
    }
    
    await dbInstance.run({
      database: DB_NAME,
      statement: 'DELETE FROM categorias WHERE id = ?',
      values: [id]
    });
    return true;
  } catch (error) {
    throw error;
  }
}

// Nueva función para obtener productos por categoría
export async function getProductsByCategory(categoryId) {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: 'SELECT * FROM productos WHERE categoria_id = ? ORDER BY nombre ASC',
      values: [categoryId]
    });
    return result.values || [];
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    throw error;
  }
}
export async function getCategoriesWithSales() {
  try {
    const result = await dbInstance.query({
      database: DB_NAME,
      statement: `
        SELECT 
          c.id, c.nombre, c.icono,
          SUM(v.total) as ventas_total,
          COUNT(v.id) as ventas_count
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id
        LEFT JOIN ventas v ON v.producto_id = p.id
        GROUP BY c.id
        ORDER BY ventas_total DESC
      `,
      values: []
    });
    return result.values || [];
  } catch (error) {
    console.error('Error al obtener categorías con ventas:', error);
    throw error;
  }
}