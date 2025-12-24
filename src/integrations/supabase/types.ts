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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          delivery_fee: number | null
          description: string | null
          email: string | null
          id: string
          is_open: boolean | null
          logo_url: string | null
          max_delivery_radius_km: number | null
          min_order_value: number | null
          monthly_order_count: number | null
          name: string
          opening_hours: Json | null
          order_count_reset_date: string | null
          owner_id: string
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["company_status"]
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          max_delivery_radius_km?: number | null
          min_order_value?: number | null
          monthly_order_count?: number | null
          name: string
          opening_hours?: Json | null
          order_count_reset_date?: string | null
          owner_id: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          max_delivery_radius_km?: number | null
          min_order_value?: number | null
          monthly_order_count?: number | null
          name?: string
          opening_hours?: Json | null
          order_count_reset_date?: string | null
          owner_id?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          company_id: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string
          number: string
          reference: string | null
          session_id: string | null
          state: string
          street: string
          user_id: string | null
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood: string
          number: string
          reference?: string | null
          session_id?: string | null
          state: string
          street: string
          user_id?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string
          number?: string
          reference?: string | null
          session_id?: string | null
          state?: string
          street?: string
          user_id?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          company_id: string
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          driver_name: string | null
          driver_phone: string | null
          driver_status: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          license_plate: string | null
          location_updated_at: string | null
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_status?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          license_plate?: string | null
          location_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_status?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          license_plate?: string | null
          location_updated_at?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          options: Json | null
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          options?: Json | null
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          options?: Json | null
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          change_for: number | null
          company_id: string
          coupon_id: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_driver_id: string | null
          delivery_fee: number
          discount_amount: number | null
          estimated_delivery_time: string | null
          id: string
          needs_change: boolean | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          change_for?: number | null
          company_id: string
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_driver_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          estimated_delivery_time?: string | null
          id?: string
          needs_change?: boolean | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          change_for?: number | null
          company_id?: string
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_driver_id?: string | null
          delivery_fee?: number
          discount_amount?: number | null
          estimated_delivery_time?: string | null
          id?: string
          needs_change?: boolean | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_driver_id_fkey"
            columns: ["delivery_driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          max_selections: number | null
          min_selections: number | null
          name: string
          product_id: string
          selection_type: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name: string
          product_id: string
          selection_type?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          product_id?: string
          selection_type?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          is_available: boolean | null
          is_required: boolean | null
          max_selections: number | null
          name: string
          price_modifier: number | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_available?: boolean | null
          is_required?: boolean | null
          max_selections?: number | null
          name: string
          price_modifier?: number | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_available?: boolean | null
          is_required?: boolean | null
          max_selections?: number | null
          name?: string
          price_modifier?: number | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          preparation_time_minutes: number | null
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          preparation_time_minutes?: number | null
          price: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          preparation_time_minutes?: number | null
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          product_id: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          company_id: string | null
          created_at: string
          endpoint: string
          id: string
          order_id: string | null
          p256dh: string
          updated_at: string
          user_id: string | null
          user_type: string
        }
        Insert: {
          auth: string
          company_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          order_id?: string | null
          p256dh: string
          updated_at?: string
          user_id?: string | null
          user_type?: string
        }
        Update: {
          auth?: string
          company_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          order_id?: string | null
          p256dh?: string
          updated_at?: string
          user_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_driver_for_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "store_owner" | "delivery_driver"
      company_status: "pending" | "approved" | "suspended"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "awaiting_driver"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "online" | "cash" | "card_on_delivery" | "pix"
      payment_status: "pending" | "paid" | "failed" | "refunded"
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
      app_role: ["super_admin", "store_owner", "delivery_driver"],
      company_status: ["pending", "approved", "suspended"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "awaiting_driver",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["online", "cash", "card_on_delivery", "pix"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
