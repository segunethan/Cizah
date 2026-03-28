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
      user_profiles: {
        Row: {
          id: string; name: string; email: string | null; phone: string | null
          surname: string | null; first_name: string | null; other_name: string | null
          preferred_name: string | null; prefix: string | null; date_of_birth: string | null
          gender: string | null; house_address: string | null; office_address: string | null
          state: string | null; lga: string | null; lcda: string | null
          occupation: string | null; identity_type: string | null; identity_number: string | null
          lassra_no: string | null; passport_photo_url: string | null; tax_record_number: string | null
          num_banks: number | null; banks_list: string[] | null; num_cars: number | null; num_houses: number | null
          apartment_style: string | null; apartment_type: string | null; rent_amount: number | null
          rent_agreement_url: string | null; rent_receipt_url: string | null; has_mortgage: boolean | null
          selected_reliefs: string[] | null; tax_period_preference: string
          onboarding_completed: boolean; bank_accounts_connected: boolean
          created_at: string; updated_at: string
        }
        Insert: { id: string; name?: string; email?: string | null; phone?: string | null
          surname?: string | null; first_name?: string | null; other_name?: string | null
          occupation?: string | null; identity_type?: string | null; identity_number?: string | null
          apartment_style?: string | null; num_banks?: number | null; selected_reliefs?: string[] | null
          tax_period_preference?: string; onboarding_completed?: boolean; bank_accounts_connected?: boolean
          [key: string]: unknown
        }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      financial_records: {
        Row: {
          id: string; user_id: string; type: string; category: string; amount: number
          description: string | null; date: string; evidence_url: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; type: string; category: string; amount: number
          description?: string | null; date: string; evidence_url?: string | null
        }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          id: string; user_id: string; period_type: string; period_month: number | null
          period_year: number; total_inflow: number; total_outflow: number; net_inflow: number
          voluntary_gift: number; other_expenses: number; assessable_income: number
          total_reliefs: number; chargeable_income: number; tax_payable: number
          status: string; rejection_reason: string | null; rejection_evidence_url: string | null
          user_rejection_reason: string | null; payment_reference: string | null
          payment_date: string | null; filed_at: string | null; filed_by: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; period_type: string; period_month?: number | null
          period_year: number; total_inflow?: number; total_outflow?: number; net_inflow?: number
          voluntary_gift?: number; other_expenses?: number; assessable_income?: number
          total_reliefs?: number; chargeable_income?: number; tax_payable?: number; status?: string
          [key: string]: unknown
        }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      connected_bank_accounts: {
        Row: {
          id: string; user_id: string; bank_name: string; account_number: string | null
          account_type: string | null; is_selected: boolean; connected_at: string
          created_at: string; updated_at: string
        }
        Insert: { id?: string; user_id: string; bank_name: string; is_selected?: boolean; [key: string]: unknown }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      statement_parse_jobs: {
        Row: {
          id: string; user_id: string; file_name: string; file_url: string | null
          status: string; result: Json | null; error: string | null
          period_month: number | null; period_year: number | null
          created_at: string; updated_at: string
        }
        Insert: { id?: string; user_id: string; file_name: string; [key: string]: unknown }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      admin_users: {
        Row: { id: string; username: string; name: string | null; password_hash: string; created_at: string; updated_at: string }
        Insert: { id?: string; username: string; name?: string | null; password_hash: string }
        Update: { [key: string]: unknown }
        Relationships: []
      }
      admin_sessions: {
        Row: { id: string; admin_id: string; expires_at: string; last_used_at: string; ip_address: string | null; user_agent: string | null; revoked: boolean | null; created_at: string }
        Insert: { id?: string; admin_id: string; expires_at: string; [key: string]: unknown }
        Update: { [key: string]: unknown }
        Relationships: []
      }
    }
    Views: {
      admin_users_safe: {
        Row: { id: string | null; username: string | null; name: string | null; created_at: string | null; updated_at: string | null }
        Relationships: []
      }
    }
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
