-- =========================================================================
-- Shohrent WMS - Staff & Employees Management Database Schema (PostgreSQL)
-- =========================================================================

-- 1. ENUM for standard roles
CREATE TYPE staff_role_enum AS ENUM (
  'admin',        -- Boshqaruvchi / Admin
  'seller',       -- Sotuvchi / Menejer
  'master',       -- Usta / Texnik ta'mirchi
  'assembler',    -- Yig'uvchi / Komplektovshik
  'warehouse',    -- Omborchi / Zavsklad
  'driver',       -- Haydovchi / Logist
  'accountant',   -- Buxgalter / Kassir
  'custom'        -- Maxsus lavozim
);

-- 2. Staff Roles and Default Permissions Table
CREATE TABLE IF NOT EXISTS staff_roles (
  id VARCHAR(50) PRIMARY KEY,
  name_uz VARCHAR(100) NOT NULL,
  name_ru VARCHAR(100) NOT NULL,
  description TEXT,
  can_view_dashboard BOOLEAN DEFAULT FALSE,
  can_view_calculator BOOLEAN DEFAULT FALSE,
  can_manage_orders BOOLEAN DEFAULT FALSE,
  can_manage_products BOOLEAN DEFAULT FALSE,
  can_view_price_catalog BOOLEAN DEFAULT FALSE,
  can_manage_clients BOOLEAN DEFAULT FALSE,
  can_manage_intake BOOLEAN DEFAULT FALSE,
  can_manage_placement BOOLEAN DEFAULT FALSE,
  can_manage_services BOOLEAN DEFAULT FALSE,
  can_manage_suppliers BOOLEAN DEFAULT FALSE,
  can_manage_staff BOOLEAN DEFAULT FALSE,
  can_view_financials BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Staff Members (Personal) Table
CREATE TABLE IF NOT EXISTS staff_members (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  role staff_role_enum NOT NULL DEFAULT 'seller',
  custom_role_name VARCHAR(100),
  phone VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(100),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  warehouse VARCHAR(100) DEFAULT 'Bosh ombor',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  salary_type VARCHAR(20) DEFAULT 'fixed' CHECK (salary_type IN ('fixed', 'commission', 'hourly', 'per_task')),
  base_salary_uzs NUMERIC(15, 2) DEFAULT 0,
  commission_percent NUMERIC(5, 2) DEFAULT 0,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Overridable granular permissions (JSONB or separate columns)
  permissions JSONB NOT NULL DEFAULT '{
    "canViewDashboard": false,
    "canViewCalculator": true,
    "canManageOrders": false,
    "canManageProducts": false,
    "canViewPriceCatalog": false,
    "canManageClients": false,
    "canManageIntake": false,
    "canManagePlacement": false,
    "canManageServices": false,
    "canManageSuppliers": false,
    "canManageStaff": false,
    "canViewFinancials": false
  }'::jsonb,

  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff_members(role);
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff_members(username);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff_members(status);
CREATE INDEX IF NOT EXISTS idx_staff_warehouse ON staff_members(warehouse);

-- 4. Staff Activity / Audit Log Table
CREATE TABLE IF NOT EXISTS staff_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  staff_id VARCHAR(64) REFERENCES staff_members(id) ON DELETE SET NULL,
  operator_name VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_module VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial default roles
INSERT INTO staff_roles (id, name_uz, name_ru, description, can_view_dashboard, can_view_calculator, can_manage_orders, can_manage_products, can_view_price_catalog, can_manage_clients, can_manage_intake, can_manage_placement, can_manage_services, can_manage_suppliers, can_manage_staff, can_view_financials)
VALUES
  ('admin', 'Boshqaruvchi / Admin', 'Управляющий / Администратор', 'Tizimning barcha modullariga to‘liq cheklovsiz kirish huquqi', true, true, true, true, true, true, true, true, true, true, true, true),
  ('seller', 'Sotuvchi / Menejer', 'Продавец / Менеджер', 'Kalkulyator, narxlar va ijara buyurtmalarini rasmiylashtirish', false, true, true, false, true, true, false, false, false, false, false, false),
  ('master', 'Usta / Ta‘mirlovchi', 'Мастер / Техник', 'Asboblar texnik sozligi, servis ko‘rigi va ta‘mirlash', false, false, false, true, true, false, false, false, true, false, false, false),
  ('assembler', 'Yig‘uvchi / Komplektovshik', 'Сборщик / Комплектовщик', 'Buyurtmalarni omborda jamlash, razmeshenie va tovar qabuli', false, false, true, true, false, false, true, true, false, false, false, false),
  ('warehouse', 'Omborchi / Mudir', 'Кладовщик / Завсклад', 'Kirim-chiqim nazorati, inventarizatsiya va ombor tartibi', false, false, true, true, true, false, true, true, false, false, false, false)
ON CONFLICT (id) DO NOTHING;
