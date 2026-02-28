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
  player_phone: string | null;
  status: "in" | "out" | "maybe";
  guests: number;
  waitlist_position: number | null;
  created_at: string;
};

export type Player = {
  id: string;
  phone: string;
  name: string;
  group_id: string;
  created_at: string;
};

export type Reminder = {
  id: string;
  game_id: string;
  reminder_type: "24h" | "2h";
  sent_at: string;
};
