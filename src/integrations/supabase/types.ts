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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_broadcast: boolean
          parent_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          parent_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          parent_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_fees: {
        Row: {
          amount_kes: number
          championship_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount_kes: number
          championship_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount_kes?: number
          championship_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      championship_subscriptions: {
        Row: {
          amount_paid_kes: number | null
          category: Database["public"]["Enums"]["game_category"] | null
          championship_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          paid_at: string | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
        }
        Insert: {
          amount_paid_kes?: number | null
          category?: Database["public"]["Enums"]["game_category"] | null
          championship_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Update: {
          amount_paid_kes?: number | null
          category?: Database["public"]["Enums"]["game_category"] | null
          championship_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      championships: {
        Row: {
          category: Database["public"]["Enums"]["game_category"] | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          level: Database["public"]["Enums"]["competition_level"]
          location: string | null
          name: string
          school_level: Database["public"]["Enums"]["school_level"]
          start_date: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["game_category"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          level: Database["public"]["Enums"]["competition_level"]
          location?: string | null
          name: string
          school_level?: Database["public"]["Enums"]["school_level"]
          start_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          level?: Database["public"]["Enums"]["competition_level"]
          location?: string | null
          name?: string
          school_level?: Database["public"]["Enums"]["school_level"]
          start_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      circulars: {
        Row: {
          content: string
          created_at: string
          document_url: string | null
          id: string
          is_published: boolean
          sender_name: string
          sender_role: string
          target_level: Database["public"]["Enums"]["competition_level"]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_url?: string | null
          id?: string
          is_published?: boolean
          sender_name: string
          sender_role?: string
          target_level?: Database["public"]["Enums"]["competition_level"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_url?: string | null
          id?: string
          is_published?: boolean
          sender_name?: string
          sender_role?: string
          target_level?: Database["public"]["Enums"]["competition_level"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          recipient: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          recipient?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          recipient?: string
          subject?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          category: Database["public"]["Enums"]["game_category"]
          championship_id: string | null
          created_at: string
          description: string | null
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_timed: boolean
          level: Database["public"]["Enums"]["competition_level"]
          max_qualifiers: number | null
          name: string
          race_type: string | null
          scheduled_date: string | null
          school_level: Database["public"]["Enums"]["school_level"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["game_category"]
          championship_id?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_timed?: boolean
          level: Database["public"]["Enums"]["competition_level"]
          max_qualifiers?: number | null
          name: string
          race_type?: string | null
          scheduled_date?: string | null
          school_level?: Database["public"]["Enums"]["school_level"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"]
          championship_id?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_timed?: boolean
          level?: Database["public"]["Enums"]["competition_level"]
          max_qualifiers?: number | null
          name?: string
          race_type?: string | null
          scheduled_date?: string | null
          school_level?: Database["public"]["Enums"]["school_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_participants: {
        Row: {
          created_at: string
          heat_id: string
          id: string
          is_qualified_for_final: boolean
          lane_number: number | null
          participant_id: string
          position: number | null
          time_taken: number | null
        }
        Insert: {
          created_at?: string
          heat_id: string
          id?: string
          is_qualified_for_final?: boolean
          lane_number?: number | null
          participant_id: string
          position?: number | null
          time_taken?: number | null
        }
        Update: {
          created_at?: string
          heat_id?: string
          id?: string
          is_qualified_for_final?: boolean
          lane_number?: number | null
          participant_id?: string
          position?: number | null
          time_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_participants_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "public_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      heats: {
        Row: {
          created_at: string
          game_id: string
          heat_number: number
          heat_type: string
          id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          heat_number: number
          heat_type?: string
          id?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          heat_number?: number
          heat_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_pools: {
        Row: {
          created_at: string
          game_id: string
          id: string
          notes: string | null
          round_name: string
          team_a_school_id: string | null
          team_a_score: number | null
          team_b_school_id: string | null
          team_b_score: number | null
          updated_at: string
          winner_school_id: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          notes?: string | null
          round_name?: string
          team_a_school_id?: string | null
          team_a_score?: number | null
          team_b_school_id?: string | null
          team_b_score?: number | null
          updated_at?: string
          winner_school_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          notes?: string | null
          round_name?: string
          team_a_school_id?: string | null
          team_a_score?: number | null
          team_b_school_id?: string | null
          team_b_score?: number | null
          updated_at?: string
          winner_school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_pools_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_pools_team_a_school_id_fkey"
            columns: ["team_a_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_pools_team_b_school_id_fkey"
            columns: ["team_b_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_pools_winner_school_id_fkey"
            columns: ["winner_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          bib_number: string | null
          contact: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          game_id: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_qualified: boolean
          lane_number: number | null
          last_name: string
          notes: string | null
          personal_best: number | null
          position: number | null
          school_id: string | null
          school_name: string | null
          score: number | null
          status: Database["public"]["Enums"]["participant_status"]
          time_taken: number | null
          tournament_team_id: string | null
          updated_at: string
        }
        Insert: {
          bib_number?: string | null
          contact?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          game_id: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_qualified?: boolean
          lane_number?: number | null
          last_name: string
          notes?: string | null
          personal_best?: number | null
          position?: number | null
          school_id?: string | null
          school_name?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"]
          time_taken?: number | null
          tournament_team_id?: string | null
          updated_at?: string
        }
        Update: {
          bib_number?: string | null
          contact?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          game_id?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_qualified?: boolean
          lane_number?: number | null
          last_name?: string
          notes?: string | null
          personal_best?: number | null
          position?: number | null
          school_id?: string | null
          school_name?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"]
          time_taken?: number | null
          tournament_team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_tournament_team_id_fkey"
            columns: ["tournament_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_kes: number
          created_at: string
          id: string
          paystack_reference: string
          paystack_response: Json | null
          plan_id: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          id?: string
          paystack_reference: string
          paystack_response?: Json | null
          plan_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          id?: string
          paystack_reference?: string
          paystack_response?: Json | null
          plan_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_bib_ranges: {
        Row: {
          championship_id: string
          created_at: string
          id: string
          range_end: number
          range_start: number
          school_id: string
          updated_at: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          id?: string
          range_end: number
          range_start: number
          school_id: string
          updated_at?: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          id?: string
          range_end?: number
          range_start?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          country: string
          county: string
          created_at: string
          id: string
          name: string
          region: string
          subcounty: string
          updated_at: string
          zone: string
        }
        Insert: {
          country?: string
          county?: string
          created_at?: string
          id?: string
          name: string
          region?: string
          subcounty?: string
          updated_at?: string
          zone?: string
        }
        Update: {
          country?: string
          county?: string
          created_at?: string
          id?: string
          name?: string
          region?: string
          subcounty?: string
          updated_at?: string
          zone?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          championship_quota: number
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          package_tier: string
          price_kes: number
          tier: Database["public"]["Enums"]["competition_tier"]
          trial_days: number
        }
        Insert: {
          championship_quota?: number
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          package_tier?: string
          price_kes: number
          tier: Database["public"]["Enums"]["competition_tier"]
          trial_days?: number
        }
        Update: {
          championship_quota?: number
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          package_tier?: string
          price_kes?: number
          tier?: Database["public"]["Enums"]["competition_tier"]
          trial_days?: number
        }
        Relationships: []
      }
      team_fee_payments: {
        Row: {
          amount_kes: number
          championship_id: string
          created_at: string
          fee_id: string
          id: string
          notes: string | null
          paid_at: string | null
          paystack_reference: string | null
          status: Database["public"]["Enums"]["team_payment_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          amount_kes: number
          championship_id: string
          created_at?: string
          fee_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paystack_reference?: string | null
          status?: Database["public"]["Enums"]["team_payment_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          amount_kes?: number
          championship_id?: string
          created_at?: string
          fee_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paystack_reference?: string | null
          status?: Database["public"]["Enums"]["team_payment_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "championship_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_fee_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_name: string
          county: string | null
          created_at: string
          email: string
          id: string
          last_active_at: string | null
          organization_name: string
          phone: string | null
          subcounty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name: string
          county?: string | null
          created_at?: string
          email: string
          id?: string
          last_active_at?: string | null
          organization_name: string
          phone?: string | null
          subcounty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          county?: string | null
          created_at?: string
          email?: string
          id?: string
          last_active_at?: string | null
          organization_name?: string
          phone?: string | null
          subcounty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tournament_teams: {
        Row: {
          championship_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          team_code: string | null
          team_color: string | null
          updated_at: string
        }
        Insert: {
          championship_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          team_code?: string | null
          team_color?: string | null
          updated_at?: string
        }
        Update: {
          championship_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          team_code?: string | null
          team_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          championship_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          championship_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          championship_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_participants: {
        Row: {
          bib_number: string | null
          championship_id: string | null
          created_at: string | null
          first_name: string | null
          game: Json | null
          game_id: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string | null
          is_qualified: boolean | null
          lane_number: number | null
          last_name: string | null
          personal_best: number | null
          position: number | null
          school: Json | null
          school_id: string | null
          school_name: string | null
          score: number | null
          status: Database["public"]["Enums"]["participant_status"] | null
          time_taken: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      public_team_fee_payments: {
        Row: {
          amount_kes: number | null
          championship_id: string | null
          created_at: string | null
          fee_id: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["team_payment_status"] | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_kes?: number | null
          championship_id?: string | null
          created_at?: string | null
          fee_id?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["team_payment_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_kes?: number | null
          championship_id?: string | null
          created_at?: string | null
          fee_id?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["team_payment_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "championship_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_fee_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_championship_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tenant_championship_quota_remaining: {
        Args: { _user_id: string }
        Returns: number
      }
      tenant_has_active_access: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "super_admin"
      competition_level:
        | "base"
        | "zone"
        | "subcounty"
        | "county"
        | "region"
        | "national"
        | "ward"
      competition_tier:
        | "zone"
        | "subcounty"
        | "county"
        | "regional"
        | "national"
        | "open_tournament"
        | "season_subcounty"
        | "season_county"
        | "season_regional"
        | "ward"
      game_category: "ball_games" | "athletics" | "music" | "other" | "indoor"
      gender: "boys" | "girls" | "mixed" | "male" | "female"
      participant_status:
        | "registered"
        | "called"
        | "present"
        | "absent"
        | "advanced"
      payment_status: "pending" | "success" | "failed" | "abandoned"
      school_level:
        | "primary"
        | "junior_secondary"
        | "primary_junior"
        | "senior_secondary"
        | "tertiary"
        | "open"
        | "base"
      subscription_status: "trialing" | "active" | "expired" | "cancelled"
      team_payment_status: "pending" | "paid" | "waived" | "failed"
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
      app_role: ["admin", "super_admin"],
      competition_level: [
        "base",
        "zone",
        "subcounty",
        "county",
        "region",
        "national",
        "ward",
      ],
      competition_tier: [
        "zone",
        "subcounty",
        "county",
        "regional",
        "national",
        "open_tournament",
        "season_subcounty",
        "season_county",
        "season_regional",
        "ward",
      ],
      game_category: ["ball_games", "athletics", "music", "other", "indoor"],
      gender: ["boys", "girls", "mixed", "male", "female"],
      participant_status: [
        "registered",
        "called",
        "present",
        "absent",
        "advanced",
      ],
      payment_status: ["pending", "success", "failed", "abandoned"],
      school_level: [
        "primary",
        "junior_secondary",
        "primary_junior",
        "senior_secondary",
        "tertiary",
        "open",
        "base",
      ],
      subscription_status: ["trialing", "active", "expired", "cancelled"],
      team_payment_status: ["pending", "paid", "waived", "failed"],
    },
  },
} as const
