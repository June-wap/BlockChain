import { describe, it, expect } from "vitest";
import { UserRole } from "../src/types";
import { canAccessRoute } from "../src/lib/permissions";

describe("Customer Portal Layout Specification (Prompt 05)", () => {
  const customerNavigation = [
    { title: "Dashboard", href: "/customer/dashboard" },
    { title: "My Policies", href: "/customer/policies" },
    { title: "My Claims", href: "/customer/claims" },
    { title: "Payments", href: "/customer/payments" },
    { title: "Notifications", href: "/customer/notifications" },
    { title: "Profile", href: "/customer/profile" },
  ];

  it("verifies all required Customer navigation links exist in order", () => {
    expect(customerNavigation).toHaveLength(6);
    expect(customerNavigation[0].title).toBe("Dashboard");
    expect(customerNavigation[1].title).toBe("My Policies");
    expect(customerNavigation[2].title).toBe("My Claims");
    expect(customerNavigation[3].title).toBe("Payments");
    expect(customerNavigation[4].title).toBe("Notifications");
    expect(customerNavigation[5].title).toBe("Profile");
  });

  it("verifies route scope /customer/* allows only CUSTOMER role", () => {
    customerNavigation.forEach((item) => {
      // Allowed for customer
      const customerAccess = canAccessRoute(item.href, UserRole.CUSTOMER);
      expect(customerAccess.allowed).toBe(true);

      // Denied for unauthenticated
      const unauthAccess = canAccessRoute(item.href, null);
      expect(unauthAccess.allowed).toBe(false);
      expect(unauthAccess.redirectUrl).toContain("/login");

      // Denied for staff and reviewer (redirects to their default dashboard)
      const reviewerAccess = canAccessRoute(item.href, UserRole.CLAIM_REVIEWER);
      expect(reviewerAccess.allowed).toBe(false);
      expect(reviewerAccess.redirectUrl).toBe("/staff/dashboard");
    });
  });

  it("verifies subroutes under /customer are covered under route scope", () => {
    expect(canAccessRoute("/customer/claims/new", UserRole.CUSTOMER).allowed).toBe(true);
    expect(canAccessRoute("/customer/claims/clm-101", UserRole.CUSTOMER).allowed).toBe(true);
    expect(canAccessRoute("/customer/policies/pol-202", UserRole.CUSTOMER).allowed).toBe(true);
  });
});
