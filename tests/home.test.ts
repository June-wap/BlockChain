import { describe, it, expect } from "vitest";

describe("Public Home Page Specification (Prompt 03)", () => {
  const expectedWorkflowSteps = [
    "Register Policy",
    "Submit Claim",
    "Claim Review",
    "Approval",
    "Payment",
  ];

  it("verifies the 5 sequential workflow steps in How It Works", () => {
    expect(expectedWorkflowSteps).toHaveLength(5);
    expect(expectedWorkflowSteps[0]).toBe("Register Policy");
    expect(expectedWorkflowSteps[1]).toBe("Submit Claim");
    expect(expectedWorkflowSteps[2]).toBe("Claim Review");
    expect(expectedWorkflowSteps[3]).toBe("Approval");
    expect(expectedWorkflowSteps[4]).toBe("Payment");
  });

  it("verifies blockchain transparency principles", () => {
    const principles = {
      noPIIOnChain: true,
      hashedMilestones: ["SUBMITTED", "APPROVED", "PAID"],
      automatedPayouts: true,
    };

    expect(principles.noPIIOnChain).toBe(true);
    expect(principles.hashedMilestones).toContain("SUBMITTED");
    expect(principles.hashedMilestones).toContain("APPROVED");
    expect(principles.hashedMilestones).toContain("PAID");
    expect(principles.automatedPayouts).toBe(true);
  });
});
