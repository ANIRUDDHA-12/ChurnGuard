/**
 * Supabase Client Connection Utility
 * Initializes and exports the Supabase client for database operations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase client initialized');

module.exports = { supabase };
