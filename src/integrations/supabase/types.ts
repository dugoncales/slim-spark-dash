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
      configuracoes: {
        Row: {
          chave: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      medicoes: {
        Row: {
          ativ_fisica_dias_semana: number | null
          ativ_fisica_intensidade: string | null
          circunferencia: number | null
          colesterol_total: number | null
          consultas_edfisica: number | null
          consultas_edfisica_agendadas: number | null
          consultas_endocrino: number | null
          consultas_endocrino_agendadas: number | null
          consultas_nutri: number | null
          consultas_nutri_agendadas: number | null
          consultas_psico: number | null
          consultas_psico_agendadas: number | null
          created_at: string
          dose: string | null
          glicemia_jejum: number | null
          hba1c: number | null
          hdl: number | null
          id: string
          imc: number | null
          ldl: number | null
          medicamento: string | null
          mes_referencia: string
          nutri_aumentou_proteina: boolean | null
          nutri_aumentou_vegetais: boolean | null
          nutri_controle_porcoes: boolean | null
          nutri_reduziu_acucar: boolean | null
          nutri_reduziu_alcool: boolean | null
          nutri_reduziu_ultraprocessados: boolean | null
          observacao: string | null
          pa_diastolica: number | null
          pa_sistolica: number | null
          participante_id: string
          peso: number | null
          triglicerideos: number | null
          updated_at: string
        }
        Insert: {
          ativ_fisica_dias_semana?: number | null
          ativ_fisica_intensidade?: string | null
          circunferencia?: number | null
          colesterol_total?: number | null
          consultas_edfisica?: number | null
          consultas_edfisica_agendadas?: number | null
          consultas_endocrino?: number | null
          consultas_endocrino_agendadas?: number | null
          consultas_nutri?: number | null
          consultas_nutri_agendadas?: number | null
          consultas_psico?: number | null
          consultas_psico_agendadas?: number | null
          created_at?: string
          dose?: string | null
          glicemia_jejum?: number | null
          hba1c?: number | null
          hdl?: number | null
          id?: string
          imc?: number | null
          ldl?: number | null
          medicamento?: string | null
          mes_referencia: string
          nutri_aumentou_proteina?: boolean | null
          nutri_aumentou_vegetais?: boolean | null
          nutri_controle_porcoes?: boolean | null
          nutri_reduziu_acucar?: boolean | null
          nutri_reduziu_alcool?: boolean | null
          nutri_reduziu_ultraprocessados?: boolean | null
          observacao?: string | null
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          participante_id: string
          peso?: number | null
          triglicerideos?: number | null
          updated_at?: string
        }
        Update: {
          ativ_fisica_dias_semana?: number | null
          ativ_fisica_intensidade?: string | null
          circunferencia?: number | null
          colesterol_total?: number | null
          consultas_edfisica?: number | null
          consultas_edfisica_agendadas?: number | null
          consultas_endocrino?: number | null
          consultas_endocrino_agendadas?: number | null
          consultas_nutri?: number | null
          consultas_nutri_agendadas?: number | null
          consultas_psico?: number | null
          consultas_psico_agendadas?: number | null
          created_at?: string
          dose?: string | null
          glicemia_jejum?: number | null
          hba1c?: number | null
          hdl?: number | null
          id?: string
          imc?: number | null
          ldl?: number | null
          medicamento?: string | null
          mes_referencia?: string
          nutri_aumentou_proteina?: boolean | null
          nutri_aumentou_vegetais?: boolean | null
          nutri_controle_porcoes?: boolean | null
          nutri_reduziu_acucar?: boolean | null
          nutri_reduziu_alcool?: boolean | null
          nutri_reduziu_ultraprocessados?: boolean | null
          observacao?: string | null
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          participante_id?: string
          peso?: number | null
          triglicerideos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes: {
        Row: {
          altura: number | null
          ativo: boolean
          circunferencia_inicial: number | null
          created_at: string
          grupo_id: string | null
          id: string
          imc_inicial: number
          mes_inicio: string | null
          nome: string
          numero: number
          peso_inicial: number
          sexo: Database["public"]["Enums"]["sexo_tipo"] | null
          updated_at: string
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          circunferencia_inicial?: number | null
          created_at?: string
          grupo_id?: string | null
          id?: string
          imc_inicial: number
          mes_inicio?: string | null
          nome: string
          numero: number
          peso_inicial: number
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
          updated_at?: string
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          circunferencia_inicial?: number | null
          created_at?: string
          grupo_id?: string | null
          id?: string
          imc_inicial?: number
          mes_inicio?: string | null
          nome?: string
          numero?: number
          peso_inicial?: number
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      user_grupos: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_participante: {
        Args: { _grupo_id: string; _user_id: string }
        Returns: boolean
      }
      grant_user_grupo: {
        Args: { _grupo_id: string; _target_user_id: string }
        Returns: undefined
      }
      grant_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_user_grupos: {
        Args: never
        Returns: {
          grupo_id: string
          user_id: string
        }[]
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      next_participante_numero: { Args: never; Returns: number }
      revoke_user_grupo: {
        Args: { _grupo_id: string; _target_user_id: string }
        Returns: undefined
      }
      revoke_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      user_grupo_ids: { Args: { _user_id: string }; Returns: string[] }
      user_has_grupo: {
        Args: { _grupo_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor_saude" | "gestor"
      sexo_tipo: "masculino" | "feminino"
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
    Enums: {
      app_role: ["admin", "gestor_saude", "gestor"],
      sexo_tipo: ["masculino", "feminino"],
    },
  },
} as const
