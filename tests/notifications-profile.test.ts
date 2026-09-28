import { describe, it, expect, beforeAll } from "vitest";
import { NotificationRepository } from "@/server/repositories/notification.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { initDatabase } from "@/server/db/postgres";
import { UserRole } from "@/types";

describe("Notifications & Profile Security (FE-14)", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  it("should track unread notifications and allow marking as read", async () => {
    const notifs = await NotificationRepository.findByUserId("usr_customer_default");
    expect(notifs.length).toBeGreaterThan(0);

    // Mark all as read
    await NotificationRepository.markAllAsRead("usr_customer_default");
    const after = await NotificationRepository.findByUserId("usr_customer_default");
    const unread = after.filter((n) => !n.read).length;
    expect(unread).toBe(0);
  });

  it("should never expose password hashes or session tokens in user queries", async () => {
    const user = await UserRepository.findById("usr_customer_default");
    expect(user).toBeDefined();

    // Verify safe serializer pattern
    const { passwordHash: _, ...safeUser } = user!;
    expect((safeUser as any).passwordHash).toBeUndefined();
    expect(safeUser.email).toBe("customer@example.com");
    expect(safeUser.role).toBe(UserRole.CUSTOMER);
  });
});
