export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          last_login: string | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login?: string | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          guest_preferences: Json | null
          id: string
          interaction_count: number | null
          last_activity: string
          session_id: string
        }
        Insert: {
          created_at?: string
          guest_preferences?: Json | null
          id?: string
          interaction_count?: number | null
          last_activity?: string
          session_id: string
        }
        Update: {
          created_at?: string
          guest_preferences?: Json | null
          id?: string
          interaction_count?: number | null
          last_activity?: string
          session_id?: string
        }
        Relationships: []
      }
      hotel_information: {
        Row: {
          base_price: number | null
          category: string
          created_at: string
          description: string | null
          final_negotiation_limit: number | null
          id: string
          is_active: boolean | null
          item_name: string
          negotiation_margin_percent: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          base_price?: number | null
          category: string
          created_at?: string
          description?: string | null
          final_negotiation_limit?: number | null
          id?: string
          is_active?: boolean | null
          item_name: string
          negotiation_margin_percent?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          base_price?: number | null
          category?: string
          created_at?: string
          description?: string | null
          final_negotiation_limit?: number | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          negotiation_margin_percent?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          created_at: string
          id: string
          prompt_key: string
          prompt_text: string
          response_template: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          prompt_key: string
          prompt_text: string
          response_template?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          prompt_key?: string
          prompt_text?: string
          response_template?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          file_type: string | null
          filename: string
          id: string
          records_imported: number | null
          status: string | null
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          file_type?: string | null
          filename: string
          id?: string
          records_imported?: number | null
          status?: string | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          file_type?: string | null
          filename?: string
          id?: string
          records_imported?: number | null
          status?: string | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          ai_response: string
          id: string
          interaction_timestamp: string
          knowledge_used: string[] | null
          response_rating: number | null
          response_time_ms: number | null
          session_id: string
          user_input: string
        }
        Insert: {
          ai_response: string
          id?: string
          interaction_timestamp?: string
          knowledge_used?: string[] | null
          response_rating?: number | null
          response_time_ms?: number | null
          session_id: string
          user_input: string
        }
        Update: {
          ai_response?: string
          id?: string
          interaction_timestamp?: string
          knowledge_used?: string[] | null
          response_rating?: number | null
          response_time_ms?: number | null
          session_id?: string
          user_input?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_knowledge_usage: {
        Args: { prompt_keys: string[] }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
