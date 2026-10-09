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
      companies: {
        Row: {
          id: string;
          organization_number: string;
          company_name: string;
          legal_form: string | null;
          status: string | null;
          registration_date: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          country: string;
          website: string | null;
          industry: string | null;
          business_description: string | null;
          employee_count: number | null;
          created_at: string;
          updated_at: string;
          last_verified_at: string | null;
        };
        Insert: {
          id?: string;
          organization_number: string;
          company_name: string;
          legal_form?: string | null;
          status?: string | null;
          registration_date?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string;
          website?: string | null;
          industry?: string | null;
          business_description?: string | null;
          employee_count?: number | null;
          created_at?: string;
          updated_at?: string;
          last_verified_at?: string | null;
        };
        Update: {
          id?: string;
          organization_number?: string;
          company_name?: string;
          legal_form?: string | null;
          status?: string | null;
          registration_date?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string;
          website?: string | null;
          industry?: string | null;
          business_description?: string | null;
          employee_count?: number | null;
          created_at?: string;
          updated_at?: string;
          last_verified_at?: string | null;
        };
        Relationships: [];
      };
      company_facts: {
        Row: {
          id: string;
          company_id: string;
          fact_type: string;
          fact_name: string;
          fact_value: string;
          confidence: number;
          verification_status: string;
          evidence: string | null;
          source_id: string | null;
          source_date: string | null;
          first_seen: string | null;
          last_verified: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          fact_type: string;
          fact_name: string;
          fact_value: string;
          confidence: number;
          verification_status?: string;
          evidence?: string | null;
          source_id?: string | null;
          source_date?: string | null;
          first_seen?: string | null;
          last_verified?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          fact_type?: string;
          fact_name?: string;
          fact_value?: string;
          confidence?: number;
          verification_status?: string;
          evidence?: string | null;
          source_id?: string | null;
          source_date?: string | null;
          first_seen?: string | null;
          last_verified?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_facts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      sources: {
        Row: {
          id: string;
          company_id: string;
          source_url: string;
          source_title: string;
          source_type: string;
          domain: string;
          publication_date: string | null;
          retrieved_at: string;
          verification_status: string;
          company_match_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          source_url: string;
          source_title: string;
          source_type: string;
          domain: string;
          publication_date?: string | null;
          retrieved_at?: string;
          verification_status?: string;
          company_match_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          source_url?: string;
          source_title?: string;
          source_type?: string;
          domain?: string;
          publication_date?: string | null;
          retrieved_at?: string;
          verification_status?: string;
          company_match_score?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      financial_data: {
        Row: {
          id: string;
          company_id: string;
          financial_year: number;
          revenue: number | null;
          profit: number | null;
          currency: string;
          source_id: string | null;
          source_date: string | null;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          financial_year: number;
          revenue?: number | null;
          profit?: number | null;
          currency?: string;
          source_id?: string | null;
          source_date?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          financial_year?: number;
          revenue?: number | null;
          profit?: number | null;
          currency?: string;
          source_id?: string | null;
          source_date?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_data_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      research_history: {
        Row: {
          id: string;
          company_id: string;
          research_date: string;
          facts_found: number;
          facts_verified: number;
          sources_checked: number;
          sources_rejected: number;
          estimated_cost: number;
          processing_time: number;
          changes_detected: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          research_date?: string;
          facts_found?: number;
          facts_verified?: number;
          sources_checked?: number;
          sources_rejected?: number;
          estimated_cost?: number;
          processing_time?: number;
          changes_detected?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          research_date?: string;
          facts_found?: number;
          facts_verified?: number;
          sources_checked?: number;
          sources_rejected?: number;
          estimated_cost?: number;
          processing_time?: number;
          changes_detected?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_history_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      bulk_research_jobs: {
        Row: {
          id: string;
          status: string;
          total_companies: number;
          processed_companies: number;
          successful_count: number;
          failed_count: number;
          verified_count: number;
          rejected_count: number;
          outbound_requests_count: number;
          cost_usd: number;
          started_at: string | null;
          completed_at: string | null;
          error_log: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          status?: string;
          total_companies?: number;
          processed_companies?: number;
          successful_count?: number;
          failed_count?: number;
          verified_count?: number;
          rejected_count?: number;
          outbound_requests_count?: number;
          cost_usd?: number;
          started_at?: string | null;
          completed_at?: string | null;
          error_log?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: string;
          total_companies?: number;
          processed_companies?: number;
          successful_count?: number;
          failed_count?: number;
          verified_count?: number;
          rejected_count?: number;
          outbound_requests_count?: number;
          cost_usd?: number;
          started_at?: string | null;
          completed_at?: string | null;
          error_log?: Json;
          created_at?: string;
        };
        Relationships: [];
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
