
-- =========================================
-- Script de Inicialización: starlink-parks-api
-- =========================================

-- ====================
-- Tabla: users
-- ====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================
-- Tabla: sites
-- ====================
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    sitio VARCHAR(255) NOT NULL,
    departamento VARCHAR(100),
    municipio VARCHAR(100),
    distrito VARCHAR(100),
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    status VARCHAR(20),
    response_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================
-- Tabla: site_logs
-- ====================
CREATE TABLE IF NOT EXISTS site_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('create', 'update', 'delete')),
    datos JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ====================
-- Índices
-- ====================
CREATE INDEX IF NOT EXISTS idx_sites_municipio ON sites (municipio);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites (status);
CREATE INDEX IF NOT EXISTS idx_logs_site_id ON site_logs (site_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON site_logs (user_id);

-- ====================
-- Usuario admin1/admin1 inicial (opcional)
-- Reemplaza el password_hash generado por bcrypt
-- ====================
INSERT INTO users (username, password_hash, nombre, role)
VALUES ('admin1', '$2a$12$8L9nlYlgQ4pTGHoG8GFNVeBPBOC6O0ktqkamEFUPnHrOdmARU7SqS', 'Administrador', 'admin');

-- ====================
-- Función de normalización
-- ====================
CREATE OR REPLACE FUNCTION normalizar_departamento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.departamento := CASE
    WHEN LOWER(TRIM(NEW.departamento)) IN ('ahuachapan', 'ahuachapán') THEN 'Ahuachapán'
    WHEN LOWER(TRIM(NEW.departamento)) = 'santa ana' THEN 'Santa Ana'
    WHEN LOWER(TRIM(NEW.departamento)) = 'sonsonate' THEN 'Sonsonate'
    WHEN LOWER(TRIM(NEW.departamento)) = 'chalatenango' THEN 'Chalatenango'
    WHEN LOWER(TRIM(NEW.departamento)) = 'la libertad' THEN 'La Libertad'
    WHEN LOWER(TRIM(NEW.departamento)) = 'san salvador' THEN 'San Salvador'
    WHEN LOWER(TRIM(NEW.departamento)) IN ('cuscatlan', 'cuscatlán') THEN 'Cuscatlán'
    WHEN LOWER(TRIM(NEW.departamento)) = 'la paz' THEN 'La Paz'
    WHEN LOWER(TRIM(NEW.departamento)) = 'cabañas' THEN 'Cabañas'
    WHEN LOWER(TRIM(NEW.departamento)) = 'san vicente' THEN 'San Vicente'
    WHEN LOWER(TRIM(NEW.departamento)) IN ('usulutan', 'usulután') THEN 'Usulután'
    WHEN LOWER(TRIM(NEW.departamento)) = 'san miguel' THEN 'San Miguel'
    WHEN LOWER(TRIM(NEW.departamento)) IN ('morazan', 'morazán') THEN 'Morazán'
    WHEN LOWER(TRIM(NEW.departamento)) IN ('la union', 'la unión') THEN 'La Unión'
    ELSE TRIM(NEW.departamento)
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

 -- ====================
-- Trigger para normalizar el campo departamento
-- ====================

DROP TRIGGER IF EXISTS trigger_normalizar_departamento ON public.sites;
DROP FUNCTION IF EXISTS normalizar_departamento();
CREATE TRIGGER trigger_normalizar_departamento
BEFORE INSERT OR UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION normalizar_departamento();
