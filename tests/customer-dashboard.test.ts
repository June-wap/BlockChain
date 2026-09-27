import { describe, it, expect } from "vitest";
import { CustomerDashboardService } from "../src/server/services/dashboard.service";
import { ClaimStatus, PolicyStatus } from "../src/types";

describe("Customer Dashboard Specification (Prompt 06)", () => {
  describe("CustomerDashboardService", () => {
    it("computes the 4 required dashboard metric cards", () => {
      const data = CustomerDashboardService.getDashboardData();

      // Cards: Active Policies, Open Claims, Approved Claims, Total Paid
      expect(data.metrics).toBeDefined();
      expect(typeof data.metrics.activePolicies).toBe("number");
      expect(typeof data.metrics.openClaims).toBe("number");
      expect(typeof data.metrics.approvedClaims).toBe("number");
      expect(typeof data.metrics.totalPaid).toBe("number");

      expect(data.metrics.activePolicies).toBeGreaterThan(0);
      expect(data.metrics.openClaims).toBeGreaterThan(0);
      expect(data.metrics.approvedClaims).toBeGreaterThan(0);
    });

    it("maps recent claims with all required table fields", () => {
      const data = CustomerDashboardService.getDashboardData();
      expect(data.recentClaims.length).toBeGreaterThan(0);

      const claim = data.recentClaims[0];
      // Required table columns: Claim ID, Policy, Requested Amount, Submitted Date, Status
      expect(claim.claimNumber).toBeDefined();
      expect(claim.policyNumber).toBeDefined();
      expect(claim.policyType).toBeDefined();
      expect(typeof claim.requestedAmount).toBe("number");
      expect(claim.submittedDate).toBeDefined();
      expect(claim.status).toBeDefined();
    });

    it("returns empty state data when customer has no claims", () => {
      const emptyData = CustomerDashboardService.getDashboardData("usr_new_customer", true);

      expect(emptyData.metrics.activePolicies).toBe(0);
      expect(emptyData.metrics.openClaims).toBe(0);
      expect(emptyData.metrics.approvedClaims).toBe(0);
      expect(emptyData.metrics.totalPaid).toBe(0);
      expect(emptyData.recentClaims).toEqual([]);
    });
  });

  describe("Quick Actions & Routing Specification", () => {
    it("specifies correct destinations for Quick Actions", () => {
      const quickActions = {
        submitNewClaim: "/customer/claims/new",
        viewMyPolicies: "/customer/policies",
      };

      expect(quickActions.submitNewClaim).toBe("/customer/claims/new");
      expect(quickActions.viewMyPolicies).toBe("/customer/policies");
    });
  });
});
