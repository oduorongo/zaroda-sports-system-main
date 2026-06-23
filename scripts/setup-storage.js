import { createClient } from '@supabase/supabase-js';

// SECURITY CRITICAL: Removed hardcoded service key. Use environment variables.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment before running this script
const supabaseUrl = process.env.SUPABASE_URL || 'https://fkjwsllbatrrzzcmkglw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  console.error('SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY is not set. Aborting.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  const { data: buckets, error: listBucketError } = await supabase.storage.listBuckets();

  if (listBucketError) {
    if (process.env.NODE_ENV === 'development') console.error('Bucket list error:', listBucketError.message);
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === 'circulars');

  if (!bucketExists) {
    const { data, error } = await supabase.storage.createBucket('circulars', {
      public: true,
    });

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Bucket error:', error.message);
    } else {
      if (process.env.NODE_ENV === 'development') console.log('Bucket created:', data);
    }
  } else {
    if (process.env.NODE_ENV === 'development') console.log('Bucket already exists: circulars');
  }

  const { data: cols, error: colError } = await supabase
    .from('participants')
    .select('id')
    .limit(1);

  if (process.env.NODE_ENV === 'development') {
    console.log('Participants sample length:', Array.isArray(cols) ? cols.length : 0);
    if (colError) console.error('Participants sample error:', colError.message);
  }

  const { error: schoolLevelError } = await supabase
    .from('participants')
    .select('school_level')
    .limit(1);

  if (schoolLevelError) {
    if (process.env.NODE_ENV === 'development') console.error('school_level column check error:', schoolLevelError.message);
  } else {
    if (process.env.NODE_ENV === 'development') console.log('school_level column exists');
  }

  const { error: championshipIdError } = await supabase
    .from('participants')
    .select('championship_id')
    .limit(1);

  if (championshipIdError) {
    if (process.env.NODE_ENV === 'development') console.error('championship_id column check error:', championshipIdError.message);
  } else {
    if (process.env.NODE_ENV === 'development') console.log('championship_id column exists');
  }
}

setup().catch((error) => {
  console.error('Setup script failed:', error);
  process.exit(1);
});
