import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Group = {
  id: string;
  name: string;
  sport: string;
  default_capacity: number;
  location: string;
  created_by: string;
  invite_code: string;
  pin_hash: string;
  created_at: string;
};

export type Game = {
  id: string;
  group_id: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  status: "upcoming" | "completed" | "cancelled";
  recurring: "weekly" | "biweekly" | null;
  created_at: string;
};

export type Rsvp = {
  id: string;
  game_id: string;
  player_name: string;
  status: "in" | "out" | "maybe";
  waitlist_position: number | null;
  created_at: string;
};
