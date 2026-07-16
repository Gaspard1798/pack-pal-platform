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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          ancienne_valeur: Json | null
          contexte: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          nouvelle_valeur: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          ancienne_valeur?: Json | null
          contexte?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          nouvelle_valeur?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          ancienne_valeur?: Json | null
          contexte?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          nouvelle_valeur?: Json | null
        }
        Relationships: []
      }
      batiments: {
        Row: {
          chantier_id: string
          created_at: string
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          chantier_id: string
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batiments_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      blocs: {
        Row: {
          batiment_id: string
          created_at: string
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          batiment_id: string
          created_at?: string
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          batiment_id?: string
          created_at?: string
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocs_batiment_id_fkey"
            columns: ["batiment_id"]
            isOneToOne: false
            referencedRelation: "batiments"
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
      compagnons: {
        Row: {
          actif: boolean
          created_at: string
          email: string | null
          entreprise_id: string | null
          id: string
          nom: string
          prenom: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email?: string | null
          entreprise_id?: string | null
          id?: string
          nom: string
          prenom?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string | null
          entreprise_id?: string | null
          id?: string
          nom?: string
          prenom?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compagnons_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      contenants: {
        Row: {
          actif: boolean
          chantier_id: string
          created_at: string
          emplacement: string | null
          id: string
          notes: string | null
          reference: string
          type: Database["public"]["Enums"]["contenant_type"]
          type_dechet: Database["public"]["Enums"]["dechet_type"]
          updated_at: string
          volume_m3: number | null
        }
        Insert: {
          actif?: boolean
          chantier_id: string
          created_at?: string
          emplacement?: string | null
          id?: string
          notes?: string | null
          reference: string
          type: Database["public"]["Enums"]["contenant_type"]
          type_dechet: Database["public"]["Enums"]["dechet_type"]
          updated_at?: string
          volume_m3?: number | null
        }
        Update: {
          actif?: boolean
          chantier_id?: string
          created_at?: string
          emplacement?: string | null
          id?: string
          notes?: string | null
          reference?: string
          type?: Database["public"]["Enums"]["contenant_type"]
          type_dechet?: Database["public"]["Enums"]["dechet_type"]
          updated_at?: string
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contenants_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
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
      demandes_acces: {
        Row: {
          chantier_id: string
          compagnon_id: string | null
          created_at: string
          date_prevue: string
          demandeur_id: string
          heure_debut: string
          heure_fin: string
          id: string
          logement_id: string
          lot_id: string | null
          motif: string
          raison_refus: string | null
          statut: Database["public"]["Enums"]["demande_acces_statut"]
          updated_at: string
          urgence: Database["public"]["Enums"]["demande_acces_urgence"]
          valide_par: string | null
        }
        Insert: {
          chantier_id: string
          compagnon_id?: string | null
          created_at?: string
          date_prevue: string
          demandeur_id: string
          heure_debut: string
          heure_fin: string
          id?: string
          logement_id: string
          lot_id?: string | null
          motif: string
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["demande_acces_statut"]
          updated_at?: string
          urgence?: Database["public"]["Enums"]["demande_acces_urgence"]
          valide_par?: string | null
        }
        Update: {
          chantier_id?: string
          compagnon_id?: string | null
          created_at?: string
          date_prevue?: string
          demandeur_id?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          logement_id?: string
          lot_id?: string | null
          motif?: string
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["demande_acces_statut"]
          updated_at?: string
          urgence?: Database["public"]["Enums"]["demande_acces_urgence"]
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_acces_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_acces_compagnon_id_fkey"
            columns: ["compagnon_id"]
            isOneToOne: false
            referencedRelation: "compagnons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_acces_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_acces_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          adresse: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          nom: string
          notes: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      interventions: {
        Row: {
          chantier_id: string
          compagnon_id: string | null
          coureur_id: string
          created_at: string
          demande_id: string | null
          heure_fermeture: string | null
          heure_ouverture: string
          id: string
          logement_id: string
          notes: string | null
          photos_apres: string[]
          photos_avant: string[]
          statut: Database["public"]["Enums"]["intervention_statut"]
          trousseau_id: string | null
          updated_at: string
        }
        Insert: {
          chantier_id: string
          compagnon_id?: string | null
          coureur_id: string
          created_at?: string
          demande_id?: string | null
          heure_fermeture?: string | null
          heure_ouverture?: string
          id?: string
          logement_id: string
          notes?: string | null
          photos_apres?: string[]
          photos_avant?: string[]
          statut?: Database["public"]["Enums"]["intervention_statut"]
          trousseau_id?: string | null
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          compagnon_id?: string | null
          coureur_id?: string
          created_at?: string
          demande_id?: string | null
          heure_fermeture?: string | null
          heure_ouverture?: string
          id?: string
          logement_id?: string
          notes?: string | null
          photos_apres?: string[]
          photos_avant?: string[]
          statut?: Database["public"]["Enums"]["intervention_statut"]
          trousseau_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_compagnon_id_fkey"
            columns: ["compagnon_id"]
            isOneToOne: false
            referencedRelation: "compagnons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes_acces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_trousseau_id_fkey"
            columns: ["trousseau_id"]
            isOneToOne: false
            referencedRelation: "trousseaux"
            referencedColumns: ["id"]
          },
        ]
      }
      logements: {
        Row: {
          consignes: string | null
          created_at: string
          dernier_etat: Json | null
          id: string
          niveau_id: string
          numero: string
          phase: Database["public"]["Enums"]["logement_phase"]
          sensibilite: Database["public"]["Enums"]["logement_sensibilite"]
          statut: Database["public"]["Enums"]["logement_statut"]
          updated_at: string
        }
        Insert: {
          consignes?: string | null
          created_at?: string
          dernier_etat?: Json | null
          id?: string
          niveau_id: string
          numero: string
          phase?: Database["public"]["Enums"]["logement_phase"]
          sensibilite?: Database["public"]["Enums"]["logement_sensibilite"]
          statut?: Database["public"]["Enums"]["logement_statut"]
          updated_at?: string
        }
        Update: {
          consignes?: string | null
          created_at?: string
          dernier_etat?: Json | null
          id?: string
          niveau_id?: string
          numero?: string
          phase?: Database["public"]["Enums"]["logement_phase"]
          sensibilite?: Database["public"]["Enums"]["logement_sensibilite"]
          statut?: Database["public"]["Enums"]["logement_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logements_niveau_id_fkey"
            columns: ["niveau_id"]
            isOneToOne: false
            referencedRelation: "niveaux"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          chantier_id: string
          code: string | null
          created_at: string
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          chantier_id: string
          code?: string | null
          created_at?: string
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          chantier_id?: string
          code?: string | null
          created_at?: string
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_chantier_id_fkey"
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
      mouvements_cles: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          destinataire_id: string | null
          destinataire_libre: string | null
          ecart: string | null
          emetteur_id: string | null
          id: string
          logement_id: string | null
          motif: string | null
          restitution_prevue: string | null
          restitution_reelle: string | null
          trousseau_id: string
          type: Database["public"]["Enums"]["mouvement_type"]
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          destinataire_id?: string | null
          destinataire_libre?: string | null
          ecart?: string | null
          emetteur_id?: string | null
          id?: string
          logement_id?: string | null
          motif?: string | null
          restitution_prevue?: string | null
          restitution_reelle?: string | null
          trousseau_id: string
          type: Database["public"]["Enums"]["mouvement_type"]
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          destinataire_id?: string | null
          destinataire_libre?: string | null
          ecart?: string | null
          emetteur_id?: string | null
          id?: string
          logement_id?: string | null
          motif?: string | null
          restitution_prevue?: string | null
          restitution_reelle?: string | null
          trousseau_id?: string
          type?: Database["public"]["Enums"]["mouvement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_cles_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_cles_trousseau_id_fkey"
            columns: ["trousseau_id"]
            isOneToOne: false
            referencedRelation: "trousseaux"
            referencedColumns: ["id"]
          },
        ]
      }
      niveaux: {
        Row: {
          bloc_id: string
          created_at: string
          id: string
          nom: string
          ordre: number | null
          updated_at: string
        }
        Insert: {
          bloc_id: string
          created_at?: string
          id?: string
          nom: string
          ordre?: number | null
          updated_at?: string
        }
        Update: {
          bloc_id?: string
          created_at?: string
          id?: string
          nom?: string
          ordre?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveaux_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "blocs"
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
      prises_poste: {
        Row: {
          chantier_id: string
          cles_non_restituees: Json | null
          connexion_ok: boolean
          consignes_jour: string | null
          controleur_id: string | null
          coureur_id: string | null
          created_at: string
          debut_at: string
          ecarts: Json
          fin_at: string | null
          gestionnaire_id: string
          id: string
          interventions_ouvertes: Json | null
          inventaire: Json
          inventaire_fin: Json | null
          logements_ouverts: Json | null
          nc_en_attente: Json | null
          passation_a: string | null
          passation_at: string | null
          telephone_ok: boolean
          updated_at: string
          zone: string | null
        }
        Insert: {
          chantier_id: string
          cles_non_restituees?: Json | null
          connexion_ok?: boolean
          consignes_jour?: string | null
          controleur_id?: string | null
          coureur_id?: string | null
          created_at?: string
          debut_at?: string
          ecarts?: Json
          fin_at?: string | null
          gestionnaire_id: string
          id?: string
          interventions_ouvertes?: Json | null
          inventaire?: Json
          inventaire_fin?: Json | null
          logements_ouverts?: Json | null
          nc_en_attente?: Json | null
          passation_a?: string | null
          passation_at?: string | null
          telephone_ok?: boolean
          updated_at?: string
          zone?: string | null
        }
        Update: {
          chantier_id?: string
          cles_non_restituees?: Json | null
          connexion_ok?: boolean
          consignes_jour?: string | null
          controleur_id?: string | null
          coureur_id?: string | null
          created_at?: string
          debut_at?: string
          ecarts?: Json
          fin_at?: string | null
          gestionnaire_id?: string
          id?: string
          interventions_ouvertes?: Json | null
          inventaire?: Json
          inventaire_fin?: Json | null
          logements_ouverts?: Json | null
          nc_en_attente?: Json | null
          passation_a?: string | null
          passation_at?: string | null
          telephone_ok?: boolean
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prises_poste_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          entreprise_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          entreprise_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          entreprise_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      rotation_validations: {
        Row: {
          commentaire: string | null
          created_at: string
          effectuee_le: string
          id: string
          photos: string[] | null
          poids_estime_kg: number | null
          rotation_id: string
          validee_par: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          effectuee_le?: string
          id?: string
          photos?: string[] | null
          poids_estime_kg?: number | null
          rotation_id: string
          validee_par?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          effectuee_le?: string
          id?: string
          photos?: string[] | null
          poids_estime_kg?: number | null
          rotation_id?: string
          validee_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotation_validations_rotation_id_fkey"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "rotations"
            referencedColumns: ["id"]
          },
        ]
      }
      rotations: {
        Row: {
          aire_id: string | null
          chantier_id: string
          commentaire: string | null
          contenant_id: string | null
          contenant_type: Database["public"]["Enums"]["contenant_type"]
          created_at: string
          debut: string
          duree_min: number
          id: string
          prestataire_id: string
          raison_refus: string | null
          statut: Database["public"]["Enums"]["rotation_statut"]
          type_dechet: Database["public"]["Enums"]["dechet_type"]
          type_operation: Database["public"]["Enums"]["rotation_operation"]
          updated_at: string
          volume_m3: number | null
        }
        Insert: {
          aire_id?: string | null
          chantier_id: string
          commentaire?: string | null
          contenant_id?: string | null
          contenant_type: Database["public"]["Enums"]["contenant_type"]
          created_at?: string
          debut: string
          duree_min?: number
          id?: string
          prestataire_id: string
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["rotation_statut"]
          type_dechet: Database["public"]["Enums"]["dechet_type"]
          type_operation?: Database["public"]["Enums"]["rotation_operation"]
          updated_at?: string
          volume_m3?: number | null
        }
        Update: {
          aire_id?: string | null
          chantier_id?: string
          commentaire?: string | null
          contenant_id?: string | null
          contenant_type?: Database["public"]["Enums"]["contenant_type"]
          created_at?: string
          debut?: string
          duree_min?: number
          id?: string
          prestataire_id?: string
          raison_refus?: string | null
          statut?: Database["public"]["Enums"]["rotation_statut"]
          type_dechet?: Database["public"]["Enums"]["dechet_type"]
          type_operation?: Database["public"]["Enums"]["rotation_operation"]
          updated_at?: string
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rotations_aire_id_fkey"
            columns: ["aire_id"]
            isOneToOne: false
            referencedRelation: "aires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotations_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotations_contenant_id_fkey"
            columns: ["contenant_id"]
            isOneToOne: false
            referencedRelation: "contenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trousseaux: {
        Row: {
          batiment_id: string | null
          bloc_id: string | null
          chantier_id: string
          commentaire: string | null
          created_at: string
          dernier_inventaire: string | null
          emplacement: string | null
          etat: string | null
          gestionnaire_id: string | null
          id: string
          logement_id: string | null
          nb_cles: number
          nb_doubles: number
          niveau_id: string | null
          qr_code: string | null
          reference: string
          statut: Database["public"]["Enums"]["trousseau_statut"]
          type: string | null
          updated_at: string
        }
        Insert: {
          batiment_id?: string | null
          bloc_id?: string | null
          chantier_id: string
          commentaire?: string | null
          created_at?: string
          dernier_inventaire?: string | null
          emplacement?: string | null
          etat?: string | null
          gestionnaire_id?: string | null
          id?: string
          logement_id?: string | null
          nb_cles?: number
          nb_doubles?: number
          niveau_id?: string | null
          qr_code?: string | null
          reference: string
          statut?: Database["public"]["Enums"]["trousseau_statut"]
          type?: string | null
          updated_at?: string
        }
        Update: {
          batiment_id?: string | null
          bloc_id?: string | null
          chantier_id?: string
          commentaire?: string | null
          created_at?: string
          dernier_inventaire?: string | null
          emplacement?: string | null
          etat?: string | null
          gestionnaire_id?: string | null
          id?: string
          logement_id?: string | null
          nb_cles?: number
          nb_doubles?: number
          niveau_id?: string | null
          qr_code?: string | null
          reference?: string
          statut?: Database["public"]["Enums"]["trousseau_statut"]
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trousseaux_batiment_id_fkey"
            columns: ["batiment_id"]
            isOneToOne: false
            referencedRelation: "batiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trousseaux_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "blocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trousseaux_chantier_id_fkey"
            columns: ["chantier_id"]
            isOneToOne: false
            referencedRelation: "chantiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trousseaux_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trousseaux_niveau_id_fkey"
            columns: ["niveau_id"]
            isOneToOne: false
            referencedRelation: "niveaux"
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
      app_role:
        | "admin"
        | "conducteur"
        | "prestataire"
        | "operateur"
        | "gestionnaire_cles"
      contenant_type: "benne" | "bac" | "bigbag"
      dechet_type: "dib" | "gravats" | "tri" | "did"
      demande_acces_statut:
        | "en_attente"
        | "acceptee"
        | "refusee"
        | "terminee"
        | "annulee"
      demande_acces_urgence: "normale" | "prioritaire" | "urgente"
      demande_statut:
        | "en_cours"
        | "acceptee"
        | "refusee"
        | "modifiee"
        | "terminee"
        | "annulee"
      intervention_statut: "en_cours" | "terminee" | "bloquee"
      logement_phase:
        | "opr"
        | "levee_reserves"
        | "pre_livraison"
        | "livraison"
        | "livre"
      logement_sensibilite: "normale" | "sensible" | "tres_sensible"
      logement_statut:
        | "ferme_disponible"
        | "demande_en_attente"
        | "ouverture_en_cours"
        | "intervention_en_cours"
        | "sortie_a_controler"
        | "remise_en_etat"
        | "non_conforme"
        | "bloque"
        | "impossible_securiser"
        | "livre"
        | "acces_interdit"
      mouvement_type:
        | "affectation"
        | "ouverture"
        | "transfert"
        | "restitution"
        | "declaration_perte"
        | "declaration_endommagement"
        | "inventaire"
      rotation_operation: "pose" | "rotation" | "enlevement"
      rotation_statut:
        | "en_cours"
        | "acceptee"
        | "refusee"
        | "terminee"
        | "annulee"
      trousseau_statut:
        | "disponible"
        | "affecte"
        | "en_utilisation"
        | "prete"
        | "en_transfert"
        | "non_restitue"
        | "manquant"
        | "perdu"
        | "casse"
        | "double_commande"
        | "indisponible"
        | "archive"
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
      app_role: [
        "admin",
        "conducteur",
        "prestataire",
        "operateur",
        "gestionnaire_cles",
      ],
      contenant_type: ["benne", "bac", "bigbag"],
      dechet_type: ["dib", "gravats", "tri", "did"],
      demande_acces_statut: [
        "en_attente",
        "acceptee",
        "refusee",
        "terminee",
        "annulee",
      ],
      demande_acces_urgence: ["normale", "prioritaire", "urgente"],
      demande_statut: [
        "en_cours",
        "acceptee",
        "refusee",
        "modifiee",
        "terminee",
        "annulee",
      ],
      intervention_statut: ["en_cours", "terminee", "bloquee"],
      logement_phase: [
        "opr",
        "levee_reserves",
        "pre_livraison",
        "livraison",
        "livre",
      ],
      logement_sensibilite: ["normale", "sensible", "tres_sensible"],
      logement_statut: [
        "ferme_disponible",
        "demande_en_attente",
        "ouverture_en_cours",
        "intervention_en_cours",
        "sortie_a_controler",
        "remise_en_etat",
        "non_conforme",
        "bloque",
        "impossible_securiser",
        "livre",
        "acces_interdit",
      ],
      mouvement_type: [
        "affectation",
        "ouverture",
        "transfert",
        "restitution",
        "declaration_perte",
        "declaration_endommagement",
        "inventaire",
      ],
      rotation_operation: ["pose", "rotation", "enlevement"],
      rotation_statut: [
        "en_cours",
        "acceptee",
        "refusee",
        "terminee",
        "annulee",
      ],
      trousseau_statut: [
        "disponible",
        "affecte",
        "en_utilisation",
        "prete",
        "en_transfert",
        "non_restitue",
        "manquant",
        "perdu",
        "casse",
        "double_commande",
        "indisponible",
        "archive",
      ],
    },
  },
} as const
