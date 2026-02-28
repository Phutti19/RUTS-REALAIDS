-- =============================================================================
-- RUTS-REALAIDS Verification Script
-- Run after migration to confirm schema is correct
-- =============================================================================

-- Check tables count
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List all views
SELECT table_name AS view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- List all enum types
SELECT typname AS enum_name
FROM pg_type
WHERE typcategory = 'E'
ORDER BY typname;
