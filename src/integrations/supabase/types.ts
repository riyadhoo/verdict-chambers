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
      cases: {
        Row: {
          case_date: string
          case_number: string
          case_story: string
          case_time: string | null
          charges: string
          created_at: string
          defendant: string
          difficulty: string
          explanation: Json
          hidden_truth: string
          id: string
          location: string
          official_verdict: string
          summary: string
          title: string
          victim: string
        }
        Insert: {
          case_date: string
          case_number?: string
          case_story: string
          case_time?: string | null
          charges: string
          created_at?: string
          defendant: string
          difficulty?: string
          explanation?: Json
          hidden_truth: string
          id?: string
          location: string
          official_verdict: string
          summary: string
          title: string
          victim: string
        }
        Update: {
          case_date?: string
          case_number?: string
          case_story?: string
          case_time?: string | null
          charges?: string
          created_at?: string
          defendant?: string
          difficulty?: string
          explanation?: Json
          hidden_truth?: string
          id?: string
          location?: string
          official_verdict?: string
          summary?: string
          title?: string
          victim?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          deleted: boolean
          game_id: string
          id: string
          message: string
          player_id: string | null
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          game_id: string
          id?: string
          message: string
          player_id?: string | null
        }
        Update: {
          created_at?: string
          deleted?: boolean
          game_id?: string
          id?: string
          message?: string
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          case_id: string
          content: Json
          default_locked: boolean
          description: string
          id: string
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          case_id: string
          content?: Json
          default_locked?: boolean
          description: string
          id?: string
          sort_order?: number
          title: string
          type: string
        }
        Update: {
          case_id?: string
          content?: Json
          default_locked?: boolean
          description?: string
          id?: string
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_assessments: {
        Row: {
          assessment: string
          evidence_id: string
          game_id: string
          id: string
          player_id: string
        }
        Insert: {
          assessment: string
          evidence_id: string
          game_id: string
          id?: string
          player_id: string
        }
        Update: {
          assessment?: string
          evidence_id?: string
          game_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_assessments_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_assessments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_evidence: {
        Row: {
          evidence_id: string
          game_id: string
          id: string
          released: boolean
          released_at: string | null
        }
        Insert: {
          evidence_id: string
          game_id: string
          id?: string
          released?: boolean
          released_at?: string | null
        }
        Update: {
          evidence_id?: string
          game_id?: string
          id?: string
          released?: boolean
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_evidence_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_evidence_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          admin_id: string
          case_id: string
          created_at: string
          ended_at: string | null
          id: string
          max_players: number
          paused: boolean
          room_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          admin_id: string
          case_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          paused?: boolean
          room_code: string
          started_at?: string | null
          status?: string
        }
        Update: {
          admin_id?: string
          case_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          paused?: boolean
          room_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          game_id: string
          id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          game_id: string
          id?: string
          player_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          game_id?: string
          id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          connected: boolean
          created_at: string
          display_name: string
          game_id: string
          id: string
          juror_number: number
          ready: boolean
          removed: boolean
          user_id: string
          vote_submitted: boolean
        }
        Insert: {
          connected?: boolean
          created_at?: string
          display_name: string
          game_id: string
          id?: string
          juror_number: number
          ready?: boolean
          removed?: boolean
          user_id: string
          vote_submitted?: boolean
        }
        Update: {
          connected?: boolean
          created_at?: string
          display_name?: string
          game_id?: string
          id?: string
          juror_number?: number
          ready?: boolean
          removed?: boolean
          user_id?: string
          vote_submitted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          case_id: string
          description: string
          evidence_id: string | null
          id: string
          sort_order: number
          ts_label: string
        }
        Insert: {
          case_id: string
          description: string
          evidence_id?: string | null
          id?: string
          sort_order?: number
          ts_label: string
        }
        Update: {
          case_id?: string
          description?: string
          evidence_id?: string | null
          id?: string
          sort_order?: number
          ts_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          game_id: string
          id: string
          player_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          vote: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      witnesses: {
        Row: {
          case_id: string
          credibility_notes: string | null
          id: string
          name: string
          role: string
          sort_order: number
          statement: string
        }
        Insert: {
          case_id: string
          credibility_notes?: string | null
          id?: string
          name: string
          role: string
          sort_order?: number
          statement: string
        }
        Update: {
          case_id?: string
          credibility_notes?: string | null
          id?: string
          name?: string
          role?: string
          sort_order?: number
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "witnesses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_game_admin: { Args: { _game: string }; Returns: boolean }
      is_game_member: { Args: { _game: string }; Returns: boolean }
      is_own_player: { Args: { _player: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
