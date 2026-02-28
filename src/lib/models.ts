import mongoose, { Schema, Document, Model } from "mongoose";

// --- Group ---
export interface IGroup extends Document {
  name: string;
  sport: string;
  defaultCapacity: number;
  location: string;
  inviteCode: string;
  adminPin: string;
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>({
  name: { type: String, required: true },
  sport: { type: String, required: true },
  defaultCapacity: { type: Number, required: true, default: 10 },
  location: { type: String, default: "" },
  inviteCode: { type: String, required: true, unique: true },
  adminPin: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- Game ---
export interface IGame extends Document {
  groupId: mongoose.Types.ObjectId;
  date: string;
  time: string;
  location: string;
  capacity: number;
  status: "upcoming" | "completed" | "cancelled";
  recurring: boolean;
  createdAt: Date;
}

const GameSchema = new Schema<IGame>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, default: "" },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
  recurring: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// --- Rsvp ---
export interface IRsvp extends Document {
  gameId: mongoose.Types.ObjectId;
  playerName: string;
  playerPhone: string | null;
  status: "in" | "out" | "maybe";
  guests: number;
  waitlistPosition: number | null;
  addedBy: string | null;
  createdAt: Date;
}

const RsvpSchema = new Schema<IRsvp>({
  gameId: { type: Schema.Types.ObjectId, ref: "Game", required: true },
  playerName: { type: String, required: true },
  playerPhone: { type: String, default: null },
  status: { type: String, enum: ["in", "out", "maybe"], required: true },
  guests: { type: Number, default: 0 },
  waitlistPosition: { type: Number, default: null },
  addedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

RsvpSchema.index({ gameId: 1, playerName: 1 }, { unique: true });

// --- Player ---
export interface IPlayer extends Document {
  phone: string;
  name: string;
  groupId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  phone: { type: String, required: true },
  name: { type: String, required: true },
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  createdAt: { type: Date, default: Date.now },
});

PlayerSchema.index({ phone: 1, groupId: 1 }, { unique: true });

// --- Reminder ---
export interface IReminder extends Document {
  gameId: mongoose.Types.ObjectId;
  reminderType: "24h" | "2h";
  sentAt: Date;
}

const ReminderSchema = new Schema<IReminder>({
  gameId: { type: Schema.Types.ObjectId, ref: "Game", required: true },
  reminderType: { type: String, enum: ["24h", "2h"], required: true },
  sentAt: { type: Date, default: Date.now },
});

// Export models (handle hot-reload in dev)
export const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);
export const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>("Game", GameSchema);
export const Rsvp: Model<IRsvp> = mongoose.models.Rsvp || mongoose.model<IRsvp>("Rsvp", RsvpSchema);
export const Player: Model<IPlayer> = mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);
export const Reminder: Model<IReminder> = mongoose.models.Reminder || mongoose.model<IReminder>("Reminder", ReminderSchema);
