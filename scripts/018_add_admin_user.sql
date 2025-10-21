-- Add your email as an admin user
-- Replace 'your-email@example.com' with your actual email

INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'admin'
FROM auth.users 
WHERE email = 'simonelini@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- To add multiple admins, repeat the INSERT statement:
-- INSERT INTO public.admin_users (id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users 
-- WHERE email = 'another-admin@example.com'
-- ON CONFLICT (id) DO NOTHING;
