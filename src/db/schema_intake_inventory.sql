-- ====================================================================
-- SHOHRENT WMS & RENTAL LOGISTICS
-- MODULE: Stock Intake Management & Inventory Stock Adjustment Sync
-- ====================================================================

-- 1. Intake Document Header Table
CREATE TABLE IF NOT EXISTS intake_documents (
    id VARCHAR(64) PRIMARY KEY,                  -- e.g. IN-98231
    supplier_name VARCHAR(255) NOT NULL,         -- Yetkazib beruvchi
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_name VARCHAR(128) NOT NULL,        -- Ombor (Bosh ombor, Chilonzor filiali, etc.)
    operator_name VARCHAR(128) NOT NULL,         -- Kirim qilgan mas'ul xodim
    document_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    currency VARCHAR(10) NOT NULL DEFAULT 'UZS', -- UZS or USD
    exchange_rate NUMERIC(15, 2) NOT NULL DEFAULT 12800.00,
    total_amount_uzs NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_amount_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_fully_placed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, archived, deleted
    deleted_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Intake Document Item Lines
CREATE TABLE IF NOT EXISTS intake_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id VARCHAR(64) NOT NULL REFERENCES intake_documents(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    placed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (placed_quantity >= 0),
    unit_price_uzs NUMERIC(15, 2) NOT NULL CHECK (unit_price_uzs >= 0),
    unit_price_usd NUMERIC(12, 2) DEFAULT NULL,
    total_price_uzs NUMERIC(18, 2) NOT NULL CHECK (total_price_uzs >= 0),
    needs_placement BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Inventory Stock Balances per Warehouse
CREATE TABLE IF NOT EXISTS warehouse_stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(128) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    rented_quantity INTEGER NOT NULL DEFAULT 0 CHECK (rented_quantity >= 0),
    maintenance_quantity INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_quantity >= 0),
    last_intake_id VARCHAR(64) REFERENCES intake_documents(id) ON DELETE SET NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_warehouse UNIQUE (product_id, warehouse_name)
);

-- 4. Stock Adjustment Audit Logs
CREATE TABLE IF NOT EXISTS stock_adjustment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id VARCHAR(64) NOT NULL REFERENCES intake_documents(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(128) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    action_type VARCHAR(32) NOT NULL, -- 'added', 'modified', 'removed', 'rate_adjusted'
    old_quantity INTEGER NOT NULL DEFAULT 0,
    new_quantity INTEGER NOT NULL DEFAULT 0,
    delta_quantity INTEGER NOT NULL DEFAULT 0,
    old_price_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0,
    new_price_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Trigger for Automatic Total Recalculation on Intake Item Changes
CREATE OR REPLACE FUNCTION recalculate_intake_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE intake_documents
    SET total_amount_uzs = COALESCE((
            SELECT SUM(total_price_uzs)
            FROM intake_items
            WHERE intake_id = COALESCE(NEW.intake_id, OLD.intake_id)
        ), 0),
        total_amount_usd = ROUND(COALESCE((
            SELECT SUM(total_price_uzs)
            FROM intake_items
            WHERE intake_id = COALESCE(NEW.intake_id, OLD.intake_id)
        ), 0) / GREATEST(exchange_rate, 1)),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.intake_id, OLD.intake_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_recalculate_intake_totals
AFTER INSERT OR UPDATE OR DELETE ON intake_items
FOR EACH ROW EXECUTE FUNCTION recalculate_intake_totals();

-- 6. Indexes for High Performance Search & Retrieval
CREATE INDEX IF NOT EXISTS idx_intake_docs_supplier ON intake_documents(supplier_name);
CREATE INDEX IF NOT EXISTS idx_intake_docs_warehouse ON intake_documents(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_intake_docs_date ON intake_documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_intake_items_intake_id ON intake_items(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_items_product_id ON intake_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON warehouse_stock_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_warehouse ON warehouse_stock_balances(warehouse_name);
