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
      aires: {
        Row: {
          capacite: number
          chantier_id: string
          created_at: string
          description: string | null
          id: string
          nom: string
        }
        Insert: {
          capacite?: number
          chantier_id: string
          created_at?: string
          description?: string | null
          id?: string
          nom: string
        }
        Update: {
          capacite?: number
          chantier_id?: string
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "aires_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantier_members: {
        Row: {
          chantier_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chantier_members_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      chantiers: {
        Row: {
          actif: boolean
          adresse: string | null
          conducteur_id: string
          created_at: string
          date_debut: string | null
          date_fin: string | null
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          conducteur_id: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          conducteur_id?: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      demande_materiels: {
        Row: {
          demande_id: string
          id: string
          materiel_id: string
          quantite: number
        }
        Insert: {
          demande_id: string
          id?: string
          materiel_id: string
          quantite?: number
        }
        Update: {
          demande_id?: string
          id?: string
          materiel_id?: string
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "demande_materiels_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demande_materiels_materiel_id_fkey"
            columns: ["materiel_id"]
            isOneToOne: false
            referencedRelation: "materiels"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes: {
        Row: {
          aire_id: string | null
          chantier_id: string
          commentaire: string | null
          created_at: string
          debut: string
          duree_min: number
          id: string
          nature: string
          prestataire_id: string
          quantite: number | null
          raison_refus: string | null
          statut: Database["public"]["Enums"]["demande_statut"]
          unite: string | null
          updated_at: string
        }
        Insert: {
          aire_id?: string | null
          chantier_id: string
          commentaire?: string | null
          created_at?: string
          debut: string
          duree_min?: number
          id?: string
          nature: string
          prestataire_id: string
          quantite?: number | null
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["demande_statut"]
          unite?: string | null
          updated_at?: string
        }
        Update: {
          aire_id?: string | null
          chantier_id?: string
          commentaire?: string | null
          created_at?: string
          debut?: string
          duree_min?: number
          id?: string
          nature?: string
          prestataire_id?: string
          quantite?: number | null
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["demande_statut"]
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_aire_id_fkey"
            columns: ["aire_id"]
            isOneToOne: false
            referencedRelation: "aires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      materiels: {
        Row: {
          chantier_id: string
          created_at: string
          id: string
          nom: string
          quantite: number
          type: string | null
        }
        Insert: {
          chantier_id: string
          created_at?: string
          id?: string
          nom: string
          quantite?: number
          type?: string | null
        }
        Update: {
          chantier_id?: string
          created_at?: string
          id?: string
          nom?: string
          quantite?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiels_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          chantier_id: string | null
          created_at: string
          demande_id: string | null
          id: string
          lien: string | null
          lu: boolean
          message: string | null
          titre: string
          type: string
          user_id: string
        }
        Insert: {
          chantier_id?: string | null
          created_at?: string
          demande_id?: string | null
          id?: string
          lien?: string | null
          lu?: boolean
          message?: string | null
          titre: string
          type: string
          user_id: string
        }
        Update: {
          chantier_id?: string | null
          created_at?: string
          demande_id?: string | null
          id?: string
          lien?: string | null
          lu?: boolean
          message?: string | null
          titre?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      venues: {
        Row: {
          arrivee_reelle: string | null
          commentaire: string | null
          created_at: string
          demande_id: string
          depart_reel: string | null
          enregistre_par: string | null
          id: string
          non_conformites: string[] | null
          photos: string[] | null
        }
        Insert: {
          arrivee_reelle?: string | null
          commentaire?: string | null
          created_at?: string
          demande_id: string
          depart_reel?: string | null
          enregistre_par?: string | null
          id?: string
          non_conformites?: string[] | null
          photos?: string[] | null
        }
        Update: {
          arrivee_reelle?: string | null
          commentaire?: string | null
          created_at?: string
          demande_id?: string
          depart_reel?: string | null
          enregistre_par?: string | null
          id?: string
          non_conformites?: string[] | null
          photos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_chantier: {
        Args: { _chantier_id: string; _user_id: string }
        Returns: boolean
      }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conducteur_of: {
        Args: { _chantier_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "conducteur" | "prestataire" | "operateur"
      demande_statut:
        | "en_cours"
        | "acceptee"
        | "refusee"
        | "modifiee"
        | "terminee"
        | "annulee"
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
      app_role: ["admin", "conducteur", "prestataire", "operateur"],
      demande_statut: [
        "en_cours",
        "acceptee",
        "refusee",
        "modifiee",
        "terminee",
        "annulee",
      ],
    },
  },
} as const
