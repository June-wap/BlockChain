import { describe, it, expect } from "vitest";
import {
  canAccessRoute,
  isPublicRoute,
  getDefaultDashboardForRole,
} from "../src/lib/permissions";
import { UserRole } from "../src/types";

describe("Route Permissions & Guard Logic", () => {
  describe("isPublicRoute", () => {
    it("recognizes public routes", () => {
      expect(isPublicRoute("/")).toBe(true);
      expect(isPublicRoute("/login")).toBe(true);
      expect(isPublicRoute("/register")).toBe(true);
      expect(isPublicRoute("/unauthorized")).toBe(true);
      expect(isPublicRoute("/customer/dashboard")).toBe(false);
      expect(isPublicRoute("/staff/claims")).toBe(false);
      expect(isPublicRoute("/admin/users")).toBe(false);
    });
  });

  describe("canAccessRoute", () => {
    it("allows unauthenticated users to access public routes", () => {
      const homeAccess = canAccessRoute("/", null);
      expect(homeAccess.allowed).toBe(true);

      const loginAccess = canAccessRoute("/login", null);
      expect(loginAccess.allowed).toBe(true);
    });

    it("denies unauthenticated users from protected routes and redirects to login", () => {
      const customerAccess = canAccessRoute("/customer/dashboard", null);
      expect(customerAccess.allowed).toBe(false);
      expect(customerAccess.redirectUrl).toContain("/login?redirect=");

      const staffAccess = canAccessRoute("/staff/claims", null);
      expect(staffAccess.allowed).toBe(false);
      expect(staffAccess.redirectUrl).toContain("/login?redirect=");

      const adminAccess = canAccessRoute("/admin/dashboard", null);
      expect(adminAccess.allowed).toBe(false);
      expect(adminAccess.redirectUrl).toContain("/login?redirect=");
    });

    it("allows CUSTOMER to access customer portal only", () => {
      expect(canAccessRoute("/customer/dashboard", UserRole.CUSTOMER).allowed).toBe(true);
      expect(canAccessRoute("/customer/policies", UserRole.CUSTOMER).allowed).toBe(true);
      expect(canAccessRoute("/customer/claims/new", UserRole.CUSTOMER).allowed).toBe(true);

      // Denies customer from accessing staff or admin portal
      const staffAccess = canAccessRoute("/staff/dashboard", UserRole.CUSTOMER);
      expect(staffAccess.allowed).toBe(false);
      expect(staffAccess.redirectUrl).toBe("/customer/dashboard");

      const adminAccess = canAccessRoute("/admin/users", UserRole.CUSTOMER);
      expect(adminAccess.allowed).toBe(false);
      expect(adminAccess.redirectUrl).toBe("/customer/dashboard");
    });

    it("allows CLAIM_REVIEWER and FINANCE to access staff portal", () => {
      expect(canAccessRoute("/staff/dashboard", UserRole.CLAIM_REVIEWER).allowed).toBe(true);
      expect(canAccessRoute("/staff/claims", UserRole.CLAIM_REVIEWER).allowed).toBe(true);
      expect(canAccessRoute("/staff/dashboard", UserRole.FINANCE).allowed).toBe(true);

      // Denies reviewer from accessing admin portal
      const adminAccess = canAccessRoute("/admin/dashboard", UserRole.CLAIM_REVIEWER);
      expect(adminAccess.allowed).toBe(false);
      expect(adminAccess.redirectUrl).toBe("/staff/dashboard");
    });

    it("allows ADMIN to access admin portal and staff desk", () => {
      expect(canAccessRoute("/admin/dashboard", UserRole.ADMIN).allowed).toBe(true);
      expect(canAccessRoute("/admin/users", UserRole.ADMIN).allowed).toBe(true);
      expect(canAccessRoute("/admin/blockchain", UserRole.ADMIN).allowed).toBe(true);
      expect(canAccessRoute("/staff/dashboard", UserRole.ADMIN).allowed).toBe(true);
    });
  });

  describe("getDefaultDashboardForRole", () => {
    it("returns correct default dashboard for all roles", () => {
      expect(getDefaultDashboardForRole(UserRole.CUSTOMER)).toBe("/customer/dashboard");
      expect(getDefaultDashboardForRole(UserRole.CLAIM_REVIEWER)).toBe("/staff/dashboard");
      expect(getDefaultDashboardForRole(UserRole.FINANCE)).toBe("/staff/dashboard");
      expect(getDefaultDashboardForRole(UserRole.ADMIN)).toBe("/admin/dashboard");
    });
  });
});
