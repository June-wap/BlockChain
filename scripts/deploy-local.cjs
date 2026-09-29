const hre = require("hardhat");

async function main() {
  console.log("============================================================");
  console.log("DEPLOYING INSURANCECLAIMHUB TO HARDHAT LOCAL BLOCKCHAIN");
  console.log("============================================================");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const reviewer = signers[1] || deployer;
  const payer = signers[2] || deployer;

  console.log("Deployer / Admin:     ", deployer.address);
  console.log("Reviewer / Operator:  ", reviewer.address);
  console.log("Payer / Finance:      ", payer.address);

  // Deploy Contract
  const ContractFactory = await hre.ethers.getContractFactory("InsuranceClaimHub", deployer);
  const contract = await ContractFactory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("\n>>> InsuranceClaimHub Deployed Successfully!");
  console.log("Contract Address:     ", contractAddress);

  // Configure permissions
  if (reviewer.address !== deployer.address) {
    const txReviewer = await contract.setReviewer(reviewer.address, true);
    await txReviewer.wait();
    console.log("Granted REVIEWER role to:", reviewer.address);
  }

  if (payer.address !== deployer.address) {
    const txPayer = await contract.setPayer(payer.address, true);
    await txPayer.wait();
    console.log("Granted PAYER role to:   ", payer.address);
  }

  // Fund contract with ETH for payout liquidity
  const fundTx = await deployer.sendTransaction({
    to: contractAddress,
    value: hre.ethers.parseEther("50.0"),
  });
  await fundTx.wait();
  console.log("Funded contract with 50.0 ETH for claim settlements.");

  const balance = await hre.ethers.provider.getBalance(contractAddress);
  console.log("Contract Balance:     ", hre.ethers.formatEther(balance), "ETH");

  console.log("\n============================================================");
  console.log("ENVIRONMENT VARIABLE CONFIGURATION:");
  console.log("============================================================");
  console.log(`INSURANCE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`);
  console.log(`NEXT_PUBLIC_BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`);
  console.log(`NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID=31337`);
  console.log("============================================================\n");

  return {
    contractAddress,
    adminAddress: deployer.address,
    reviewerAddress: reviewer.address,
    payerAddress: payer.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
