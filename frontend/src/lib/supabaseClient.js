import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sbeaozuubmjuzgjfhlly.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZWFvenV1Ym1qdXpnamZobGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTEwMzksImV4cCI6MjA5NzAyNzAzOX0.DALDxJn_ZnuTmx4KQvKjRBrot-1rPcqxX5orncXEVoE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

