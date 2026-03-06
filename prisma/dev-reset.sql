-- DEV ONLY: wipes the entire schema (tables + _prisma_migrations)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- optional but safe on Neon:
GRANT ALL ON SCHEMA public TO public;DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
