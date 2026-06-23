-- Add email column to admins table
ALTER TABLE public.admins
ADD COLUMN email TEXT UNIQUE DEFAULT NULL;

-- Update the default admin with the email address
UPDATE public.admins
SET email = 'oduorongo@gmail.com'
WHERE username = 'oduorongo';

-- Create index on email for faster lookups
CREATE INDEX idx_admins_email ON public.admins(email);
