-- Migration: Rename username column to id_number
-- Run this SQL against your database to update the column name

-- Rename the column from username to id_number
ALTER TABLE users RENAME COLUMN username TO id_number;

-- Update any indexes if needed (the unique constraint should be preserved)
-- If you have explicit indexes, uncomment and modify as needed:
-- ALTER INDEX users_username_key RENAME TO users_id_number_key;
