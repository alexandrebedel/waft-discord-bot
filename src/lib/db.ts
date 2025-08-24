import mongoose from "mongoose";
import signale from "signale";
import { config } from "./config";

mongoose.set("strictQuery", true);

const state = { connected: false };

export async function dbConnect() {
  if (state.connected) {
    return state;
  }

  const { connections } = await mongoose.connect(config.mongoUri);

  state.connected = connections[0]?.readyState === 1;
  if (state.connected) {
    signale.success("MongoDB connected");
  } else {
    signale.error("MongoDB connection failed");
  }

  return state;
}

export function dbState() {
  return state;
}

export async function dbCleanup() {
  if (state.connected) {
    await mongoose.disconnect();
    signale.complete("MongoDB disconnected");
  }
}
