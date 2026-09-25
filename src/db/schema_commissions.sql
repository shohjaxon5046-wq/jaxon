-- =========================================================================
-- Shohrent WMS - Seller Commission & Profit-Sharing Database Schema (PostgreSQL)
-- =========================================================================

-- 1. ENUM for Commission Calculation Basis
CREATE TYPE commission_basis_enum AS ENUM (
  'net_profit',   -- Sof foydadan foiz (e.g. 20% of net profit: Revenue - Cost)
  'gross_sales'   -- Umumiy tushumdan foiz (e.g. 5% of gross turnover)
);

-- 2. ENUM for Commission Payout Status
CREATE TYPE commission_payout_status_enum AS ENUM (
  'pending',      -- Kutilmoqda (buyurtma amalga oshirildi, to'lov kutilmoqda)
  'approved',     -- Admin tomonidan tasdiqlangan
  'paid'          -- Xodimga to'lab berilgan
);

-- 3. Seller Commission Configurations (Admin-Controlled Rates)
CREATE TABLE IF NOT EXISTS seller_commission_configs (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL, -- References staff_members(id) or unique seller key
  seller_name VARCHAR(150) NOT NULL,
  seller_phone VARCHAR(30),
  
  -- Calculation Model
  calculation_basis commission_basis_enum NOT NULL DEFAULT 'net_profit',
  
  -- Commission Rates (%)
  product_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,  -- Asboblar ijarasi uchun %
  service_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,  -- Xizmatlar (samosval, kran, yukchi) uchun %
  
  -- Profit Margin Assumptions (for net profit calculations when precise costs are amortized)
  estimated_product_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  estimated_service_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 35.00,
  
  -- Minimum Sales Quota & Targets
  min_sales_quota_uzs NUMERIC(15, 2) DEFAULT 0.00,     -- Minimal plan (rejadan oshgandagina hisoblanadi)
  bonus_target_uzs NUMERIC(15, 2) DEFAULT 0.00,        -- Qo'shimcha bonus ko'rsatkichi
  bonus_amount_uzs NUMERIC(15, 2) DEFAULT 0.00,        -- Reja to'lsa beriladigan bir martalik bonus
  
  notes TEXT,
  updated_by VARCHAR(150) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uq_seller_config UNIQUE (seller_id)
);

-- 4. Order Commission Records (Automated Per-Order Tracking)
CREATE TABLE IF NOT EXISTS order_commissions (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  seller_id VARCHAR(64) NOT NULL,
  seller_name VARCHAR(150) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name VARCHAR(150),
  
  -- Sales Revenues
  tools_amount_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  services_amount_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Calculation Basis & Rates Applied at Transaction Time
  calculation_basis commission_basis_enum NOT NULL,
  product_rate_percent NUMERIC(5, 2) NOT NULL,
  service_rate_percent NUMERIC(5, 2) NOT NULL,
  
  -- Cost and Profit Estimates
  tools_estimated_cost_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tools_net_profit_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  services_estimated_cost_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  services_net_profit_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_net_profit_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Calculated Earnings
  earned_tools_commission_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  earned_services_commission_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_commission_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Payout Status
  payout_status commission_payout_status_enum NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by VARCHAR(150),
  payout_reference VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Commission Payout Logs (Audit trail of disbursements)
CREATE TABLE IF NOT EXISTS commission_payouts (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  seller_name VARCHAR(150) NOT NULL,
  amount_uzs NUMERIC(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_by VARCHAR(150) NOT NULL,
  order_ids JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

-- Indices for rapid querying & reporting
CREATE INDEX IF NOT EXISTS idx_order_commissions_seller ON order_commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_commissions_order ON order_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_commissions_status ON order_commissions(payout_status);
CREATE INDEX IF NOT EXISTS idx_order_commissions_date ON order_commissions(order_date);

-- View: Summary of Seller Commissions by Month
CREATE OR REPLACE VIEW view_seller_commission_summary AS
SELECT
  seller_id,
  seller_name,
  DATE_TRUNC('month', order_date) AS month,
  COUNT(id) AS total_deals_count,
  SUM(total_amount_uzs) AS total_revenue_uzs,
  SUM(total_net_profit_uzs) AS total_net_profit_uzs,
  SUM(total_commission_uzs) AS total_commission_earned_uzs,
  SUM(CASE WHEN payout_status = 'paid' THEN total_commission_uzs ELSE 0 END) AS total_paid_uzs,
  SUM(CASE WHEN payout_status != 'paid' THEN total_commission_uzs ELSE 0 END) AS total_pending_uzs
FROM order_commissions
GROUP BY seller_id, seller_name, DATE_TRUNC('month', order_date);
