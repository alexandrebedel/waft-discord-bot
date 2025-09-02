import mongoose, { type ClientSession } from "mongoose";
import signale from "signale";

export class MongoDisposable {
  private session: ClientSession | null = null;
  private active = false;

  constructor(session: ClientSession) {
    this.session = session;
    this.active = true;
  }

  static async create() {
    const session = await mongoose.startSession();

    session.startTransaction();
    return new MongoDisposable(session);
  }

  getSession() {
    if (!this.session) {
      throw new Error("Session is not active");
    }
    return this.session;
  }

  async commit() {
    if (!this.session || !this.active) {
      return;
    }
    await this.session.commitTransaction();
    this.session.endSession();
    this.active = false;
  }

  async abort() {
    if (!this.session || !this.active) {
      return;
    }
    await this.session.abortTransaction();
    this.session.endSession();
    this.active = false;
  }

  async [Symbol.asyncDispose]() {
    if (!this.session || !this.active) {
      return;
    }

    try {
      await this.session.abortTransaction();
    } catch (err) {
      signale.error("Could not abort transaction", err);
    } finally {
      this.session.endSession();
      this.active = false;
    }
  }
}
