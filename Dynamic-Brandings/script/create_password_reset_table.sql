-- -- Run this SQL in your Supabase SQL Editor to create the password_reset_tokens table
-- -- Go to: Supabase Dashboard > SQL Editor > New Query

-- CREATE TABLE IF NOT EXISTS password_reset_tokens (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   token TEXT NOT NULL UNIQUE,
--   expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
--   used_at TIMESTAMP WITH TIME ZONE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- -- Create index for faster token lookups
-- CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
-- CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- -- Optional: Add RLS policies if you have RLS enabled
-- -- Allow the service role full access
-- ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- -- Policy to allow all operations (since this is managed by the app, not users directly)
-- CREATE POLICY "Allow all operations for service role" ON password_reset_tokens
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
