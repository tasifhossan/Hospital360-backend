import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logAction } from "./auditLogger";
import { prisma } from "../../lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";

// Mock the prisma object
vi.mock("../../lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("auditLogger", () => {
  const fallbackLogPath = path.join(__dirname, "../../../logs/audit-fallback.log");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clean up fallback log file if it exists
    await fs.rm(fallbackLogPath, { force: true }).catch(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should successfully log action on first attempt", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "1" } as any);

    await logAction({ userId: "user-123", email: "test@example.com" }, "LOGIN", { ip: "127.0.0.1" });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    // Confirm no fallback log is created
    await expect(fs.access(fallbackLogPath)).rejects.toThrow();
  });

  it("should retry once on failure and succeed", async () => {
    // First attempt fails, second succeeds
    vi.mocked(prisma.auditLog.create)
      .mockRejectedValueOnce(new Error("DB Timeout"))
      .mockResolvedValueOnce({ id: "2" } as any);

    const logPromise = logAction({ userId: "user-123", email: "test@example.com" }, "LOGIN", { ip: "127.0.0.1" });

    // Advance timer to trigger retry backoff
    await vi.advanceTimersByTimeAsync(250);
    await logPromise;

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
    // Confirm no fallback log is created
    await expect(fs.access(fallbackLogPath)).rejects.toThrow();
  });

  it("should write to fallback file when retry also fails", async () => {
    // Both attempts fail
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error("DB Connection Down"));

    const logPromise = logAction({ userId: "user-123", email: "test@example.com" }, "LOGIN", { ip: "127.0.0.1" });

    // Advance timer to trigger retry backoff
    await vi.advanceTimersByTimeAsync(250);
    await logPromise;

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);

    // Confirm fallback log is created and has correct contents
    const fallbackContent = await fs.readFile(fallbackLogPath, "utf-8");
    const logEntry = JSON.parse(fallbackContent.trim());

    expect(logEntry.userId).toBe("user-123");
    expect(logEntry.userEmail).toBe("test@example.com");
    expect(logEntry.action).toBe("LOGIN");
    expect(logEntry.details).toEqual({ ip: "127.0.0.1" });
    expect(logEntry.error).toBe("DB Connection Down");
  });
});
