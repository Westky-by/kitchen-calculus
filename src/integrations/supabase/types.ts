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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
          username: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          username?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      assets: {
        Row: {
          category_id: string | null
          code: string
          condition: string
          cost_per_unit: number
          created_at: string
          id: string
          image_url: string
          location: string
          min_stock: number
          name: string
          notes: string
          quantity: number
          total_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code?: string
          condition?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          image_url?: string
          location?: string
          min_stock?: number
          name: string
          notes?: string
          quantity?: number
          total_value?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string
          condition?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          image_url?: string
          location?: string
          min_stock?: number
          name?: string
          notes?: string
          quantity?: number
          total_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_bases: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          base_value: string
          category: string
          code: string
          cost_per_unit: number
          created_at: string
          id: string
          name: string
          purchase_price: number
          purchase_qty: number
          purchase_unit: string
          updated_at: string
          usage_unit: string
          yield_percent: number
          yield_qty: number
        }
        Insert: {
          base_value?: string
          category?: string
          code?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          name: string
          purchase_price?: number
          purchase_qty?: number
          purchase_unit?: string
          updated_at?: string
          usage_unit?: string
          yield_percent?: number
          yield_qty?: number
        }
        Update: {
          base_value?: string
          category?: string
          code?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          name?: string
          purchase_price?: number
          purchase_qty?: number
          purchase_unit?: string
          updated_at?: string
          usage_unit?: string
          yield_percent?: number
          yield_qty?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          position: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          position?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          position?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recipe_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          category: string
          code: string
          cost_per_portion: number
          created_at: string
          grand_total: number
          id: string
          ingredients: Json
          name: string
          overhead: Json
          portion_size: string
          profit_percent: number
          q_factor: number
          raw_material_cost: number
          real_fc_percent: number
          selling_price: number
          service_charge: number
          suggested_price: number
          target_fc_percent: number
          total_product_cost: number
          updated_at: string
          vat: number
        }
        Insert: {
          category?: string
          code?: string
          cost_per_portion?: number
          created_at?: string
          grand_total?: number
          id?: string
          ingredients?: Json
          name: string
          overhead?: Json
          portion_size?: string
          profit_percent?: number
          q_factor?: number
          raw_material_cost?: number
          real_fc_percent?: number
          selling_price?: number
          service_charge?: number
          suggested_price?: number
          target_fc_percent?: number
          total_product_cost?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          category?: string
          code?: string
          cost_per_portion?: number
          created_at?: string
          grand_total?: number
          id?: string
          ingredients?: Json
          name?: string
          overhead?: Json
          portion_size?: string
          profit_percent?: number
          q_factor?: number
          raw_material_cost?: number
          real_fc_percent?: number
          selling_price?: number
          service_charge?: number
          suggested_price?: number
          target_fc_percent?: number
          total_product_cost?: number
          updated_at?: string
          vat?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      version_updates: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_username: string
          id: string
          notes: string
          title: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_username?: string
          id?: string
          notes?: string
          title: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_username?: string
          id?: string
          notes?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
