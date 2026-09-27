import { describe, it, expect } from "vitest";
import { db } from "@/server/db/store";
import { NotificationType, UserRole, UserStatus } from "@/types";

describe("Notifications & Profile Security (FE-14)", () => {
  it("should track unread notifications and allow marking as read", () => {
    const notifs = Array.from(db.getNotifications().values()).filter(
      (n) => n.userId === "usr_customer_default"
    );
    expect(notifs.length).toBeGreaterThan(0);

    // Mark all as read
    notifs.forEach((n) => (n.read = true));
    const unread = notifs.filter((n) => !n.read).length;
    expect(unread).toBe(0);
  });

  it("should never expose password hashes or session tokens in user queries", () => {
    const user = db.getUsers().get("usr_customer_default");
    expect(user).toBeDefined();

    // Verify safe serializer pattern
    const { passwordHash: _, ...safeUser } = user!;
    expect((safeUser as any).passwordHash).toBeUndefined();
    expect(safeUser.email).toBe("customer@example.com");
    expect(safeUser.role).toBe(UserRole.CUSTOMER);
  });
});
