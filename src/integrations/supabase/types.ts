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
      agencies: {
        Row: {
          abn: string | null
          account_status: string | null
          agreed_price: number | null
          billing_address: string | null
          billing_contact_name: string | null
          billing_cycle: string | null
          billing_email: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          included_client_limit: number | null
          legal_name: string | null
          licensed_seats: number | null
          name: string
          payment_terms: string | null
          plan_tier: string | null
          region: string | null
          slug: string
          sport: string | null
          trading_name: string | null
          trial_period_months: number | null
          updated_at: string
        }
        Insert: {
          abn?: string | null
          account_status?: string | null
          agreed_price?: number | null
          billing_address?: string | null
          billing_contact_name?: string | null
          billing_cycle?: string | null
          billing_email?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          included_client_limit?: number | null
          legal_name?: string | null
          licensed_seats?: number | null
          name: string
          payment_terms?: string | null
          plan_tier?: string | null
          region?: string | null
          slug: string
          sport?: string | null
          trading_name?: string | null
          trial_period_months?: number | null
          updated_at?: string
        }
        Update: {
          abn?: string | null
          account_status?: string | null
          agreed_price?: number | null
          billing_address?: string | null
          billing_contact_name?: string | null
          billing_cycle?: string | null
          billing_email?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          included_client_limit?: number | null
          legal_name?: string | null
          licensed_seats?: number | null
          name?: string
          payment_terms?: string | null
          plan_tier?: string | null
          region?: string | null
          slug?: string
          sport?: string | null
          trading_name?: string | null
          trial_period_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_activity: {
        Row: {
          action_type: string
          agent_id: string | null
          athlete_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          athlete_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_voice_profiles: {
        Row: {
          created_at: string
          emoji: string | null
          formality: string | null
          greeting_style: string | null
          how_i_write: string | null
          length: string | null
          sample_messages: string | null
          sign_off: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          formality?: string | null
          greeting_style?: string | null
          how_i_write?: string | null
          length?: string | null
          sample_messages?: string | null
          sign_off?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          formality?: string | null
          greeting_style?: string | null
          how_i_write?: string | null
          length?: string | null
          sample_messages?: string | null
          sign_off?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_alerts: {
        Row: {
          agency_id: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          assigned_to: string | null
          athlete_id: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_at: string
          triggered_from_review_id: string | null
          triggered_from_scorecard_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          assigned_to?: string | null
          athlete_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_at?: string
          triggered_from_review_id?: string | null
          triggered_from_scorecard_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          assigned_to?: string | null
          athlete_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          triggered_at?: string
          triggered_from_review_id?: string | null
          triggered_from_scorecard_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_alerts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_alerts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_alerts_triggered_from_review_id_fkey"
            columns: ["triggered_from_review_id"]
            isOneToOne: false
            referencedRelation: "monthly_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_alerts_triggered_from_scorecard_id_fkey"
            columns: ["triggered_from_scorecard_id"]
            isOneToOne: false
            referencedRelation: "athlete_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_resources: {
        Row: {
          agency_id: string | null
          athlete_id: string
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          agency_id?: string | null
          athlete_id: string
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string | null
          athlete_id?: string
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_resources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_resources_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_scorecards: {
        Row: {
          athlete_id: string
          brand_score: number
          created_at: string
          created_by: string | null
          created_from_review_id: string | null
          education_score: number
          id: string
          lifestyle_score: number
          overall_score: number | null
          performance_score: number
          personal_score: number
          review_month: string
          scoring_notes: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          brand_score: number
          created_at?: string
          created_by?: string | null
          created_from_review_id?: string | null
          education_score: number
          id?: string
          lifestyle_score: number
          overall_score?: number | null
          performance_score: number
          personal_score: number
          review_month: string
          scoring_notes?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          brand_score?: number
          created_at?: string
          created_by?: string | null
          created_from_review_id?: string | null
          education_score?: number
          id?: string
          lifestyle_score?: number
          overall_score?: number | null
          performance_score?: number
          personal_score?: number
          review_month?: string
          scoring_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_scorecards_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_scorecards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_scorecards_created_from_review_id_fkey"
            columns: ["created_from_review_id"]
            isOneToOne: false
            referencedRelation: "monthly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_tasks: {
        Row: {
          agency_id: string | null
          assigned_to_user_id: string | null
          athlete_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dismiss_reason: string | null
          dismissed_at: string | null
          due_date: string | null
          id: string
          original_due_date: string | null
          owner_type: Database["public"]["Enums"]["task_owner_type"]
          priority: number
          related_alert_id: string | null
          related_call_id: string | null
          related_review_id: string | null
          reschedule_count: number
          source: string
          status: Database["public"]["Enums"]["task_status"]
          suggested_day: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          assigned_to_user_id?: string | null
          athlete_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dismiss_reason?: string | null
          dismissed_at?: string | null
          due_date?: string | null
          id?: string
          original_due_date?: string | null
          owner_type: Database["public"]["Enums"]["task_owner_type"]
          priority?: number
          related_alert_id?: string | null
          related_call_id?: string | null
          related_review_id?: string | null
          reschedule_count?: number
          source?: string
          status?: Database["public"]["Enums"]["task_status"]
          suggested_day?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          assigned_to_user_id?: string | null
          athlete_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dismiss_reason?: string | null
          dismissed_at?: string | null
          due_date?: string | null
          id?: string
          original_due_date?: string | null
          owner_type?: Database["public"]["Enums"]["task_owner_type"]
          priority?: number
          related_alert_id?: string | null
          related_call_id?: string | null
          related_review_id?: string | null
          reschedule_count?: number
          source?: string
          status?: Database["public"]["Enums"]["task_status"]
          suggested_day?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_related_alert_id_fkey"
            columns: ["related_alert_id"]
            isOneToOne: false
            referencedRelation: "athlete_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_related_call_id_fkey"
            columns: ["related_call_id"]
            isOneToOne: false
            referencedRelation: "call_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tasks_related_review_id_fkey"
            columns: ["related_review_id"]
            isOneToOne: false
            referencedRelation: "monthly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_timeline_events: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_timeline_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_timeline_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          agency_id: string | null
          assigned_agent_id: string | null
          assigned_agent_name: string | null
          assigned_agent_user_id: string | null
          athlete_code: string | null
          avatar_url: string | null
          club: string | null
          club_contract_expiry: string | null
          commercial_potential: string | null
          created_at: string
          date_of_birth: string | null
          date_signed: string | null
          email: string | null
          first_name: string
          footage_url: string | null
          id: string
          key_attributes: string | null
          last_name: string
          management_contract_expiry: string | null
          position: string | null
          region: string | null
          school: string | null
          scout_credited: boolean | null
          scout_notes: string | null
          scout_rating: string | null
          source: string
          source_lead_id: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_user_id?: string | null
          athlete_code?: string | null
          avatar_url?: string | null
          club?: string | null
          club_contract_expiry?: string | null
          commercial_potential?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_signed?: string | null
          email?: string | null
          first_name: string
          footage_url?: string | null
          id?: string
          key_attributes?: string | null
          last_name: string
          management_contract_expiry?: string | null
          position?: string | null
          region?: string | null
          school?: string | null
          scout_credited?: boolean | null
          scout_notes?: string | null
          scout_rating?: string | null
          source?: string
          source_lead_id?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          assigned_agent_user_id?: string | null
          athlete_code?: string | null
          avatar_url?: string | null
          club?: string | null
          club_contract_expiry?: string | null
          commercial_potential?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_signed?: string | null
          email?: string | null
          first_name?: string
          footage_url?: string | null
          id?: string
          key_attributes?: string | null
          last_name?: string
          management_contract_expiry?: string | null
          position?: string | null
          region?: string | null
          school?: string | null
          scout_credited?: boolean | null
          scout_notes?: string | null
          scout_rating?: string | null
          source?: string
          source_lead_id?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_assigned_agent_user_id_fkey"
            columns: ["assigned_agent_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "scout_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      call_history: {
        Row: {
          agency_id: string | null
          ai_summary_json: Json | null
          athlete_id: string
          audio_file_url: string | null
          call_date: string
          call_type: Database["public"]["Enums"]["call_type"]
          conducted_by: string | null
          conversation_category: string
          counterparty_name: string | null
          created_at: string
          detailed_notes: string | null
          duration_minutes: number | null
          email_audience: string | null
          follow_up_at: string | null
          follow_up_required: boolean
          id: string
          outcome: string | null
          parent_involved: boolean
          summary: string
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          ai_summary_json?: Json | null
          athlete_id: string
          audio_file_url?: string | null
          call_date?: string
          call_type?: Database["public"]["Enums"]["call_type"]
          conducted_by?: string | null
          conversation_category?: string
          counterparty_name?: string | null
          created_at?: string
          detailed_notes?: string | null
          duration_minutes?: number | null
          email_audience?: string | null
          follow_up_at?: string | null
          follow_up_required?: boolean
          id?: string
          outcome?: string | null
          parent_involved?: boolean
          summary: string
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          ai_summary_json?: Json | null
          athlete_id?: string
          audio_file_url?: string | null
          call_date?: string
          call_type?: Database["public"]["Enums"]["call_type"]
          conducted_by?: string | null
          conversation_category?: string
          counterparty_name?: string | null
          created_at?: string
          detailed_notes?: string | null
          duration_minutes?: number | null
          email_audience?: string | null
          follow_up_at?: string | null
          follow_up_required?: boolean
          id?: string
          outcome?: string | null
          parent_involved?: boolean
          summary?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_history_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_history: {
        Row: {
          agency_id: string | null
          athlete_id: string
          body: string
          channel: string
          created_at: string
          created_by: string | null
          email_type: string
          generated_from: string | null
          id: string
          sent_status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          athlete_id: string
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          email_type: string
          generated_from?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          athlete_id?: string
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          email_type?: string
          generated_from?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comms_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_history_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_log: {
        Row: {
          agency_id: string | null
          athlete_id: string
          body: string
          id: string
          recipient_type: string
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          agency_id?: string | null
          athlete_id: string
          body: string
          id?: string
          recipient_type: string
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          agency_id?: string | null
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
            foreignKeyName: "comms_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
      follow_up_tasks: {
        Row: {
          assigned_to: string
          athlete_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          athlete_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          athlete_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_tracker: {
        Row: {
          agency_id: string | null
          athlete_id: string
          comments: string | null
          created_at: string
          goal_description: string
          goal_type: string
          id: string
          month_set: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          athlete_id: string
          comments?: string | null
          created_at?: string
          goal_description: string
          goal_type: string
          id?: string
          month_set: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          athlete_id?: string
          comments?: string | null
          created_at?: string
          goal_description?: string
          goal_type?: string
          id?: string
          month_set?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_tracker_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_tracker_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          agency_id: string | null
          athlete_id: string
          created_at: string
          guardian_user_id: string | null
          id: string
          is_primary: boolean
          notes: string | null
          parent_email: string | null
          parent_name: string
          phone: string | null
          relationship: string | null
          relationship_other: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          athlete_id: string
          created_at?: string
          guardian_user_id?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          parent_email?: string | null
          parent_name: string
          phone?: string | null
          relationship?: string | null
          relationship_other?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          athlete_id?: string
          created_at?: string
          guardian_user_id?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          parent_email?: string | null
          parent_name?: string
          phone?: string | null
          relationship?: string | null
          relationship_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string | null
          areas_for_improvement: string | null
          athlete_id: string
          attention_required: boolean | null
          brand_notes: string | null
          call_date: string | null
          call_duration: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          development_read: string | null
          education_notes: string | null
          focus_next_month: string | null
          follow_up_actions: string | null
          football_goal: string | null
          goals: Json | null
          id: string
          lifestyle_notes: string | null
          parent_engagement_notes: string | null
          performance_notes: string | null
          personal_goal: string | null
          personal_notes: string | null
          review_month: string
          review_source: string | null
          school_life_goal: string | null
          training_highlights: string | null
          updated_at: string
          wellbeing_score: number | null
        }
        Insert: {
          agency_id?: string | null
          areas_for_improvement?: string | null
          athlete_id: string
          attention_required?: boolean | null
          brand_notes?: string | null
          call_date?: string | null
          call_duration?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          development_read?: string | null
          education_notes?: string | null
          focus_next_month?: string | null
          follow_up_actions?: string | null
          football_goal?: string | null
          goals?: Json | null
          id?: string
          lifestyle_notes?: string | null
          parent_engagement_notes?: string | null
          performance_notes?: string | null
          personal_goal?: string | null
          personal_notes?: string | null
          review_month: string
          review_source?: string | null
          school_life_goal?: string | null
          training_highlights?: string | null
          updated_at?: string
          wellbeing_score?: number | null
        }
        Update: {
          agency_id?: string | null
          areas_for_improvement?: string | null
          athlete_id?: string
          attention_required?: boolean | null
          brand_notes?: string | null
          call_date?: string | null
          call_duration?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          development_read?: string | null
          education_notes?: string | null
          focus_next_month?: string | null
          follow_up_actions?: string | null
          football_goal?: string | null
          goals?: Json | null
          id?: string
          lifestyle_notes?: string | null
          parent_engagement_notes?: string | null
          performance_notes?: string | null
          personal_goal?: string | null
          personal_notes?: string | null
          review_month?: string
          review_source?: string | null
          school_life_goal?: string | null
          training_highlights?: string | null
          updated_at?: string
          wellbeing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
      parent_engagement_scores: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string | null
          engagement_level:
            | Database["public"]["Enums"]["parent_engagement_level"]
            | null
          engagement_score: number
          guardian_id: string | null
          id: string
          involvement_score: number | null
          notes: string | null
          responsiveness_score: number | null
          review_month: string
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by?: string | null
          engagement_level?:
            | Database["public"]["Enums"]["parent_engagement_level"]
            | null
          engagement_score: number
          guardian_id?: string | null
          id?: string
          involvement_score?: number | null
          notes?: string | null
          responsiveness_score?: number | null
          review_month: string
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string | null
          engagement_level?:
            | Database["public"]["Enums"]["parent_engagement_level"]
            | null
          engagement_score?: number
          guardian_id?: string | null
          id?: string
          involvement_score?: number | null
          notes?: string | null
          responsiveness_score?: number | null
          review_month?: string
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_engagement_scores_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_engagement_scores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_engagement_scores_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          agency_id: string | null
          approved: boolean
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          role: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
      recruitment_note_tags: {
        Row: {
          acknowledged_at: string | null
          agency_id: string
          created_at: string
          id: string
          note_id: string
          status: string
          tagged_by: string
          tagged_user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          agency_id: string
          created_at?: string
          id?: string
          note_id: string
          status?: string
          tagged_by: string
          tagged_user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          agency_id?: string
          created_at?: string
          id?: string
          note_id?: string
          status?: string
          tagged_by?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_note_tags_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "recruitment_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_notes: {
        Row: {
          agency_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          raw_transcript: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          author_id?: string
          body: string
          created_at?: string
          id?: string
          raw_transcript?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          raw_transcript?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      scout_footage: {
        Row: {
          added_by: string | null
          captured_on: string | null
          consent_acknowledged: boolean
          created_at: string
          id: string
          kind: string
          label: string | null
          scout_lead_id: string
          source: string | null
          url: string
        }
        Insert: {
          added_by?: string | null
          captured_on?: string | null
          consent_acknowledged?: boolean
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          scout_lead_id: string
          source?: string | null
          url: string
        }
        Update: {
          added_by?: string | null
          captured_on?: string | null
          consent_acknowledged?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          scout_lead_id?: string
          source?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_footage_scout_lead_id_fkey"
            columns: ["scout_lead_id"]
            isOneToOne: false
            referencedRelation: "scout_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_leads: {
        Row: {
          action_due_date: string | null
          action_outcome: string | null
          action_required: string | null
          action_status: string | null
          age: number | null
          agency_id: string | null
          assigned_agent_id: string | null
          assigned_agent_name: string | null
          comp_grade: string | null
          competitor_interest: string | null
          converted_athlete_id: string | null
          created_at: string | null
          created_by: string | null
          date_contacted: string | null
          date_in: string | null
          date_lost: string | null
          date_pack_sent: string | null
          date_signed: string | null
          date_welcome_sent: string | null
          first_agent_action_at: string | null
          first_name: string
          footage_url: string | null
          id: string
          key_attributes: string | null
          last_name: string
          last_stage_change_at: string | null
          lead_id: string | null
          lost_at: string | null
          lost_reason: string | null
          next_step: string | null
          notes: string | null
          onboarding_stage: string | null
          position: string | null
          region: string | null
          response_hours: number | null
          school_club: string | null
          scout_credited: boolean | null
          scout_name: string | null
          scout_rating: string | null
          source_contact: string | null
          triage_decision: string | null
          updated_at: string | null
        }
        Insert: {
          action_due_date?: string | null
          action_outcome?: string | null
          action_required?: string | null
          action_status?: string | null
          age?: number | null
          agency_id?: string | null
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          comp_grade?: string | null
          competitor_interest?: string | null
          converted_athlete_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_contacted?: string | null
          date_in?: string | null
          date_lost?: string | null
          date_pack_sent?: string | null
          date_signed?: string | null
          date_welcome_sent?: string | null
          first_agent_action_at?: string | null
          first_name: string
          footage_url?: string | null
          id?: string
          key_attributes?: string | null
          last_name: string
          last_stage_change_at?: string | null
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          next_step?: string | null
          notes?: string | null
          onboarding_stage?: string | null
          position?: string | null
          region?: string | null
          response_hours?: number | null
          school_club?: string | null
          scout_credited?: boolean | null
          scout_name?: string | null
          scout_rating?: string | null
          source_contact?: string | null
          triage_decision?: string | null
          updated_at?: string | null
        }
        Update: {
          action_due_date?: string | null
          action_outcome?: string | null
          action_required?: string | null
          action_status?: string | null
          age?: number | null
          agency_id?: string | null
          assigned_agent_id?: string | null
          assigned_agent_name?: string | null
          comp_grade?: string | null
          competitor_interest?: string | null
          converted_athlete_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_contacted?: string | null
          date_in?: string | null
          date_lost?: string | null
          date_pack_sent?: string | null
          date_signed?: string | null
          date_welcome_sent?: string | null
          first_agent_action_at?: string | null
          first_name?: string
          footage_url?: string | null
          id?: string
          key_attributes?: string | null
          last_name?: string
          last_stage_change_at?: string | null
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          next_step?: string | null
          notes?: string | null
          onboarding_stage?: string | null
          position?: string | null
          region?: string | null
          response_hours?: number | null
          school_club?: string | null
          scout_credited?: boolean | null
          scout_name?: string | null
          scout_rating?: string | null
          source_contact?: string | null
          triage_decision?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_leads_converted_athlete_id_fkey"
            columns: ["converted_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
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
      user_invites: {
        Row: {
          activated_at: string | null
          activated_user_id: string | null
          activation_token: string | null
          approved_at: string | null
          approved_by: string | null
          athlete_first_name: string | null
          athlete_id: string | null
          athlete_last_name: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          relationship: string | null
          role: string
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_user_id?: string | null
          activation_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          athlete_first_name?: string | null
          athlete_id?: string | null
          athlete_last_name?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          relationship?: string | null
          role: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_user_id?: string | null
          activation_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          athlete_first_name?: string | null
          athlete_id?: string | null
          athlete_last_name?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          relationship?: string | null
          role?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_athlete_score_trends: {
        Row: {
          athlete_id: string | null
          brand_score: number | null
          education_score: number | null
          lifestyle_score: number | null
          overall_score: number | null
          overall_score_delta: number | null
          performance_score: number | null
          personal_score: number | null
          previous_overall_score: number | null
          review_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_scorecards_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_athlete_wellbeing_trends: {
        Row: {
          athlete_id: string | null
          previous_wellbeing_score: number | null
          review_month: string | null
          wellbeing_delta: number | null
          wellbeing_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_invite: {
        Args: { _invite_id: string }
        Returns: {
          activation_token: string
          expires_at: string
        }[]
      }
      create_agency: {
        Args: {
          _legal_name: string
          _region?: string
          _sport?: string
          _trading_name: string
        }
        Returns: {
          abn: string | null
          account_status: string | null
          agreed_price: number | null
          billing_address: string | null
          billing_contact_name: string | null
          billing_cycle: string | null
          billing_email: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          included_client_limit: number | null
          legal_name: string | null
          licensed_seats: number | null
          name: string
          payment_terms: string | null
          plan_tier: string | null
          region: string | null
          slug: string
          sport: string | null
          trading_name: string | null
          trial_period_months: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "agencies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_conversation_action_task: {
        Args: {
          _athlete_id: string
          _description: string
          _due_date: string
          _priority: number
          _related_call_id?: string
          _title: string
        }
        Returns: string
      }
      current_agency_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      decline_invite: { Args: { _invite_id: string }; Returns: undefined }
      finalize_invite_activation: {
        Args: { _display_name: string; _new_user_id: string; _token: string }
        Returns: undefined
      }
      generate_athlete_code: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      get_agent_dismiss_reasons: {
        Args: { p_agent_id: string; p_window_days?: number }
        Returns: {
          n: number
          reason: string
        }[]
      }
      get_agent_overdue_tasks: {
        Args: { p_agent_id: string }
        Returns: {
          athlete_id: string
          athlete_name: string
          days_overdue: number
          due_date: string
          original_due_date: string
          priority: number
          reschedule_count: number
          status: string
          task_id: string
          title: string
        }[]
      }
      get_agent_task_scorecard: {
        Args: { p_window_days?: number }
        Returns: {
          agent_id: string
          agent_name: string
          athletes_assigned: number
          avg_lag_days: number
          avg_reschedules: number
          completed_with_due: number
          currently_overdue: number
          dismiss_rate: number
          median_overdue_days: number
          oldest_overdue_days: number
          on_time_count: number
          on_time_rate: number
          reschedule_rate: number
          rescheduled_tasks: number
          tasks_completed: number
          tasks_created: number
          tasks_dismissed: number
        }[]
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          athlete_first_name: string
          athlete_id: string
          athlete_last_name: string
          email: string
          expired: boolean
          id: string
          role: string
          status: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_agent: { Args: never; Returns: boolean }
      is_approved_parent_or_athlete_for: {
        Args: { athlete_uuid: string }
        Returns: boolean
      }
      is_eleva_ops: { Args: never; Returns: boolean }
      is_guardian_of: { Args: { _athlete_id: string }; Returns: boolean }
      is_portal_admin: { Args: { user_id: string }; Returns: boolean }
      update_agency: {
        Args: {
          _agency_id: string
          _legal_name: string
          _region?: string
          _sport?: string
          _trading_name: string
        }
        Returns: {
          abn: string | null
          account_status: string | null
          agreed_price: number | null
          billing_address: string | null
          billing_contact_name: string | null
          billing_cycle: string | null
          billing_email: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          included_client_limit: number | null
          legal_name: string | null
          licensed_seats: number | null
          name: string
          payment_terms: string | null
          plan_tier: string | null
          region: string | null
          slug: string
          sport: string | null
          trading_name: string | null
          trial_period_months: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "agencies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_agency_billing: {
        Args: {
          _abn?: string
          _account_status?: string
          _agency_id: string
          _agreed_price?: number
          _billing_address?: string
          _billing_contact_name?: string
          _billing_cycle?: string
          _billing_email?: string
          _contract_start_date?: string
          _currency?: string
          _included_client_limit?: number
          _licensed_seats?: number
          _payment_terms?: string
          _plan_tier?: string
          _trial_period_months?: number
        }
        Returns: {
          abn: string | null
          account_status: string | null
          agreed_price: number | null
          billing_address: string | null
          billing_contact_name: string | null
          billing_cycle: string | null
          billing_email: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          included_client_limit: number | null
          legal_name: string | null
          licensed_seats: number | null
          name: string
          payment_terms: string | null
          plan_tier: string | null
          region: string | null
          slug: string
          sport: string | null
          trading_name: string | null
          trial_period_months: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "agencies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_has_athlete_access: {
        Args: { athlete_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_status: "open" | "in_progress" | "resolved" | "dismissed"
      alert_type:
        | "wellbeing_drop"
        | "overdue_review"
        | "injury_flag"
        | "parent_followup"
        | "selection_setback"
        | "low_engagement"
        | "custom"
        | "club_check_in"
        | "scout_lead_assigned"
        | "scout_action_overdue"
        | "scout_stage_stalled"
      call_type:
        | "monthly_review"
        | "check_in"
        | "parent_call"
        | "issue_followup"
        | "commercial"
        | "other"
        | "club_conversation"
      parent_engagement_level: "low" | "moderate" | "high"
      task_owner_type: "agent" | "athlete" | "parent" | "admin"
      task_status: "open" | "pending" | "done" | "cancelled"
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
      alert_severity: ["low", "medium", "high", "critical"],
      alert_status: ["open", "in_progress", "resolved", "dismissed"],
      alert_type: [
        "wellbeing_drop",
        "overdue_review",
        "injury_flag",
        "parent_followup",
        "selection_setback",
        "low_engagement",
        "custom",
        "club_check_in",
        "scout_lead_assigned",
        "scout_action_overdue",
        "scout_stage_stalled",
      ],
      call_type: [
        "monthly_review",
        "check_in",
        "parent_call",
        "issue_followup",
        "commercial",
        "other",
        "club_conversation",
      ],
      parent_engagement_level: ["low", "moderate", "high"],
      task_owner_type: ["agent", "athlete", "parent", "admin"],
      task_status: ["open", "pending", "done", "cancelled"],
    },
  },
} as const
