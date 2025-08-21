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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_name?: string
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
        Relationships: [
          {
            foreignKeyName: "cards_qa_id_fkey"
            columns: ["qa_id"]
            isOneToOne: false
            referencedRelation: "qa_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          book_name: string
          created_at: string
          id: string
          major_chapter_id: string | null
          name: string
          subject_name: string
        }
        Insert: {
          book_name: string
          created_at?: string
          id?: string
          major_chapter_id?: string | null
          name: string
          subject_name: string
        }
        Update: {
          book_name?: string
          created_at?: string
          id?: string
          major_chapter_id?: string | null
          name?: string
          subject_name?: string
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
          created_at: string
          id: string
          lang: string
          raw_text: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang?: string
          raw_text: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          raw_text?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      major_chapters: {
        Row: {
          book_name: string
          created_at: string
          id: string
          name: string
          subject_name: string
          updated_at: string
        }
        Insert: {
          book_name: string
          created_at?: string
          id?: string
          name: string
          subject_name: string
          updated_at?: string
        }
        Update: {
          book_name?: string
          created_at?: string
          id?: string
          name?: string
          subject_name?: string
          updated_at?: string
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
      node_archives: {
        Row: {
          archive_type: string
          content_summary: string | null
          conversation_id: string | null
          created_at: string
          id: string
          node_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archive_type?: string
          content_summary?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          node_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archive_type?: string
          content_summary?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          node_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_archives_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "node_archives_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          node_type: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          node_type?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          node_type?: string
          parent_id?: string | null
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
      qa_pairs: {
        Row: {
          a_text: string
          conversation_id: string
          created_at: string
          difficulty: string | null
          id: string
          importance: string | null
          q_text: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          a_text: string
          conversation_id: string
          created_at?: string
          difficulty?: string | null
          id?: string
          importance?: string | null
          q_text: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          a_text?: string
          conversation_id?: string
          created_at?: string
          difficulty?: string | null
          id?: string
          importance?: string | null
          q_text?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_pairs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      wrong_notes: {
        Row: {
          book_name: string
          chapter_name: string
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          is_resolved: boolean
          question: string
          subject_name: string
          updated_at: string
          wrong_answer: string | null
        }
        Insert: {
          book_name: string
          chapter_name: string
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_resolved?: boolean
          question: string
          subject_name: string
          updated_at?: string
          wrong_answer?: string | null
        }
        Update: {
          book_name?: string
          chapter_name?: string
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_resolved?: boolean
          question?: string
          subject_name?: string
          updated_at?: string
          wrong_answer?: string | null
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
