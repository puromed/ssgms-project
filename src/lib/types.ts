export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "user" | "super_admin";
          full_name?: string;
          status?: "active" | "invited";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: "admin" | "user" | "super_admin";
          full_name?: string;
          status?: "active" | "invited";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "user" | "super_admin";
          full_name?: string;
          status?: "active" | "invited";
          created_at?: string;
        };
        Relationships: [];
      };
      fund_sources: {
        Row: {
          id: number;
          source_name: string;
          description?: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          source_name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          source_name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      grant_years: {
        Row: {
          id: number;
          year_value: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          year_value: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          year_value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      grants: {
        Row: {
          id: number;
          project_name: string;
          amount_approved: number;
          status: string;
          year_id: number;
          fund_source_id: number;
          created_at: string;
          user_id?: string | null;
        };
        Insert: {
          id?: number;
          project_name: string;
          amount_approved: number;
          status: string;
          year_id: number;
          fund_source_id: number;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: number;
          project_name?: string;
          amount_approved?: number;
          status?: string;
          year_id?: number;
          fund_source_id?: number;
          created_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grants_fund_source_id_fkey";
            columns: ["fund_source_id"];
            referencedRelation: "fund_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grants_year_id_fkey";
            columns: ["year_id"];
            referencedRelation: "grant_years";
            referencedColumns: ["id"];
          },
        ];
      };
      disbursements: {
        Row: {
          id: number;
          grant_id: number;
          amount: number;
          payment_date: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          grant_id: number;
          amount: number;
          payment_date: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          grant_id?: number;
          amount?: number;
          payment_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disbursements_grant_id_fkey";
            columns: ["grant_id"];
            referencedRelation: "grants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type FundSource = Database["public"]["Tables"]["fund_sources"]["Row"];
export type GrantYear = Database["public"]["Tables"]["grant_years"]["Row"];
export type Grant = Database["public"]["Tables"]["grants"]["Row"];
export type Disbursement = Database["public"]["Tables"]["disbursements"]["Row"];

export interface GrantWithRelations extends Grant {
  fund_sources?: FundSource | null;
  grant_years?: GrantYear | null;
}

export interface DisbursementWithGrant extends Disbursement {
  grants?: Grant | null;
}
