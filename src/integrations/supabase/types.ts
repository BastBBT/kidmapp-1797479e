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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          email: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          min_supported_build: number
          min_supported_label: string | null
          platform: string
          store_url: string | null
          updated_at: string
        }
        Insert: {
          min_supported_build?: number
          min_supported_label?: string | null
          platform: string
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          min_supported_build?: number
          min_supported_label?: string | null
          platform?: string
          store_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          bookable: string | null
          changing_table: boolean | null
          content: string | null
          created_at: string
          high_chair: boolean | null
          id: string
          kids_area: boolean | null
          kids_menu: boolean | null
          language: string | null
          location_id: string
          status: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          bookable?: string | null
          changing_table?: boolean | null
          content?: string | null
          created_at?: string
          high_chair?: boolean | null
          id?: string
          kids_area?: boolean | null
          kids_menu?: boolean | null
          language?: string | null
          location_id: string
          status?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          bookable?: string | null
          changing_table?: boolean | null
          content?: string | null
          created_at?: string
          high_chair?: boolean | null
          id?: string
          kids_area?: boolean | null
          kids_menu?: boolean | null
          language?: string | null
          location_id?: string
          status?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_favorites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_occurrences: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string
          event_id: string
          id: string
          time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start: string
          event_id: string
          id?: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string
          event_id?: string
          id?: string
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          admin_fav: boolean
          admin_fav_at: string | null
          admin_fav_visual_at: string | null
          age_max: number | null
          age_max_months: number | null
          age_min: number | null
          age_min_months: number | null
          category: string
          created_at: string
          date_end: string | null
          date_start: string
          duration: string | null
          favorites_count: number
          id: string
          instagram: string | null
          lat: number | null
          lng: number | null
          name: string
          note: string | null
          photo: string | null
          price: string | null
          status: string
          time: string | null
          updated_at: string
          user_id: string | null
          weather: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_fav?: boolean
          admin_fav_at?: string | null
          admin_fav_visual_at?: string | null
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          category: string
          created_at?: string
          date_end?: string | null
          date_start: string
          duration?: string | null
          favorites_count?: number
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          note?: string | null
          photo?: string | null
          price?: string | null
          status?: string
          time?: string | null
          updated_at?: string
          user_id?: string | null
          weather?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_fav?: boolean
          admin_fav_at?: string | null
          admin_fav_visual_at?: string | null
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          category?: string
          created_at?: string
          date_end?: string | null
          date_start?: string
          duration?: string | null
          favorites_count?: number
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          note?: string | null
          photo?: string | null
          price?: string | null
          status?: string
          time?: string | null
          updated_at?: string
          user_id?: string | null
          weather?: string | null
          website?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_meals: {
        Row: {
          confirmed_count: number
          created_at: string
          created_by: string | null
          id: string
          is_confirmed: boolean
          location_id: string
          meal_type_id: string
          time_close: string | null
          time_open: string | null
        }
        Insert: {
          confirmed_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_confirmed?: boolean
          location_id: string
          meal_type_id: string
          time_close?: string | null
          time_open?: string | null
        }
        Update: {
          confirmed_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_confirmed?: boolean
          location_id?: string
          meal_type_id?: string
          time_close?: string | null
          time_open?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_meals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_meals_meal_type_id_fkey"
            columns: ["meal_type_id"]
            isOneToOne: false
            referencedRelation: "meal_types"
            referencedColumns: ["id"]
          },
        ]
      }
      location_proposals: {
        Row: {
          address: string
          age_max: number | null
          age_max_months: number | null
          age_min: number | null
          age_min_months: number | null
          bookable: string | null
          category: string
          changing_table: boolean | null
          created_at: string | null
          duration: string | null
          effort: string | null
          high_chair: boolean | null
          id: string
          instagram: string | null
          kids_area: boolean | null
          kids_menu: boolean
          metadata: Json | null
          name: string
          note: string | null
          photo: string | null
          price: string | null
          status: string | null
          user_id: string
          weather: string | null
          website: string | null
        }
        Insert: {
          address: string
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          bookable?: string | null
          category: string
          changing_table?: boolean | null
          created_at?: string | null
          duration?: string | null
          effort?: string | null
          high_chair?: boolean | null
          id?: string
          instagram?: string | null
          kids_area?: boolean | null
          kids_menu?: boolean
          metadata?: Json | null
          name: string
          note?: string | null
          photo?: string | null
          price?: string | null
          status?: string | null
          user_id: string
          weather?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          bookable?: string | null
          category?: string
          changing_table?: boolean | null
          created_at?: string | null
          duration?: string | null
          effort?: string | null
          high_chair?: boolean | null
          id?: string
          instagram?: string | null
          kids_area?: boolean | null
          kids_menu?: boolean
          metadata?: Json | null
          name?: string
          note?: string | null
          photo?: string | null
          price?: string | null
          status?: string | null
          user_id?: string
          weather?: string | null
          website?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          age_max: number | null
          age_max_months: number | null
          age_min: number | null
          age_min_months: number | null
          bookable: string | null
          category: string
          changing_table: boolean
          city: string
          created_at: string
          duration: string | null
          effort: string | null
          favorites_count: number
          high_chair: boolean
          id: string
          instagram: string | null
          kids_area: boolean
          kids_menu: boolean
          lat: number
          lng: number
          name: string
          note: string | null
          photo: string | null
          photos: string[] | null
          price: string | null
          reel_url: string | null
          status: string
          updated_at: string
          weather: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          bookable?: string | null
          category: string
          changing_table?: boolean
          city?: string
          created_at?: string
          duration?: string | null
          effort?: string | null
          favorites_count?: number
          high_chair?: boolean
          id?: string
          instagram?: string | null
          kids_area?: boolean
          kids_menu?: boolean
          lat: number
          lng: number
          name: string
          note?: string | null
          photo?: string | null
          photos?: string[] | null
          price?: string | null
          reel_url?: string | null
          status?: string
          updated_at?: string
          weather?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          age_max?: number | null
          age_max_months?: number | null
          age_min?: number | null
          age_min_months?: number | null
          bookable?: string | null
          category?: string
          changing_table?: boolean
          city?: string
          created_at?: string
          duration?: string | null
          effort?: string | null
          favorites_count?: number
          high_chair?: boolean
          id?: string
          instagram?: string | null
          kids_area?: boolean
          kids_menu?: boolean
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          photo?: string | null
          photos?: string[] | null
          price?: string | null
          reel_url?: string | null
          status?: string
          updated_at?: string
          weather?: string | null
          website?: string | null
        }
        Relationships: []
      }
      meal_types: {
        Row: {
          bg_hex: string | null
          color_hex: string | null
          default_days: string | null
          default_time_end: string | null
          default_time_start: string | null
          emoji: string
          fill_hex: string | null
          id: string
          label: string
          short_label: string
          sort_order: number | null
        }
        Insert: {
          bg_hex?: string | null
          color_hex?: string | null
          default_days?: string | null
          default_time_end?: string | null
          default_time_start?: string | null
          emoji: string
          fill_hex?: string | null
          id: string
          label: string
          short_label: string
          sort_order?: number | null
        }
        Update: {
          bg_hex?: string | null
          color_hex?: string | null
          default_days?: string | null
          default_time_end?: string | null
          default_time_start?: string | null
          emoji?: string
          fill_hex?: string | null
          id?: string
          label?: string
          short_label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      point_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acquisition_detail: string | null
          acquisition_source: string | null
          acquisition_source_at: string | null
          created_at: string
          full_name: string | null
          id: string
          points: number
          role: string
        }
        Insert: {
          acquisition_detail?: string | null
          acquisition_source?: string | null
          acquisition_source_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          points?: number
          role?: string
        }
        Update: {
          acquisition_detail?: string | null
          acquisition_source?: string | null
          acquisition_source_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          points?: number
          role?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audience_stats: { Args: never; Returns: Json }
      apply_data_retention: { Args: never; Returns: undefined }
      award_points: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      get_contributor_names: {
        Args: { _ids: string[] }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      increment_meal_confirmed_count: {
        Args: { p_location_id: string; p_meal_type_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_event_visual_generated: {
        Args: { _event_id: string }
        Returns: undefined
      }
      notify_validation_async: {
        Args: { record_id: string; record_type: string }
        Returns: undefined
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
