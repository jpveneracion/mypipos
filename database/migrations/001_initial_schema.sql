-- Migration: 001_initial_schema
-- Description: Initial myPiPOS database schema with full security features
-- Author: myPiPOS Development Team
-- Date: 2025-01-20

-- This file contains the initial schema migration
-- For production, use a proper migration tool like node-pg-migrate or dbmate

BEGIN;

-- Set database configuration
SET search_path = public;

-- Run the main schema
\i schema.sql

-- Seed initial data
INSERT INTO merchant_settings (merchant_id, setting_category, setting_key, setting_value)
VALUES
    (uuid_generate_v4(), 'system', 'schema_version', '1.0.0'),
    (uuid_generate_v4(), 'system', 'migration_date', NOW()::text);

COMMIT;