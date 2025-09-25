import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  subjects: any[];
  books: any[];
  chapters: any[];
  wrong_notes: any[];
  study_progress: any[];
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

    console.log('Starting comprehensive daily backup process...');

    // Get all users who have data to backup
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const userIds = allUsers?.map(u => u.id) || [];
    console.log(`Processing comprehensive daily backup for ${userIds.length} users`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userId of userIds) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if backup already exists for today
        const { data: existingBackup, error: checkError } = await supabase
          .from('comprehensive_daily_backup')
          .select('id')
          .eq('user_id', userId)
          .eq('backup_date', today)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking existing backup for user ${userId}:`, checkError);
          errorCount++;
          continue;
        }

        // Skip if backup already exists
        if (existingBackup) {
          console.log(`Comprehensive daily backup already exists for user ${userId}`);
          continue;
        }

        // Fetch all user data in parallel
        const [subjectsRes, booksRes, chaptersRes, wrongNotesRes, studyProgressRes] = await Promise.all([
          supabase.from('subjects').select('*').eq('user_id', userId),
          supabase.from('books').select('*').eq('user_id', userId),
          supabase.from('chapters').select('*').eq('user_id', userId),
          supabase.from('wrong_notes').select('*').eq('user_id', userId),
          supabase.from('study_progress').select('*').eq('user_id', userId)
        ]);

        // Check for errors
        if (subjectsRes.error || booksRes.error || chaptersRes.error || wrongNotesRes.error || studyProgressRes.error) {
          console.error(`Error fetching data for user ${userId}:`, {
            subjects: subjectsRes.error,
            books: booksRes.error,
            chapters: chaptersRes.error,
            wrongNotes: wrongNotesRes.error,
            studyProgress: studyProgressRes.error
          });
          errorCount++;
          continue;
        }

        const userData: UserData = {
          subjects: subjectsRes.data || [],
          books: booksRes.data || [],
          chapters: chaptersRes.data || [],
          wrong_notes: wrongNotesRes.data || [],
          study_progress: studyProgressRes.data || []
        };

        // Calculate backup size
        const backupSizeKb = Math.round(JSON.stringify(userData).length / 1024);

        // Create comprehensive daily backup
        const { error: backupError } = await supabase
          .from('comprehensive_daily_backup')
          .insert({
            user_id: userId,
            backup_date: today,
            subjects_data: userData.subjects,
            books_data: userData.books,
            chapters_data: userData.chapters,
            wrong_notes_data: userData.wrong_notes,
            study_progress_data: userData.study_progress,
            backup_size_kb: backupSizeKb,
            backup_status: 'completed'
          });

        if (backupError) {
          console.error(`Error creating comprehensive backup for user ${userId}:`, backupError);
          errorCount++;
        } else {
          console.log(`Comprehensive backup created successfully for user ${userId} (${backupSizeKb}KB)`);
          successCount++;
        }

      } catch (error) {
        console.error(`Unexpected error processing user ${userId}:`, error);
        errorCount++;
      }
    }

    // Clean up old backups (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { error: cleanupError } = await supabase
      .from('comprehensive_daily_backup')
      .delete()
      .lt('backup_date', ninetyDaysAgo.toISOString().split('T')[0]);

    if (cleanupError) {
      console.error('Error cleaning up old comprehensive backups:', cleanupError);
    } else {
      console.log('Old comprehensive backups cleaned up successfully');
    }

    // Also clean up old wrong_notes_daily_backup table
    const { error: oldCleanupError } = await supabase
      .from('wrong_notes_daily_backup')
      .delete()
      .lt('backup_date', ninetyDaysAgo.toISOString().split('T')[0]);

    if (oldCleanupError) {
      console.error('Error cleaning up old wrong notes backups:', oldCleanupError);
    }

    const result = {
      success: true,
      message: `Comprehensive daily backup completed: ${successCount} successful, ${errorCount} errors`,
      processed_users: userIds.length,
      successful_backups: successCount,
      failed_backups: errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('Comprehensive daily backup process completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Comprehensive daily backup process failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});