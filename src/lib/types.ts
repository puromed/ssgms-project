export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'user';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'admin' | 'user';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'user';
          created_at?: string;
        };
      };
      fund_sources: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      grant_years: {
        Row: {
          id: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          year: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          year?: number;
          created_at?: string;
        };
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
        };
        Insert: {
          id?: number;
          project_name: string;
          amount_approved: number;
          status: string;
          year_id: number;
          fund_source_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          project_name?: string;
          amount_approved?: number;
          status?: string;
          year_id?: number;
          fund_source_id?: number;
          created_at?: string;
        };
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
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type FundSource = Database['public']['Tables']['fund_sources']['Row'];
export type GrantYear = Database['public']['Tables']['grant_years']['Row'];
export type Grant = Database['public']['Tables']['grants']['Row'];
export type Disbursement = Database['public']['Tables']['disbursements']['Row'];

export interface GrantWithRelations extends Grant {
  fund_sources?: FundSource;
  grant_years?: GrantYear;
}

export interface DisbursementWithGrant extends Disbursement {
  grants?: Grant;
}
