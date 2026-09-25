-- =========================================================================
-- Shohrent WMS - Partner Contractor Management & Owner Profit-Sharing Schema
-- =========================================================================

-- 1. ENUM for Partner Service Types
CREATE TYPE partner_service_type_enum AS ENUM (
  'waste_truck',  -- Musir moshina (Samosvallar, axlat tashish)
  'crane',        -- Avtokranlar (16t, 25t, 50t)
  'loader',       -- Yukchilar brigadasi (Gruschik)
  'all'           -- Umumiy ko'p tarmoqli hamkor
);

-- 2. Service Partners Directory (Hamkorlar bazasi)
CREATE TABLE IF NOT EXISTS service_partners (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,                           -- F.I.O yoki tashkilot nomi
  company_name VARCHAR(150),                            -- Firma yoki MCHJ nomi
  contact_person VARCHAR(150) NOT NULL,                 -- Mas'ul shaxs
  phone VARCHAR(30) NOT NULL,                           -- Asosiy telefon
  secondary_phone VARCHAR(30),                          -- Qo'shimcha telefon
  service_type partner_service_type_enum NOT NULL DEFAULT 'crane',
  vehicle_or_equipment_details TEXT,                    -- Texnika/mashina raqami va tavsifi
  
  -- Commission Terms
  commission_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 20.00, -- Shohrent oladigan ulush (20%)
  
  -- Payout Details
  payment_method VARCHAR(50) DEFAULT 'cash',            -- cash, card, bank_transfer
  bank_account_or_card VARCHAR(100),                    -- Karta raqam yoki hisob raqam
  
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Order Service Partner Assignments & Profit Split Tracking
CREATE TABLE IF NOT EXISTS order_service_assignments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  service_type partner_service_type_enum NOT NULL,
  partner_id VARCHAR(64) REFERENCES service_partners(id) ON DELETE SET NULL,
  partner_name VARCHAR(150),
  
  -- Service Gross Turnover (Umumiy tushum)
  total_price_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Partner Share (80%)
  partner_payout_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
  partner_payout_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Shohrent Company Profit (20%)
  company_commission_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  company_commission_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Owner / Admin Profit Share (50% of the 20% company profit)
  owner_profit_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  owner_profit_share_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  company_reserve_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Payout Status to Partner
  payout_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by VARCHAR(150),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Partner Disbursements & Payout Records
CREATE TABLE IF NOT EXISTS partner_payouts (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL REFERENCES service_partners(id) ON DELETE CASCADE,
  partner_name VARCHAR(150) NOT NULL,
  amount_uzs NUMERIC(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  receipt_number VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_by VARCHAR(150) NOT NULL,
  order_ids JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_order_service_partner ON order_service_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_order_service_order ON order_service_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts(partner_id);

-- Analytical View: Owner & Business Profit from External Services
CREATE OR REPLACE VIEW view_owner_service_profit_analytics AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  service_type,
  COUNT(id) AS total_jobs_count,
  SUM(total_price_uzs) AS total_gross_service_revenue_uzs,
  SUM(partner_payout_uzs) AS total_partner_share_80_percent_uzs,
  SUM(company_commission_uzs) AS total_shohrent_net_profit_20_percent_uzs,
  SUM(owner_profit_share_uzs) AS total_owner_profit_share_50_percent_uzs,
  SUM(company_reserve_uzs) AS total_company_reserve_uzs
FROM order_service_assignments
GROUP BY DATE_TRUNC('month', created_at), service_type;
