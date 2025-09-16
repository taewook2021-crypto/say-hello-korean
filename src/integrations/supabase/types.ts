export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      books: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_subject_name_fkey"
            columns: ["subject_name"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["name"]
          },
        ]
      }
      cards: {
        Row: {
          back: string
          created_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          next_review_date: string
          qa_id: string
          reviewed_count: number
          updated_at: string
        }
        Insert: {
          back: string
          created_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          next_review_date?: string
          qa_id: string
          reviewed_count?: number
          updated_at?: string
        }
        Update: {
          back?: string
          created_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          next_review_date?: string
          qa_id?: string
          reviewed_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_name: string
          created_at: string
          id: string
          major_chapter_id: string | null
          name: string
          subject_name: string
          user_id: string | null
        }
        Insert: {
          book_name: string
          created_at?: string
          id?: string
          major_chapter_id?: string | null
          name: string
          subject_name: string
          user_id?: string | null
        }
        Update: {
          book_name?: string
          created_at?: string
          id?: string
          major_chapter_id?: string | null
          name?: string
          subject_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_subject_fkey"
            columns: ["book_name", "subject_name"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["name", "subject_name"]
          },
          {
            foreignKeyName: "chapters_major_chapter_id_fkey"
            columns: ["major_chapter_id"]
            isOneToOne: false
            referencedRelation: "major_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_subject_name_fkey"
            columns: ["subject_name"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["name"]
          },
        ]
      }
      conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          node_id: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          node_id?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          node_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          item_type: string
          link_url: string | null
          name: string | null
          parent_id: string | null
          project_id: string
          raw_content: string | null
          source_type: string | null
          title: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          item_type: string
          link_url?: string | null
          name?: string | null
          parent_id?: string | null
          project_id: string
          raw_content?: string | null
          source_type?: string | null
          title?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          item_type?: string
          link_url?: string | null
          name?: string | null
          parent_id?: string | null
          project_id?: string
          raw_content?: string | null
          source_type?: string | null
          title?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      major_chapters: {
        Row: {
          book_name: string
          created_at: string
          id: string
          name: string
          subject_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          book_name: string
          created_at?: string
          id?: string
          name: string
          subject_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          book_name?: string
          created_at?: string
          id?: string
          name?: string
          subject_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "major_chapters_book_subject_fkey"
            columns: ["book_name", "subject_name"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["name", "subject_name"]
          },
          {
            foreignKeyName: "major_chapters_subject_name_fkey"
            columns: ["subject_name"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["name"]
          },
        ]
      }
      memorization_checklist: {
        Row: {
          confidence_level: number | null
          created_at: string
          id: string
          is_memorized: boolean
          last_reviewed_at: string | null
          updated_at: string
          user_id: string | null
          wrong_note_id: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          id?: string
          is_memorized?: boolean
          last_reviewed_at?: string | null
          updated_at?: string
          user_id?: string | null
          wrong_note_id: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          id?: string
          is_memorized?: boolean
          last_reviewed_at?: string | null
          updated_at?: string
          user_id?: string | null
          wrong_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorization_checklist_wrong_note_id_fkey"
            columns: ["wrong_note_id"]
            isOneToOne: false
            referencedRelation: "wrong_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          input_price_per_1k_tokens: number
          is_active: boolean
          model_name: string
          output_price_per_1k_tokens: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          input_price_per_1k_tokens: number
          is_active?: boolean
          model_name: string
          output_price_per_1k_tokens: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          input_price_per_1k_tokens?: number
          is_active?: boolean
          model_name?: string
          output_price_per_1k_tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      nodes: {
        Row: {
          archive_count: number | null
          color: string | null
          cover_image: string | null
          created_at: string
          deadline: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_completed: boolean | null
          milestone_achieved: boolean | null
          name: string
          parent_id: string | null
          project_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archive_count?: number | null
          color?: string | null
          cover_image?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_completed?: boolean | null
          milestone_achieved?: boolean | null
          name: string
          parent_id?: string | null
          project_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archive_count?: number | null
          color?: string | null
          cover_image?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_completed?: boolean | null
          milestone_achieved?: boolean | null
          name?: string
          parent_id?: string | null
          project_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_attachments: {
        Row: {
          book_name: string | null
          chapter_name: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          subject_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          book_name?: string | null
          chapter_name?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          subject_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          book_name?: string | null
          chapter_name?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          subject_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_schedule: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          is_completed: boolean
          next_review_date: string
          review_count: number
          updated_at: string
          user_id: string | null
          wrong_note_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          is_completed?: boolean
          next_review_date: string
          review_count?: number
          updated_at?: string
          user_id?: string | null
          wrong_note_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          is_completed?: boolean
          next_review_date?: string
          review_count?: number
          updated_at?: string
          user_id?: string | null
          wrong_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_schedule_wrong_note_id_fkey"
            columns: ["wrong_note_id"]
            isOneToOne: false
            referencedRelation: "wrong_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_progress: {
        Row: {
          book_name: string
          chapter_name: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          round_number: number
          status: string | null
          subject_name: string
          target_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          book_name: string
          chapter_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          round_number?: number
          status?: string | null
          subject_name: string
          target_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          book_name?: string
          chapter_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          round_number?: number
          status?: string | null
          subject_name?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          completed_at: string
          confidence_level: number | null
          created_at: string
          id: string
          score: number | null
          session_type: Database["public"]["Enums"]["study_session_type"]
          time_spent: number
          user_id: string | null
          wrong_note_id: string
        }
        Insert: {
          completed_at?: string
          confidence_level?: number | null
          created_at?: string
          id?: string
          score?: number | null
          session_type: Database["public"]["Enums"]["study_session_type"]
          time_spent?: number
          user_id?: string | null
          wrong_note_id: string
        }
        Update: {
          completed_at?: string
          confidence_level?: number | null
          created_at?: string
          id?: string
          score?: number | null
          session_type?: Database["public"]["Enums"]["study_session_type"]
          time_spent?: number
          user_id?: string | null
          wrong_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_wrong_note_id_fkey"
            columns: ["wrong_note_id"]
            isOneToOne: false
            referencedRelation: "wrong_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_limits: {
        Row: {
          allowed_models: string[] | null
          created_at: string
          daily_question_limit: number
          id: string
          monthly_question_limit: number
          price_monthly: number | null
          tier_name: string
          updated_at: string
        }
        Insert: {
          allowed_models?: string[] | null
          created_at?: string
          daily_question_limit: number
          id?: string
          monthly_question_limit: number
          price_monthly?: number | null
          tier_name: string
          updated_at?: string
        }
        Update: {
          allowed_models?: string[] | null
          created_at?: string
          daily_question_limit?: number
          id?: string
          monthly_question_limit?: number
          price_monthly?: number | null
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          archive_name: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean
          is_review_task: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archive_name?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean
          is_review_task?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archive_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean
          is_review_task?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          date: string
          id: string
          input_tokens: number
          model_name: string
          output_tokens: number
          question_count: number
          total_cost: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          input_tokens?: number
          model_name: string
          output_tokens?: number
          question_count?: number
          total_cost?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          input_tokens?: number
          model_name?: string
          output_tokens?: number
          question_count?: number
          total_cost?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wrong_notes: {
        Row: {
          book_name: string
          chapter_name: string
          created_at: string
          explanation: string | null
          id: string
          is_resolved: boolean
          question: string
          round_number: number | null
          source_text: string
          subject_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          book_name: string
          chapter_name: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_resolved?: boolean
          question: string
          round_number?: number | null
          source_text: string
          subject_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          book_name?: string
          chapter_name?: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_resolved?: boolean
          question?: string
          round_number?: number | null
          source_text?: string
          subject_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_review_date: {
        Args: {
          current_interval: number
          ease_factor: number
          performance_score?: number
        }
        Returns: number
      }
      check_usage_limits: {
        Args: { p_subscription_tier?: string; p_user_id: string }
        Returns: {
          can_ask: boolean
          daily_limit: number
          daily_used: number
          monthly_limit: number
          monthly_used: number
        }[]
      }
      update_usage_tracking: {
        Args: {
          p_input_tokens: number
          p_model_name: string
          p_output_tokens: number
          p_total_cost: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      study_session_type: "flashcard" | "quiz" | "review"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      study_session_type: ["flashcard", "quiz", "review"],
    },
  },
} as const
