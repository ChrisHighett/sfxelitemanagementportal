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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          club: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          position: string | null
          school: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          club?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          position?: string | null
          school?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          club?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          position?: string | null
          school?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comms_log: {
        Row: {
          athlete_id: string
          body: string
          id: string
          recipient_type: string
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          athlete_id: string
          body: string
          id?: string
          recipient_type: string
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          athlete_id?: string
          body?: string
          id?: string
          recipient_type?: string
          sent_at?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "comms_log_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_log_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          parent_email: string | null
          parent_name: string
          phone: string | null
          relationship: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          parent_email?: string | null
          parent_name: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          parent_email?: string | null
          parent_name?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reviews: {
        Row: {
          athlete_id: string
          attention_required: boolean | null
          brand_notes: string | null
          created_at: string
          created_by: string | null
          education_notes: string | null
          focus_next_month: string | null
          id: string
          lifestyle_notes: string | null
          performance_notes: string | null
          personal_notes: string | null
          review_month: string
          updated_at: string
          wellbeing_score: number | null
        }
        Insert: {
          athlete_id: string
          attention_required?: boolean | null
          brand_notes?: string | null
          created_at?: string
          created_by?: string | null
          education_notes?: string | null
          focus_next_month?: string | null
          id?: string
          lifestyle_notes?: string | null
          performance_notes?: string | null
          personal_notes?: string | null
          review_month: string
          updated_at?: string
          wellbeing_score?: number | null
        }
        Update: {
          athlete_id?: string
          attention_required?: boolean | null
          brand_notes?: string | null
          created_at?: string
          created_by?: string | null
          education_notes?: string | null
          focus_next_month?: string | null
          id?: string
          lifestyle_notes?: string | null
          performance_notes?: string | null
          personal_notes?: string | null
          review_month?: string
          updated_at?: string
          wellbeing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id: string
          role: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_athlete_access: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          athlete_id: string
          created_at: string
          id: string
          relationship_type: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_id: string
          created_at?: string
          id?: string
          relationship_type: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_id?: string
          created_at?: string
          id?: string
          relationship_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_athlete_access_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_athlete_access_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_athlete_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_athlete_access: {
        Args: { athlete_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
