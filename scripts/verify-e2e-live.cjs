const { ethers } = require("ethers");

async function runLiveVerification() {
  console.log("============================================================");
  console.log("STARTING LIVE REAL METAMASK INTEGRATION VERIFICATION");
  console.log("Target Server: http://localhost:3000");
  console.log("Hardhat Node:  http://127.0.0.1:8545");
  console.log("============================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Verify Hardhat Node & Contract
  console.log("--- STEP 1: Verifying Hardhat RPC & Deployed Contract ---");
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const network = await provider.getNetwork();
  console.log("Connected Chain ID: ", Number(network.chainId));
  if (Number(network.chainId) !== 31337) {
    throw new Error(`Expected chain ID 31337, got ${network.chainId}`);
  }

  const contractAddress = process.env.INSURANCE_CONTRACT_ADDRESS || "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  const code = await provider.getCode(contractAddress);
  console.log("Contract bytecode length:", code.length);
  if (code === "0x" || code.length < 100) {
    throw new Error("Contract is not deployed or has empty bytecode!");
  }

  const balance = await provider.getBalance(contractAddress);
  console.log("Contract balance:        ", ethers.formatEther(balance), "ETH");
  console.log("STEP 1 PASS: Blockchain environment healthy and contract verified.\n");

  // 2. Register or Login as customer
  console.log("--- STEP 2: Authenticating as Customer ---");
  const customerEmail = `live_metamask_cust_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "MetaMask Live Tester",
      email: customerEmail,
      password: "SecurePassword123!",
      phone: "+84 987 654 321",
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  const token = regData.data.token;
  const cookie = regRes.headers.get("set-cookie") || `auth_token=${token}`;
  console.log("Registered test customer:", regData.data.user.fullName, `(${regData.data.user.id})`);
  console.log("STEP 2 PASS: Authenticated successfully.\n");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    Cookie: cookie,
  };

  // 3. Clear existing wallet if any (Disconnect)
  console.log("--- STEP 3: Initializing Wallet State (Disconnect if already connected) ---");
  const discRes = await fetch(`${baseUrl}/api/wallet/disconnect`, {
    method: "POST",
    headers: authHeaders,
  });
  const discData = await discRes.json();
  console.log("Disconnect response:", discData.message);
  console.log("STEP 3 PASS: Wallet cleared.\n");

  // 4. Test security safeguard: Direct profile edit with walletAddress MUST be rejected
  console.log("--- STEP 4: Security Safeguard Test - Reject Manual Profile Wallet Edit ---");
  const exploitRes = await fetch(`${baseUrl}/api/customer/profile`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }),
  });
  const exploitData = await exploitRes.json();
  console.log("Status:", exploitRes.status, "Error:", exploitData.error);
  if (exploitRes.status !== 400 || (exploitData.code !== "WALLET_VERIFICATION_REQUIRED" && !exploitData.error?.includes("prohibited"))) {
    throw new Error("FAIL: Direct wallet address manipulation was NOT rejected!");
  }
  console.log("STEP 4 PASS: Direct wallet address manipulation strictly blocked.\n");

  // 5. Simulate MetaMask user wallet
  console.log("--- STEP 5: Requesting Nonce Challenge ---");
  // Hardhat Account #3 as customer's MetaMask wallet
  const customerWallet = new ethers.Wallet(
    "0xdbda1821b80551c9d65993c359202f51886ba52320343a4df59f77b16a2773dd",
    provider
  );
  console.log("Customer MetaMask address:", customerWallet.address);

  const challengeRes = await fetch(`${baseUrl}/api/wallet/challenge`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      address: customerWallet.address,
      chainId: 31337,
    }),
  });

  const challengeJson = await challengeRes.json();
  if (!challengeRes.ok) {
    throw new Error(`Challenge request failed: ${JSON.stringify(challengeJson)}`);
  }
  const challenge = challengeJson.data || challengeJson;
  console.log("Received Challenge Nonce:", challenge.nonce);
  console.log("Received Message to Sign:\n" + challenge.message.split("\n").map(l => "  | " + l).join("\n"));
  console.log("STEP 5 PASS: Cryptographic challenge generated.\n");

  // 6. Sign message using customer's private key (Simulating window.ethereum personal_sign)
  console.log("--- STEP 6: Signing Message with MetaMask (personal_sign) ---");
  const signature = await customerWallet.signMessage(challenge.message);
  console.log("Generated EIP-191 Signature:", signature.slice(0, 30) + "..." + signature.slice(-20));

  // 7. Verify Signature on Backend
  console.log("--- STEP 7: Submitting Signature to /api/wallet/verify ---");
  const verifyRes = await fetch(`${baseUrl}/api/wallet/verify`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      address: customerWallet.address,
      signature: signature,
      nonce: challenge.nonce,
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(`Verification failed: ${JSON.stringify(verifyJson)}`);
  }
  const verifyData = verifyJson.data || verifyJson;
  console.log("Verification Response:", verifyJson.message);
  console.log("Verified Wallet Address:", verifyData.walletAddress);
  if (verifyData.walletAddress.toLowerCase() !== customerWallet.address.toLowerCase()) {
    throw new Error("Returned wallet does not match customer wallet!");
  }
  console.log("STEP 7 PASS: Signature verified and wallet bound to user profile.\n");

  // 8. Replay Protection Test: Reusing the same challenge nonce MUST fail
  console.log("--- STEP 8: Security Safeguard Test - Replay Attack Protection ---");
  const replayRes = await fetch(`${baseUrl}/api/wallet/verify`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      address: customerWallet.address,
      signature: signature,
      nonce: challenge.nonce,
    }),
  });
  const replayData = await replayRes.json();
  console.log("Status:", replayRes.status, "Error:", replayData.error);
  if (replayRes.status !== 400) {
    throw new Error("FAIL: Replay attack was not prevented!");
  }
  console.log("STEP 8 PASS: Replay attack successfully prevented.\n");

  // 9. Verify Customer Profile API reflects the verified wallet
  console.log("--- STEP 9: Verifying Profile API Response ---");
  const profileRes = await fetch(`${baseUrl}/api/customer/profile`, {
    headers: authHeaders,
  });
  const profileJson = await profileRes.json();
  const profileData = profileJson.data || profileJson;
  console.log("Profile Wallet Address:", profileData.walletAddress);
  if (profileData.walletAddress?.toLowerCase() !== customerWallet.address.toLowerCase()) {
    throw new Error("Profile wallet does not match verified address!");
  }
  console.log("STEP 9 PASS: Profile reflects verified wallet address.\n");

  // 10. Test End-to-End Payout with Verified Wallet
  console.log("--- STEP 10: Testing On-Chain Payout to Verified Wallet ---");
  const jose = require("jose");
  const jwtSecret = new TextEncoder().encode("local-demo-insurance-jwt-secret-2026-abcdef1234567890");
  const adminToken = await new jose.SignJWT({
    userId: "usr_admin_1",
    email: "admin@insurance.vn",
    role: "ADMIN",
    fullName: "System Administrator",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("insurance-system")
    .setAudience("insurance-app")
    .setExpirationTime("7d")
    .sign(jwtSecret);

  const adminHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
    Cookie: `auth_token=${adminToken}`,
  };

  // 10a. Admin issues policy to test customer
  const policyRes = await fetch(`${baseUrl}/api/admin/policies`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      customerId: regData.data.user.id,
      type: "Comprehensive Health",
      coverageAmount: 10000,
      premiumAmount: 500,
      deductible: 100,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
    }),
  });
  const policyJson = await policyRes.json();
  if (!policyRes.ok) {
    throw new Error(`Policy creation failed: ${JSON.stringify(policyJson)}`);
  }
  const policyId = policyJson.data.id;
  console.log("Created Policy:", policyJson.data.policyNumber, `(${policyId})`);

  // 10b. Customer submits claim
  const claimRes = await fetch(`${baseUrl}/api/claims`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      policyId: policyId,
      incidentDate: "2026-06-15",
      incidentType: "Hospitalization",
      location: "Central Medical Center",
      requestedAmount: 1000,
      description: "Emergency treatment and medical examination expenses.",
      evidenceFiles: [],
    }),
  });
  const claimJson = await claimRes.json();
  if (!claimRes.ok) {
    throw new Error(`Claim submission failed: ${JSON.stringify(claimJson)}`);
  }
  const claimId = claimJson.data.id;
  console.log("Submitted Claim:", claimJson.data.claimNumber, `(${claimId})`);

  // 10c. Reviewer/Admin starts review and approves claim
  await fetch(`${baseUrl}/api/staff/claims/${claimId}/start-review`, {
    method: "POST",
    headers: adminHeaders,
  });

  const approveRes = await fetch(`${baseUrl}/api/staff/claims/${claimId}/approve`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      approvedAmount: 1000,
      notes: "Hospitalization verified against coverage limits.",
    }),
  });
  const approveJson = await approveRes.json();
  if (!approveRes.ok) {
    throw new Error(`Claim approval failed: ${JSON.stringify(approveJson)}`);
  }
  console.log("Claim Approved. On-chain Record Tx:", approveJson.data.txHash || "Enqueued in Outbox");

  // 10d. Find generated pending payment
  const paymentsRes = await fetch(`${baseUrl}/api/payments`, { headers: adminHeaders });
  const paymentsJson = await paymentsRes.json();
  const paymentList = paymentsJson.data?.payments || paymentsJson.data || [];
  const payment = paymentList.find((p) => p.claimId === claimId);
  if (!payment) {
    throw new Error("Pending payment for approved claim was not found!");
  }
  console.log("Found Pending Payment:", payment.id, "Recipient Wallet:", payment.recipientWallet);
  if (payment.recipientWallet?.toLowerCase() !== customerWallet.address.toLowerCase()) {
    throw new Error(`Payment recipient wallet ${payment.recipientWallet} does not match verified wallet ${customerWallet.address}`);
  }

  // 10e. Customer & Contract balance before disbursement
  const initialBalance = await provider.getBalance(customerWallet.address);
  const contractBalanceBefore = await provider.getBalance(contractAddress);
  console.log("Customer Wallet Balance Before Disbursement:", ethers.formatEther(initialBalance), "ETH");
  console.log("Contract Escrow Balance Before Disbursement:", ethers.formatEther(contractBalanceBefore), "ETH");

  // 10f. Disburse payment on-chain
  const disburseRes = await fetch(`${baseUrl}/api/payments/${payment.id}/disburse`, {
    method: "POST",
    headers: adminHeaders,
  });
  const disburseJson = await disburseRes.json();
  if (!disburseRes.ok) {
    throw new Error(`Disbursement failed: ${JSON.stringify(disburseJson)}`);
  }
  console.log("Payment Disbursed! Blockchain Tx Hash:", disburseJson.data?.blockchainTxHash || disburseJson.data?.txHash);

  // 10g. Verify Customer Balance Increased by EXACT 1.0 ETH on Hardhat Blockchain
  const finalBalance = await provider.getBalance(customerWallet.address);
  const contractBalanceAfter = await provider.getBalance(contractAddress);
  console.log("Customer Wallet Balance After Disbursement: ", ethers.formatEther(finalBalance), "ETH");
  console.log("Contract Escrow Balance After Disbursement: ", ethers.formatEther(contractBalanceAfter), "ETH");

  const expectedWei = ethers.parseEther("1.0");
  const customerDelta = finalBalance - initialBalance;
  const contractDelta = contractBalanceBefore - contractBalanceAfter;

  console.log("Customer Received (Wei):", customerDelta.toString(), "wei");
  console.log("Customer Received (ETH):", ethers.formatEther(customerDelta), "ETH");
  console.log("Contract Deducted (Wei):", contractDelta.toString(), "wei");

  if (customerDelta !== expectedWei) {
    throw new Error(
      `BUG DETECTED: Customer balance delta was ${customerDelta.toString()} wei (${ethers.formatEther(customerDelta)} ETH), expected exactly 1.0 ETH (${expectedWei.toString()} wei)!`
    );
  }

  if (contractDelta !== expectedWei) {
    throw new Error(
      `Contract balance deduction mismatch: Deducted ${contractDelta.toString()} wei, expected ${expectedWei.toString()} wei!`
    );
  }

  // 10h. Verify On-Chain Claim State & Amounts in InsuranceClaimHub Contract
  const fs = require("fs");
  const path = require("path");
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/InsuranceClaimHub.sol/InsuranceClaimHub.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

  const claimHash = ethers.keccak256(ethers.toUtf8Bytes(claimId));
  const onChainClaim = await contract.getClaim(claimHash);
  console.log("On-Chain Claim Audit:", {
    claimHash,
    claimant: onChainClaim.claimant,
    requestedAmountWei: onChainClaim.requestedAmount.toString(),
    requestedAmountEth: ethers.formatEther(onChainClaim.requestedAmount),
    approvedAmountWei: onChainClaim.approvedAmount.toString(),
    approvedAmountEth: ethers.formatEther(onChainClaim.approvedAmount),
    status: Number(onChainClaim.status), // 6 = Paid
  });

  if (onChainClaim.requestedAmount !== expectedWei) {
    throw new Error(`Expected on-chain requestedAmount to be 1.0 ETH (${expectedWei}), got ${onChainClaim.requestedAmount}`);
  }
  if (onChainClaim.approvedAmount !== expectedWei) {
    throw new Error(`Expected on-chain approvedAmount to be 1.0 ETH (${expectedWei}), got ${onChainClaim.approvedAmount}`);
  }
  if (Number(onChainClaim.status) !== 6) {
    throw new Error(`Expected on-chain status to be 6 (PAID), got ${onChainClaim.status}`);
  }

  console.log("STEP 10 PASS: Real $1,000 USD claim correctly settled as exact 1.0 ETH (10^18 wei) to verified MetaMask wallet!\n");

  // 11. Security Test: Reject Payout When Customer Has No Verified Wallet
  console.log("--- STEP 11: Security Safeguard Test - Reject Payout Without Verified Wallet ---");
  // Customer unlinks wallet
  await fetch(`${baseUrl}/api/wallet/disconnect`, { method: "POST", headers: authHeaders });

  // Submit second claim
  const claim2Res = await fetch(`${baseUrl}/api/claims`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      policyId: policyId,
      incidentDate: "2026-07-01",
      incidentType: "Prescription Drugs",
      location: "City Pharmacy",
      requestedAmount: 300,
      description: "Medication following hospital discharge.",
      evidenceFiles: [],
    }),
  });
  const claim2Json = await claim2Res.json();
  const claim2Id = claim2Json.data.id;

  // Review and approve second claim
  await fetch(`${baseUrl}/api/staff/claims/${claim2Id}/start-review`, {
    method: "POST",
    headers: adminHeaders,
  });

  await fetch(`${baseUrl}/api/staff/claims/${claim2Id}/approve`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      approvedAmount: 300,
      notes: "Prescription verified.",
    }),
  });

  // Find payment for second claim
  const payments2Res = await fetch(`${baseUrl}/api/payments`, { headers: adminHeaders });
  const payments2Json = await payments2Res.json();
  const payment2List = payments2Json.data?.payments || payments2Json.data || [];
  const payment2 = payment2List.find((p) => p.claimId === claim2Id);

  // Attempt disburse
  const failDisburseRes = await fetch(`${baseUrl}/api/payments/${payment2.id}/disburse`, {
    method: "POST",
    headers: adminHeaders,
  });
  const failDisburseJson = await failDisburseRes.json();
  console.log("Disburse status without verified wallet:", failDisburseRes.status, "Error:", failDisburseJson.error);
  if (failDisburseRes.status !== 400 || !failDisburseJson.error?.includes("CUSTOMER_WALLET_NOT_VERIFIED")) {
    throw new Error("FAIL: Payout without verified wallet was NOT rejected with CUSTOMER_WALLET_NOT_VERIFIED!");
  }
  console.log("STEP 11 PASS: Crypto payout without verified wallet strictly rejected with CUSTOMER_WALLET_NOT_VERIFIED.\n");

  console.log("============================================================");
  console.log("ALL REAL METAMASK INTEGRATION VERIFICATION CHECKS PASSED!");
  console.log("============================================================");
}

runLiveVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFATAL ERROR DURING VERIFICATION:", err);
    process.exit(1);
  });
