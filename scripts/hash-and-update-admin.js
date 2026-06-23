/*
Simple script to hash a plaintext password and update the `admins` table for a username.
Usage (run from project root):

SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" node scripts/hash-and-update-admin.js oduorongo oduor123

Warning: The service role key must be kept secret. Run this only locally or in a secure environment.
*/

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const [,, username, plainPassword] = process.argv;
  if (!username || !plainPassword) {
    console.error('Usage: node scripts/hash-and-update-admin.js <username> <plainPassword>');
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    console.log('Generated hash:', hash);

    const { data, error } = await supabase
      .from('admins')
      .update({ password_hash: hash })
      .eq('username', username)
      .select('id, username')
      .single();

    if (error) {
      console.error('Failed to update admin password:', error);
      process.exit(2);
    }

    console.log('Updated admin:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
}

main();
