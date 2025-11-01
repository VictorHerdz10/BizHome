export const DB_NAME = "ventas_db";
export let dbInstance = null;

export async function initConnection() {
  if (dbInstance) return true;
  try {
    const { CapacitorSQLite } = window.Capacitor.Plugins;
    if (!CapacitorSQLite) {
      throw new Error("Plugin SQLite no disponible");
    }

    const sqlite = CapacitorSQLite;
    await sqlite.createConnection({
      database: DB_NAME,
      encrypted: false,
      mode: "no-encryption",
      readonly: false,
    });

    await sqlite.open({ database: DB_NAME });

    // Crear todas las tablas necesarias
    await sqlite.execute({
      database: DB_NAME,
      statements: `
        
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            descripcion TEXT,
            icono TEXT DEFAULT 'folder', -- Nombre del icono (Framework7 Icons)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL,
  precio_compra REAL NOT NULL,
  precio_venta REAL NOT NULL,
  tipo_unidad TEXT CHECK(tipo_unidad IN ('unidad', 'libra', 'kg', 'litro', 'paquete')) NOT NULL,
  stock REAL DEFAULT 0,
  descripcion TEXT,
  imagen_path TEXT, 
  codigo_barras TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
        
         CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      total REAL NOT NULL,
      ganancia_bruta REAL NOT NULL,  -- Nuevo campo
      retencion REAL DEFAULT 0,       -- Nuevo campo
      ganancia_neta REAL NOT NULL,    -- Nuevo campo (ganancia_bruta - retencion)
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );
        
        CREATE TABLE IF NOT EXISTS gastos_hogar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          descripcion TEXT NOT NULL,
          cantidad REAL NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS configuracion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clave TEXT UNIQUE NOT NULL,
          valor TEXT NOT NULL
        );
        
    CREATE TABLE IF NOT EXISTS notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activadas INTEGER NOT NULL DEFAULT 0,  
  ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS seguridad (
  id INTEGER PRIMARY KEY DEFAULT 1,
  activado BOOLEAN NOT NULL DEFAULT 0,
  metodo TEXT CHECK(metodo IN ('pin', 'password', 'patron')) DEFAULT 'pin',
  pin_hash TEXT,
  password_hash TEXT,
  patron_hash TEXT,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta TIMESTAMP,
  ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    
      `,
    });

    // Insertar configuración inicial si no existe
    await sqlite.execute({
      database: DB_NAME,
      statements: `
        INSERT OR IGNORE INTO configuracion (clave, valor) 
        VALUES ('retener_ganancias', 'false'), 
           ('porcentaje_retencion', '10'),
           ('limite_diario_gastos', '500');

        
         INSERT OR IGNORE INTO notificaciones (id, activadas) VALUES (1, 0);
         INSERT OR IGNORE INTO seguridad (id, activado, metodo, pin_hash, password_hash, patron_hash, intentos_fallidos, bloqueado_hasta) 
VALUES (1, 0, NULL, NULL, NULL, NULL, 0, NULL);
      `,
    });

    dbInstance = sqlite;
    return true;
  } catch (error) {
    console.error("Database init error:", error);
    throw error;
  }
}

export async function closeConnection() {
  if (dbInstance) {
    await dbInstance.close({ database: DB_NAME });
    await dbInstance.closeConnection({ database: DB_NAME });
  }
}
