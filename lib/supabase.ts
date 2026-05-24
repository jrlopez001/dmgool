import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus credenciales de Supabase
const supabaseUrl = 'https://jswbnakyofkncooyighe.supabase.co';
const supabaseAnonKey = 'sb_publishable_N_6Mz1Wnq-A3Y9qq4kgoUQ_uw-9ckMU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);