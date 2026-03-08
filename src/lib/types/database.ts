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
      households: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          household_id: string | null
          display_name: string
          avatar_url: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          household_id?: string | null
          display_name: string
          avatar_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string | null
          display_name?: string
          avatar_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      my_household_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}