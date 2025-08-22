import mongoose from "mongoose";

mongoose.set("strictQuery", true);

const state = { connected: false };

export async function dbConnect() {
  if (state.connected) return state;

  if (!Bun.env.MONGO_URI) {
    throw new Error("Missing env variable: MONGO_URI");
  }

  const { connections } = await mongoose.connect(Bun.env.MONGO_URI);

  state.connected = connections[0]?.readyState === 1;
  if (state.connected) {
    console.log("✅ MongoDB connected");
  } else {
    console.error("❌ MongoDB connection failed");
  }

  return state;
}

export function dbState() {
  return state;
}

export async function dbCleanup() {
  if (state.connected) {
    await mongoose.disconnect();
    console.log("🛑 MongoDB disconnected");
  }
}
