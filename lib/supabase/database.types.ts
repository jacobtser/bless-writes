export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          slug: string;
          title: string;
          author: string;
          description: string | null;
          cover_url: string | null;
          price_cents: number;
          currency: string;
          stripe_price_id: string;
          file_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          author: string;
          description?: string | null;
          cover_url?: string | null;
          price_cents?: number;
          currency?: string;
          stripe_price_id: string;
          file_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          author?: string;
          description?: string | null;
          cover_url?: string | null;
          price_cents?: number;
          currency?: string;
          stripe_price_id?: string;
          file_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
};