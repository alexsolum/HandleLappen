export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      barcode_product_cache: {
        Row: {
          ai_enriched_at: string | null
          canonical_category: string | null
          confidence: number | null
          created_at: string
          ean: string
          expires_at: string | null
          normalized_name: string | null
          provider_fetched_at: string | null
          provider_payload: Json | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_enriched_at?: string | null
          canonical_category?: string | null
          confidence?: number | null
          created_at?: string
          ean: string
          expires_at?: string | null
          normalized_name?: string | null
          provider_fetched_at?: string | null
          provider_payload?: Json | null
          source: string
          status: string
          updated_at?: string
        }
        Update: {
          ai_enriched_at?: string | null
          canonical_category?: string | null
          confidence?: number | null
          created_at?: string
          ean?: string
          expires_at?: string | null
          normalized_name?: string | null
          provider_fetched_at?: string | null
          provider_payload?: Json | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_item_memory: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          id: string
          last_category_id: string | null
          last_used_at: string
          normalized_name: string
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          last_category_id?: string | null
          last_used_at?: string
          normalized_name: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          last_category_id?: string | null
          last_used_at?: string
          normalized_name?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_item_memory_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_item_memory_last_category_id_fkey"
            columns: ["last_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      item_history: {
        Row: {
          checked_at: string
          checked_by: string | null
          id: string
          item_id: string | null
          item_name: string
          list_id: string
          list_name: string | null
          store_id: string | null
          store_name: string | null
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          list_id: string
          list_name?: string | null
          store_id?: string | null
          store_name?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          list_id?: string
          list_name?: string | null
          store_id?: string | null
          store_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_history_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          category_id: string | null
          checked_at: string | null
          created_at: string | null
          id: string
          is_checked: boolean
          list_id: string
          name: string
          quantity: number | null
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          checked_at?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean
          list_id: string
          name: string
          quantity?: number | null
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          checked_at?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean
          list_id?: string
          name?: string
          quantity?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          automatic_store_selection_enabled: boolean
          avatar_url: string | null
          created_at: string | null
          display_name: string
          household_id: string | null
          id: string
        }
        Insert: {
          automatic_store_selection_enabled?: boolean
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          household_id?: string | null
          id: string
        }
        Update: {
          automatic_store_selection_enabled?: boolean
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          household_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_home_locations: {
        Row: {
          created_at: string
          lat_4dp: number
          lng_4dp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lat_4dp: number
          lng_4dp: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          lat_4dp?: number
          lng_4dp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          name: string
          position: number
          recipe_id: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          recipe_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          household_id: string
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          household_id: string
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          household_id?: string
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      store_layouts: {
        Row: {
          category_id: string
          position: number
          store_id: string
        }
        Insert: {
          category_id: string
          position?: number
          store_id: string
        }
        Update: {
          category_id?: string
          position?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_layouts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_layouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copurchase_recommendations: {
        Args: { p_limit?: number; p_list_id: string }
        Returns: {
          item_name: string
          last_checked_at: string
          paired_with: string
          purchase_count: number
        }[]
      }
      frequency_recommendations: {
        Args: { p_limit?: number }
        Returns: {
          item_name: string
          last_checked_at: string
          purchase_count: number
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      history_session_count: { Args: never; Returns: number }
      my_household_id: { Args: never; Returns: string }
      normalize_item_name: { Args: { p_name: string }; Returns: string }
      search_household_item_memory: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          item_name: string
          last_category_id: string
          last_used_at: string
          normalized_name: string
          use_count: number
        }[]
      }
      seed_default_categories: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      upsert_household_item_memory: {
        Args: {
          p_category_id?: string
          p_household_id: string
          p_increment?: number
          p_item_name: string
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


