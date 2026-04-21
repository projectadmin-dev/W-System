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
      approval_rules: {
        Row: {
          approver_role: string
          created_at: string | null
          id: string
          is_active: boolean
          margin_max: number
          margin_min: number
          sla_days: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approver_role: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          margin_max: number
          margin_min: number
          sla_days: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approver_role?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          margin_max?: number
          margin_min?: number
          sla_days?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_rules: {
        Row: {
          billing_type: string
          client_tier: string | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          minimum_hours: number | null
          tenant_id: string
          ticket_category: string
          updated_at: string | null
        }
        Insert: {
          billing_type: string
          client_tier?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          minimum_hours?: number | null
          tenant_id: string
          ticket_category: string
          updated_at?: string | null
        }
        Update: {
          billing_type?: string
          client_tier?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          minimum_hours?: number | null
          tenant_id?: string
          ticket_category?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city_id: string | null
          code: string
          country: string | null
          created_at: string | null
          email: string | null
          entity_id: string | null
          id: string
          is_headquarters: boolean | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          settings: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          code: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          is_headquarters?: boolean | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city_id?: string | null
          code?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          is_headquarters?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          currency: string | null
          deleted_at: string | null
          email: string | null
          entity_id: string | null
          id: string
          industry: string | null
          legal_name: string | null
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          province: string | null
          settings: Json | null
          source: string | null
          tags: string[] | null
          tax_id: string | null
          tenant_id: string
          tier: string
          type: string
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          tenant_id: string
          tier?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          entity_id?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          tenant_id?: string
          tier?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coa: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          level: number
          normal_balance: string | null
          parent_account_id: string | null
          tax_code: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          normal_balance?: string | null
          parent_account_id?: string | null
          tax_code?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          normal_balance?: string | null
          parent_account_id?: string | null
          tax_code?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "coa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          id: string
          is_decision_maker: boolean
          is_primary: boolean
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          preferences: Json | null
          tags: string[] | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          tags?: string[] | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          settings: Json | null
          status: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          settings?: Json | null
          status?: string
          tenant_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          settings?: Json | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          close_notes: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          end_date: string
          id: string
          period_name: string
          period_type: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          end_date: string
          id?: string
          period_name: string
          period_type: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          end_date?: string
          id?: string
          period_name?: string
          period_type?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_bpjs_configs: {
        Row: {
          bpjs_kes_number: string | null
          bpjs_tk_number: string | null
          branch_id: string | null
          created_at: string | null
          effective_date: string
          end_date: string | null
          entity_id: string | null
          id: string
          is_default: boolean | null
          jht_company_rate: number
          jht_employee_rate: number
          jkk_rate: number
          jkm_rate: number
          jp_company_rate: number
          jp_employee_rate: number
          jp_salary_cap: number | null
          kes_company_rate: number
          kes_employee_rate: number
          kes_salary_cap: number | null
          tenant_id: string
          umr_override: number | null
          updated_at: string | null
        }
        Insert: {
          bpjs_kes_number?: string | null
          bpjs_tk_number?: string | null
          branch_id?: string | null
          created_at?: string | null
          effective_date?: string
          end_date?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean | null
          jht_company_rate?: number
          jht_employee_rate?: number
          jkk_rate?: number
          jkm_rate?: number
          jp_company_rate?: number
          jp_employee_rate?: number
          jp_salary_cap?: number | null
          kes_company_rate?: number
          kes_employee_rate?: number
          kes_salary_cap?: number | null
          tenant_id: string
          umr_override?: number | null
          updated_at?: string | null
        }
        Update: {
          bpjs_kes_number?: string | null
          bpjs_tk_number?: string | null
          branch_id?: string | null
          created_at?: string | null
          effective_date?: string
          end_date?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean | null
          jht_company_rate?: number
          jht_employee_rate?: number
          jkk_rate?: number
          jkm_rate?: number
          jp_company_rate?: number
          jp_employee_rate?: number
          jp_salary_cap?: number | null
          kes_company_rate?: number
          kes_employee_rate?: number
          kes_salary_cap?: number | null
          tenant_id?: string
          umr_override?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_bpjs_configs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_bpjs_configs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_bpjs_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_city_umr: {
        Row: {
          city_id: string
          created_at: string | null
          effective_date: string
          id: string
          notes: string | null
          source: string | null
          tenant_id: string
          umr_amount: number
          updated_at: string | null
          year: number
        }
        Insert: {
          city_id: string
          created_at?: string | null
          effective_date: string
          id?: string
          notes?: string | null
          source?: string | null
          tenant_id: string
          umr_amount: number
          updated_at?: string | null
          year: number
        }
        Update: {
          city_id?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          notes?: string | null
          source?: string | null
          tenant_id?: string
          umr_amount?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_city_umr_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_city_umr_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          branch_id: string | null
          code: string
          cost_center_code: string | null
          created_at: string | null
          description: string | null
          email: string | null
          entity_id: string
          head_user_id: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          cost_center_code?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          entity_id: string
          head_user_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          cost_center_code?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          entity_id?: string
          head_user_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_departments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_grades: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          id: string
          is_bonus_eligible: boolean | null
          is_car_allowance_eligible: boolean | null
          is_overtime_eligible: boolean | null
          leave_quota: number | null
          level: number
          name: string
          salary_max: number
          salary_mid: number | null
          salary_min: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_bonus_eligible?: boolean | null
          is_car_allowance_eligible?: boolean | null
          is_overtime_eligible?: boolean | null
          leave_quota?: number | null
          level: number
          name: string
          salary_max: number
          salary_mid?: number | null
          salary_min: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_bonus_eligible?: boolean | null
          is_car_allowance_eligible?: boolean | null
          is_overtime_eligible?: boolean | null
          leave_quota?: number | null
          level?: number
          name?: string
          salary_max?: number
          salary_mid?: number | null
          salary_min?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_grades_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_overtime_rules: {
        Row: {
          approval_level: string | null
          code: string
          created_at: string | null
          day_type: string
          description: string | null
          effective_date: string
          end_date: string | null
          end_hour: number | null
          entity_id: string | null
          first_hour_multiplier: number | null
          id: string
          is_active: boolean | null
          max_hours_per_day: number | null
          max_hours_per_month: number | null
          name: string
          requires_approval: boolean | null
          start_hour: number | null
          subsequent_hour_multiplier: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approval_level?: string | null
          code: string
          created_at?: string | null
          day_type: string
          description?: string | null
          effective_date?: string
          end_date?: string | null
          end_hour?: number | null
          entity_id?: string | null
          first_hour_multiplier?: number | null
          id?: string
          is_active?: boolean | null
          max_hours_per_day?: number | null
          max_hours_per_month?: number | null
          name: string
          requires_approval?: boolean | null
          start_hour?: number | null
          subsequent_hour_multiplier?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approval_level?: string | null
          code?: string
          created_at?: string | null
          day_type?: string
          description?: string | null
          effective_date?: string
          end_date?: string | null
          end_hour?: number | null
          entity_id?: string | null
          first_hour_multiplier?: number | null
          id?: string
          is_active?: boolean | null
          max_hours_per_day?: number | null
          max_hours_per_month?: number | null
          name?: string
          requires_approval?: boolean | null
          start_hour?: number | null
          subsequent_hour_multiplier?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_overtime_rules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_overtime_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_positions: {
        Row: {
          code: string
          created_at: string | null
          department_id: string | null
          entity_id: string
          grade_id: string | null
          headcount_current: number | null
          headcount_planned: number | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          is_vacant: boolean | null
          job_description: string | null
          name: string
          reports_to_id: string | null
          requirements: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department_id?: string | null
          entity_id: string
          grade_id?: string | null
          headcount_current?: number | null
          headcount_planned?: number | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_vacant?: boolean | null
          job_description?: string | null
          name: string
          reports_to_id?: string | null
          requirements?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department_id?: string | null
          entity_id?: string
          grade_id?: string | null
          headcount_current?: number | null
          headcount_planned?: number | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_vacant?: boolean | null
          job_description?: string | null
          name?: string
          reports_to_id?: string | null
          requirements?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_positions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_positions_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "hr_job_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_positions_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "hr_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_pph21_configs: {
        Row: {
          created_at: string | null
          id: string
          jabatan_max_annual: number
          jabatan_max_monthly: number
          jabatan_rate: number
          non_npwp_surcharge: number
          pph21_brackets: Json
          ptkp_k0: number
          ptkp_k1: number
          ptkp_k2: number
          ptkp_k3: number
          ptkp_tk0: number
          ptkp_tk1: number
          ptkp_tk2: number
          ptkp_tk3: number
          tax_year: number
          tenant_id: string
          ter_brackets: Json | null
          updated_at: string | null
          use_ter_method: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jabatan_max_annual?: number
          jabatan_max_monthly?: number
          jabatan_rate?: number
          non_npwp_surcharge?: number
          pph21_brackets?: Json
          ptkp_k0?: number
          ptkp_k1?: number
          ptkp_k2?: number
          ptkp_k3?: number
          ptkp_tk0?: number
          ptkp_tk1?: number
          ptkp_tk2?: number
          ptkp_tk3?: number
          tax_year: number
          tenant_id: string
          ter_brackets?: Json | null
          updated_at?: string | null
          use_ter_method?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jabatan_max_annual?: number
          jabatan_max_monthly?: number
          jabatan_rate?: number
          non_npwp_surcharge?: number
          pph21_brackets?: Json
          ptkp_k0?: number
          ptkp_k1?: number
          ptkp_k2?: number
          ptkp_k3?: number
          ptkp_tk0?: number
          ptkp_tk1?: number
          ptkp_tk2?: number
          ptkp_tk3?: number
          tax_year?: number
          tenant_id?: string
          ter_brackets?: Json | null
          updated_at?: string | null
          use_ter_method?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_pph21_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_components: {
        Row: {
          amount_type: string
          category: string
          code: string
          component_type: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          display_order: number | null
          entity_id: string | null
          fixed_amount: number | null
          formula: string | null
          id: string
          is_bpjs_base: boolean | null
          is_fixed: boolean | null
          is_taxable: boolean | null
          name: string
          percentage: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount_type?: string
          category: string
          code: string
          component_type: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          display_order?: number | null
          entity_id?: string | null
          fixed_amount?: number | null
          formula?: string | null
          id?: string
          is_bpjs_base?: boolean | null
          is_fixed?: boolean | null
          is_taxable?: boolean | null
          name: string
          percentage?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount_type?: string
          category?: string
          code?: string
          component_type?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          display_order?: number | null
          entity_id?: string | null
          fixed_amount?: number | null
          formula?: string | null
          id?: string
          is_bpjs_base?: boolean | null
          is_fixed?: boolean | null
          is_taxable?: boolean | null
          name?: string
          percentage?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_components_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_matrix: {
        Row: {
          amount: number
          created_at: string | null
          effective_date: string
          end_date: string | null
          entity_id: string | null
          grade_id: string
          id: string
          notes: string | null
          step: number
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          effective_date: string
          end_date?: string | null
          entity_id?: string | null
          grade_id: string
          id?: string
          notes?: string | null
          step: number
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          effective_date?: string
          end_date?: string | null
          entity_id?: string | null
          grade_id?: string
          id?: string
          notes?: string | null
          step?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_matrix_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_matrix_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "hr_job_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_matrix_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_areas: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          area_type: string
          branch_id: string | null
          city_id: string | null
          code: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          entity_id: string
          id: string
          is_active: boolean | null
          name: string
          postal_code: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          area_type: string
          branch_id?: string | null
          city_id?: string | null
          code: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_id: string
          id?: string
          is_active?: boolean | null
          name: string
          postal_code?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          area_type?: string
          branch_id?: string | null
          city_id?: string | null
          code?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          postal_code?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_areas_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_areas_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_calendars: {
        Row: {
          branch_id: string | null
          created_at: string | null
          date: string
          description: string | null
          entity_id: string | null
          id: string
          is_default: boolean | null
          is_paid: boolean | null
          name: string
          tenant_id: string
          type: string
          year: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean | null
          is_paid?: boolean | null
          name: string
          tenant_id: string
          type?: string
          year: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          is_default?: boolean | null
          is_paid?: boolean | null
          name?: string
          tenant_id?: string
          type?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_calendars_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_calendars_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_calendars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_shifts: {
        Row: {
          branch_id: string | null
          break_duration_minutes: number | null
          break_end: string | null
          break_start: string | null
          code: string
          created_at: string | null
          end_time: string
          entity_id: string | null
          grace_period_minutes: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          break_duration_minutes?: number | null
          break_end?: string | null
          break_start?: string | null
          code: string
          created_at?: string | null
          end_time: string
          entity_id?: string | null
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          break_duration_minutes?: number | null
          break_end?: string | null
          break_start?: string | null
          code?: string
          created_at?: string | null
          end_time?: string
          entity_id?: string | null
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_shifts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          aging_days: number | null
          amount_due: number
          amount_paid: number | null
          billing_address: string | null
          client_id: string
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          discount_amount: number | null
          due_date: string
          entity_id: string | null
          id: string
          invoice_number: string
          issue_date: string
          issued_by: string
          last_payment_at: string | null
          line_items: Json
          notes: string | null
          payment_terms_days: number | null
          project_id: string | null
          quotation_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          ticket_id: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aging_days?: number | null
          amount_due?: number
          amount_paid?: number | null
          billing_address?: string | null
          client_id: string
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          discount_amount?: number | null
          due_date: string
          entity_id?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          issued_by: string
          last_payment_at?: string | null
          line_items: Json
          notes?: string | null
          payment_terms_days?: number | null
          project_id?: string | null
          quotation_id?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          ticket_id?: string | null
          total_amount: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aging_days?: number | null
          amount_due?: number
          amount_paid?: number | null
          billing_address?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          discount_amount?: number | null
          due_date?: string
          entity_id?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          issued_by?: string
          last_payment_at?: string | null
          line_items?: Json
          notes?: string | null
          payment_terms_days?: number | null
          project_id?: string | null
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          ticket_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          description: string
          entry_number: string
          exchange_rate: number | null
          fiscal_period_id: string | null
          id: string
          is_reversal: boolean
          posted_by: string | null
          posting_date: string
          prepared_by: string
          reference_number: string | null
          reversal_of_id: string | null
          reversal_reason: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tenant_id: string
          transaction_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          description: string
          entry_number: string
          exchange_rate?: number | null
          fiscal_period_id?: string | null
          id?: string
          is_reversal?: boolean
          posted_by?: string | null
          posting_date?: string
          prepared_by: string
          reference_number?: string | null
          reversal_of_id?: string | null
          reversal_reason?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id: string
          transaction_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          description?: string
          entry_number?: string
          exchange_rate?: number | null
          fiscal_period_id?: string | null
          id?: string
          is_reversal?: boolean
          posted_by?: string | null
          posting_date?: string
          prepared_by?: string
          reference_number?: string | null
          reversal_of_id?: string | null
          reversal_reason?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          client_id: string | null
          coa_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string
          credit_amount: number
          credit_amount_base: number
          currency: string
          debit_amount: number
          debit_amount_base: number
          deleted_at: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string
          line_description: string | null
          line_number: number
          project_id: string | null
          tax_amount: number | null
          tax_code: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          coa_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          credit_amount?: number
          credit_amount_base?: number
          currency?: string
          debit_amount?: number
          debit_amount_base?: number
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id: string
          line_description?: string | null
          line_number: number
          project_id?: string | null
          tax_amount?: number | null
          tax_code?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          coa_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          credit_amount?: number
          credit_amount_base?: number
          currency?: string
          debit_amount?: number
          debit_amount_base?: number
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string
          line_description?: string | null
          line_number?: number
          project_id?: string | null
          tax_amount?: number | null
          tax_code?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_coa_id_fkey"
            columns: ["coa_id"]
            isOneToOne: false
            referencedRelation: "coa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          channel: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string
          next_step: string | null
          next_step_due_at: string | null
          outcome: string | null
          performed_by: string
          recorded_at: string
          subject: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          channel?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id: string
          next_step?: string | null
          next_step_due_at?: string | null
          outcome?: string | null
          performed_by: string
          recorded_at?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          channel?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string
          next_step?: string | null
          next_step_due_at?: string | null
          outcome?: string | null
          performed_by?: string
          recorded_at?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          authority_level: string | null
          budget_disclosed: string | null
          client_id: string | null
          commercial_pic_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          current_pic_id: string
          custom_fields: Json | null
          deleted_at: string | null
          engagement_score: number | null
          entity_id: string | null
          event_id: string | null
          id: string
          job_title: string | null
          last_activity_at: string | null
          marketing_pic_id: string | null
          name: string
          need_definition: number | null
          notes: string | null
          previous_stage: string | null
          referring_client_id: string | null
          score_calculated_at: string | null
          sla_breached: boolean
          sla_breached_at: string | null
          sla_deadline_at: string | null
          source: string
          stage: string
          stage_entered_at: string
          tags: string[] | null
          tenant_id: string
          timeline: string | null
          total_score: number | null
          updated_at: string
          updated_by: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          authority_level?: string | null
          budget_disclosed?: string | null
          client_id?: string | null
          commercial_pic_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          current_pic_id: string
          custom_fields?: Json | null
          deleted_at?: string | null
          engagement_score?: number | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          marketing_pic_id?: string | null
          name: string
          need_definition?: number | null
          notes?: string | null
          previous_stage?: string | null
          referring_client_id?: string | null
          score_calculated_at?: string | null
          sla_breached?: boolean
          sla_breached_at?: string | null
          sla_deadline_at?: string | null
          source: string
          stage?: string
          stage_entered_at?: string
          tags?: string[] | null
          tenant_id: string
          timeline?: string | null
          total_score?: number | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          authority_level?: string | null
          budget_disclosed?: string | null
          client_id?: string | null
          commercial_pic_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          current_pic_id?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          engagement_score?: number | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          marketing_pic_id?: string | null
          name?: string
          need_definition?: number | null
          notes?: string | null
          previous_stage?: string | null
          referring_client_id?: string | null
          score_calculated_at?: string | null
          sla_breached?: boolean
          sla_breached_at?: string | null
          sla_deadline_at?: string | null
          source?: string
          stage?: string
          stage_entered_at?: string
          tags?: string[] | null
          tenant_id?: string
          timeline?: string | null
          total_score?: number | null
          updated_at?: string
          updated_by?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_commercial_pic_id_fkey"
            columns: ["commercial_pic_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_current_pic_id_fkey"
            columns: ["current_pic_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_marketing_pic_id_fkey"
            columns: ["marketing_pic_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referring_client_id_fkey"
            columns: ["referring_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_accounts: {
        Row: {
          access_token_enc: string | null
          created_at: string | null
          id: string
          provider: string
          provider_user_id: string
          refresh_token_enc: string | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          created_at?: string | null
          id?: string
          provider: string
          provider_user_id: string
          refresh_token_enc?: string | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          provider_user_id?: string
          refresh_token_enc?: string | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bank_account: string | null
          check_number: string | null
          client_id: string
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          exchange_rate: number | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          received_by: string
          reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reference_number: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          check_number?: string | null
          client_id: string
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_number: string
          received_by: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          check_number?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          received_by?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_rules: {
        Row: {
          category: string
          client_tier: string
          created_at: string | null
          id: string
          impact: string
          is_active: boolean
          priority_result: string
          sla_resolution_hours: number
          sla_response_hours: number
          tenant_id: string
          updated_at: string | null
          urgency: string
        }
        Insert: {
          category: string
          client_tier: string
          created_at?: string | null
          id?: string
          impact: string
          is_active?: boolean
          priority_result: string
          sla_resolution_hours: number
          sla_response_hours: number
          tenant_id: string
          updated_at?: string | null
          urgency: string
        }
        Update: {
          category?: string
          client_tier?: string
          created_at?: string | null
          id?: string
          impact?: string
          is_active?: boolean
          priority_result?: string
          sla_resolution_hours?: number
          sla_response_hours?: number
          tenant_id?: string
          updated_at?: string | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_briefs: {
        Row: {
          approval_tier: string | null
          approved_at: string | null
          approved_by: string | null
          assumptions: string[] | null
          client_id: string
          commercial_pic_id: string
          created_at: string
          created_by: string
          credit_check_data: Json | null
          credit_check_performed_at: string | null
          credit_check_status: string | null
          currency: string
          current_approver_id: string | null
          deleted_at: string | null
          deliverables: string[] | null
          entity_id: string | null
          estimated_cost: number
          estimated_margin: number | null
          estimated_margin_pct: number | null
          estimated_revenue: number
          exclusions: string[] | null
          executive_summary: string
          id: string
          lead_id: string | null
          rejection_reason: string | null
          scope_of_work: string
          sla_breached: boolean
          sla_deadline_at: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_tier?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: string[] | null
          client_id: string
          commercial_pic_id: string
          created_at?: string
          created_by: string
          credit_check_data?: Json | null
          credit_check_performed_at?: string | null
          credit_check_status?: string | null
          currency?: string
          current_approver_id?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          entity_id?: string | null
          estimated_cost: number
          estimated_margin?: number | null
          estimated_margin_pct?: number | null
          estimated_revenue: number
          exclusions?: string[] | null
          executive_summary: string
          id?: string
          lead_id?: string | null
          rejection_reason?: string | null
          scope_of_work: string
          sla_breached?: boolean
          sla_deadline_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_tier?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: string[] | null
          client_id?: string
          commercial_pic_id?: string
          created_at?: string
          created_by?: string
          credit_check_data?: Json | null
          credit_check_performed_at?: string | null
          credit_check_status?: string | null
          currency?: string
          current_approver_id?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          entity_id?: string | null
          estimated_cost?: number
          estimated_margin?: number | null
          estimated_margin_pct?: number | null
          estimated_revenue?: number
          exclusions?: string[] | null
          executive_summary?: string
          id?: string
          lead_id?: string | null
          rejection_reason?: string | null
          scope_of_work?: string
          sla_breached?: boolean
          sla_deadline_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_commercial_pic_id_fkey"
            columns: ["commercial_pic_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_amount: number | null
          client_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          deleted_at: string | null
          end_date: string | null
          entity_id: string | null
          id: string
          project_code: string
          project_manager: string | null
          project_name: string
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          deleted_at?: string | null
          end_date?: string | null
          entity_id?: string | null
          id?: string
          project_code: string
          project_manager?: string | null
          project_name: string
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          deleted_at?: string | null
          end_date?: string | null
          entity_id?: string | null
          id?: string
          project_code?: string
          project_manager?: string | null
          project_name?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_fkey"
            columns: ["project_manager"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          coa_id: string | null
          created_at: string | null
          description: string
          id: string
          line_number: number
          quantity: number
          quotation_id: string
          total: number
          unit_price: number
        }
        Insert: {
          coa_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          line_number: number
          quantity: number
          quotation_id: string
          total: number
          unit_price: number
        }
        Update: {
          coa_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          line_number?: number
          quantity?: number
          quotation_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          discount_amount: number | null
          entity_id: string | null
          id: string
          issue_date: string
          notes: string | null
          payment_terms_days: number | null
          prepared_by: string
          project_id: string | null
          quotation_number: string
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          terms_conditions: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          discount_amount?: number | null
          entity_id?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          payment_terms_days?: number | null
          prepared_by: string
          project_id?: string | null
          quotation_number: string
          status?: string
          subtotal: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          terms_conditions?: string | null
          total_amount: number
          updated_at?: string
          updated_by?: string | null
          valid_until: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          discount_amount?: number | null
          entity_id?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          payment_terms_days?: number | null
          prepared_by?: string
          project_id?: string | null
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          terms_conditions?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          type: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          component: string
          created_at: string | null
          id: string
          is_active: boolean
          rules: Json
          tenant_id: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          component: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          rules: Json
          tenant_id: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          component?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          rules?: Json
          tenant_id?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string | null
          duration_hours: number
          escalation_role: string | null
          id: string
          is_active: boolean
          stage_from: string
          stage_to: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_hours: number
          escalation_role?: string | null
          id?: string
          is_active?: boolean
          stage_from: string
          stage_to: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_hours?: number
          escalation_role?: string | null
          id?: string
          is_active?: boolean
          stage_from?: string
          stage_to?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          legal_name: string | null
          name: string
          plan: string
          settings: Json | null
          slug: string
          status: string
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name: string
          plan?: string
          settings?: Json | null
          slug: string
          status?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          plan?: string
          settings?: Json | null
          slug?: string
          status?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_time_logs: {
        Row: {
          activity_type: string
          billable: boolean | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          ended_at: string | null
          id: string
          started_at: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          billable?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          ended_at?: string | null
          id?: string
          started_at?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          billable?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          started_at?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_time_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          billable: boolean | null
          billing_type: string | null
          category: string
          category_auto: boolean | null
          channel: string
          channel_reference: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string
          entity_id: string | null
          estimated_hours: number | null
          first_response_at: string | null
          id: string
          impact: string | null
          priority: string
          priority_auto: boolean | null
          priority_score: number | null
          project_id: string | null
          quotation_id: string | null
          resolved_at: string | null
          sla_breached: boolean | null
          sla_resolution_hours: number | null
          sla_response_hours: number | null
          status: string
          subject: string
          submitted_by: string | null
          tenant_id: string
          ticket_number: string
          updated_at: string
          updated_by: string | null
          urgency: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          billable?: boolean | null
          billing_type?: string | null
          category: string
          category_auto?: boolean | null
          channel: string
          channel_reference?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description: string
          entity_id?: string | null
          estimated_hours?: number | null
          first_response_at?: string | null
          id?: string
          impact?: string | null
          priority: string
          priority_auto?: boolean | null
          priority_score?: number | null
          project_id?: string | null
          quotation_id?: string | null
          resolved_at?: string | null
          sla_breached?: boolean | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          status?: string
          subject: string
          submitted_by?: string | null
          tenant_id: string
          ticket_number: string
          updated_at?: string
          updated_by?: string | null
          urgency?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          billable?: boolean | null
          billing_type?: string | null
          category?: string
          category_auto?: boolean | null
          channel?: string
          channel_reference?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string
          entity_id?: string | null
          estimated_hours?: number | null
          first_response_at?: string | null
          id?: string
          impact?: string | null
          priority?: string
          priority_auto?: boolean | null
          priority_score?: number | null
          project_id?: string | null
          quotation_id?: string | null
          resolved_at?: string | null
          sla_breached?: boolean | null
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          status?: string
          subject?: string
          submitted_by?: string | null
          tenant_id?: string
          ticket_number?: string
          updated_at?: string
          updated_by?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number | null
          bpjs_kesehatan: string | null
          bpjs_ketenagakerjaan: string | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          department: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_number: string | null
          employment_status: string | null
          entity_id: string | null
          full_name: string
          grade_id: string | null
          id: string
          is_active: boolean
          join_date: string | null
          language: string | null
          last_login_at: string | null
          nik: string | null
          npwp: string | null
          phone: string | null
          position_id: string | null
          postal_code: string | null
          preferences: Json | null
          province: string | null
          resignation_date: string | null
          role_id: string
          tenant_id: string
          termination_reason: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          bpjs_kesehatan?: string | null
          bpjs_ketenagakerjaan?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_number?: string | null
          employment_status?: string | null
          entity_id?: string | null
          full_name: string
          grade_id?: string | null
          id: string
          is_active?: boolean
          join_date?: string | null
          language?: string | null
          last_login_at?: string | null
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          position_id?: string | null
          postal_code?: string | null
          preferences?: Json | null
          province?: string | null
          resignation_date?: string | null
          role_id: string
          tenant_id: string
          termination_reason?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          bpjs_kesehatan?: string | null
          bpjs_ketenagakerjaan?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_number?: string | null
          employment_status?: string | null
          entity_id?: string | null
          full_name?: string
          grade_id?: string | null
          id?: string
          is_active?: boolean
          join_date?: string | null
          language?: string | null
          last_login_at?: string | null
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          position_id?: string | null
          postal_code?: string | null
          preferences?: Json | null
          province?: string | null
          resignation_date?: string | null
          role_id?: string
          tenant_id?: string
          termination_reason?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "hr_job_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "hr_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_lead_score: { Args: { lead_id: string }; Returns: number }
      check_client_credit: {
        Args: { p_client_id: string }
        Returns: {
          ar_aging_days: number
          message: string
          status: string
        }[]
      }
      get_approval_tier: {
        Args: { margin_pct: number; tenant_id: string }
        Returns: {
          approver_role: string
          sla_days: number
        }[]
      }
      get_current_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_roles: {
        Args: never
        Returns: {
          role_name: string
        }[]
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
      user_has_role: { Args: { required_role: string }; Returns: boolean }
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
