import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WrongNote {
  id: string;
  user_id: string;
  question: string;
  source_text: string;
  explanation: string | null;
  subject_name: string;
  book_name: string;
  chapter_name: string;
  round_number: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting daily backup process...');

    // Get all users who have wrong notes
    const { data: users, error: usersError } = await supabase
      .from('wrong_notes')
      .select('user_id')
      .neq('user_id', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users?.map(u => u.user_id) || [])];
    console.log(`Processing daily backup for ${uniqueUserIds.length} users`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        // Get all wrong notes for this user
        const { data: wrongNotes, error: notesError } = await supabase
          .from('wrong_notes')
          .select('*')
          .eq('user_id', userId);

        if (notesError) {
          console.error(`Error fetching notes for user ${userId}:`, notesError);
          errorCount++;
          continue;
        }

        // Check if backup already exists for today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingBackup, error: checkError } = await supabase
          .from('wrong_notes_daily_backup')
          .select('id')
          .eq('user_id', userId)
          .eq('backup_date', today)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`Error checking existing backup for user ${userId}:`, checkError);
          errorCount++;
          continue;
        }

        // Skip if backup already exists
        if (existingBackup) {
          console.log(`Daily backup already exists for user ${userId}`);
          continue;
        }

        // Create daily backup
        const { error: backupError } = await supabase
          .from('wrong_notes_daily_backup')
          .insert({
            user_id: userId,
            backup_date: today,
            backup_data: wrongNotes || []
          });

        if (backupError) {
          console.error(`Error creating daily backup for user ${userId}:`, backupError);
          errorCount++;
        } else {
          console.log(`Daily backup created successfully for user ${userId} (${wrongNotes?.length || 0} notes)`);
          successCount++;
        }

      } catch (error) {
        console.error(`Unexpected error processing user ${userId}:`, error);
        errorCount++;
      }
    }

    // Clean up old backups (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error: cleanupError } = await supabase
      .from('wrong_notes_daily_backup')
      .delete()
      .lt('backup_date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (cleanupError) {
      console.error('Error cleaning up old backups:', cleanupError);
    } else {
      console.log('Old backups cleaned up successfully');
    }

    const result = {
      success: true,
      message: `Daily backup completed: ${successCount} successful, ${errorCount} errors`,
      processed_users: uniqueUserIds.length,
      successful_backups: successCount,
      failed_backups: errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('Daily backup process completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Daily backup process failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});