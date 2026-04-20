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
      contributions: {
        Row: {
          bookable: string | null
          changing_table: boolean | null
          content: string | null
          created_at: string
          high_chair: boolean | null
          id: string
          kids_area: boolean | null
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
          bookable: string | null
          category: string
          changing_table: boolean | null
          created_at: string | null
          high_chair: boolean | null
          id: string
          instagram: string | null
          kids_area: boolean | null
          metadata: Json | null
          name: string
          note: string | null
          photo: string | null
          status: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address: string
          bookable?: string | null
          category: string
          changing_table?: boolean | null
          created_at?: string | null
          high_chair?: boolean | null
          id?: string
          instagram?: string | null
          kids_area?: boolean | null
          metadata?: Json | null
          name: string
          note?: string | null
          photo?: string | null
          status?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string
          bookable?: string | null
          category?: string
          changing_table?: boolean | null
          created_at?: string | null
          high_chair?: boolean | null
          id?: string
          instagram?: string | null
          kids_area?: boolean | null
          metadata?: Json | null
          name?: string
          note?: string | null
          photo?: string | null
          status?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          bookable: string | null
          category: string
          changing_table: boolean
          city: string
          created_at: string
          high_chair: boolean
          id: string
          instagram: string | null
          kids_area: boolean
          lat: number
          lng: number
          name: string
          note: string | null
          photo: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bookable?: string | null
          category: string
          changing_table?: boolean
          city?: string
          created_at?: string
          high_chair?: boolean
          id?: string
          instagram?: string | null
          kids_area?: boolean
          lat: number
          lng: number
          name: string
          note?: string | null
          photo?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bookable?: string | null
          category?: string
          changing_table?: boolean
          city?: string
          created_at?: string
          high_chair?: boolean
          id?: string
          instagram?: string | null
          kids_area?: boolean
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          photo?: string | null
          status?: string
          updated_at?: string
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
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_meal_confirmed_count: {
        Args: { p_location_id: string; p_meal_type_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
