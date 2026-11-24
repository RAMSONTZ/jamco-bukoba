ALTER TABLE jamco_staff ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS jamco_staff_username_key ON jamco_staff(username) WHERE username IS NOT NULL;
ALTER TABLE jamco_staff ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';
ALTER TABLE jamco_sessions DROP CONSTRAINT jamco_sessions_email_fkey, ADD CONSTRAINT jamco_sessions_email_fkey FOREIGN KEY (email) REFERENCES jamco_staff(email) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE jamco_verification DROP CONSTRAINT jamco_verification_staff_email_fkey, ADD CONSTRAINT jamco_verification_staff_email_fkey FOREIGN KEY (staff_email) REFERENCES jamco_staff(email) ON UPDATE CASCADE;
ALTER TABLE jamco_stories DROP CONSTRAINT jamco_stories_created_by_fkey, ADD CONSTRAINT jamco_stories_created_by_fkey FOREIGN KEY (created_by) REFERENCES jamco_staff(email) ON UPDATE CASCADE;
