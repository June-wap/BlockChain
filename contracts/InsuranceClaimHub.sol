// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InsuranceClaimHub
 * @notice Enterprise Insurance Claim Management and Automated Settlement Smart Contract.
 * @dev Architecture Principles:
 *  - ZERO PII ON-CHAIN: Strictly no personal names, medical notes, phone numbers, or raw evidence files.
 *  - State Machine Enforcement: Prevents invalid claim lifecycle transitions.
 *  - Financial Safeguards: Non-reentrant payouts, double-payment prevention, explicit role permissions.
 */

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract InsuranceClaimHub is Context, ReentrancyGuard {
    // ==========================================
    // ROLES & ACCESS CONTROL
    // ==========================================
    address public admin;
    mapping(address => bool) public authorizedReviewers;
    mapping(address => bool) public authorizedPayers;

    modifier onlyAdmin() {
        require(_msgSender() == admin, "InsuranceClaimHub: caller is not admin");
        _;
    }

    modifier onlyReviewer() {
        require(authorizedReviewers[_msgSender()] || _msgSender() == admin, "InsuranceClaimHub: caller is not reviewer");
        _;
    }

    modifier onlyPayer() {
        require(authorizedPayers[_msgSender()] || _msgSender() == admin, "InsuranceClaimHub: caller is not authorized payer");
        _;
    }

    // ==========================================
    // CLAIM LIFECYCLE STATES
    // ==========================================
    enum ClaimStatus {
        None,           // 0: Unregistered
        Submitted,      // 1: Received
        UnderReview,    // 2: In review
        Approved,       // 3: Verified and approved for settlement
        Rejected,       // 4: Claim rejected
        PaymentPending, // 5: Scheduled for payment
        Paid            // 6: Funds settled/disbursed
    }

    struct OnChainClaim {
        bytes32 claimHash;          // Hash of claim ID + customer salt
        bytes32 policyHash;         // Hash of policy ID
        address payable claimant;   // Customer wallet address for payment
        uint256 requestedAmount;    // native payout amount in wei
        uint256 approvedAmount;     // approved native payout amount in wei
        ClaimStatus status;         // Current lifecycle status
        uint64 submittedAt;         // Unix timestamp
        uint64 processedAt;         // Unix timestamp
        bytes32 evidenceRootHash;   // Merkle root or digest of evidence files
    }

    // Storage
    mapping(bytes32 => OnChainClaim) private claims;
    mapping(bytes32 => bool) public isClaimRecorded;

    // ==========================================
    // EVENTS
    // ==========================================
    event ReviewerUpdated(address indexed account, bool enabled);
    event PayerUpdated(address indexed account, bool enabled);
    event ClaimRecorded(bytes32 indexed claimHash, bytes32 indexed policyHash, address indexed claimant, uint256 requestedAmount, uint64 timestamp);
    event ClaimStatusChanged(bytes32 indexed claimHash, ClaimStatus oldStatus, ClaimStatus newStatus, uint64 timestamp);
    event ClaimApproved(bytes32 indexed claimHash, uint256 approvedAmount, address indexed reviewer, uint64 timestamp);
    event ClaimRejected(bytes32 indexed claimHash, bytes32 reasonCode, address indexed reviewer, uint64 timestamp);
    event PaymentReleased(bytes32 indexed claimHash, address indexed recipient, uint256 amount, uint64 timestamp);

    constructor() {
        admin = _msgSender();
        authorizedReviewers[_msgSender()] = true;
        authorizedPayers[_msgSender()] = true;
    }

    // ==========================================
    // ROLE MANAGEMENT
    // ==========================================
    function setReviewer(address reviewer, bool enabled) external onlyAdmin {
        require(reviewer != address(0), "Invalid address");
        authorizedReviewers[reviewer] = enabled;
        emit ReviewerUpdated(reviewer, enabled);
    }

    function setPayer(address payer, bool enabled) external onlyAdmin {
        require(payer != address(0), "Invalid address");
        authorizedPayers[payer] = enabled;
        emit PayerUpdated(payer, enabled);
    }

    // ==========================================
    // CLAIM LIFECYCLE FUNCTIONS
    // ==========================================

    /**
     * @notice Record a new claim on-chain.
     */
    function recordClaim(
        bytes32 claimHash,
        bytes32 policyHash,
        address payable claimant,
        uint256 requestedAmount,
        bytes32 evidenceRootHash
    ) external onlyReviewer {
        require(claimHash != bytes32(0), "Invalid claim hash");
        require(!isClaimRecorded[claimHash], "Claim already exists");
        require(claimant != address(0), "Invalid claimant address");
        require(requestedAmount > 0, "Requested amount must be > 0");

        claims[claimHash] = OnChainClaim({
            claimHash: claimHash,
            policyHash: policyHash,
            claimant: claimant,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            status: ClaimStatus.Submitted,
            submittedAt: uint64(block.timestamp),
            processedAt: 0,
            evidenceRootHash: evidenceRootHash
        });

        isClaimRecorded[claimHash] = true;
        emit ClaimRecorded(claimHash, policyHash, claimant, requestedAmount, uint64(block.timestamp));
    }

    /**
     * @notice Move claim to UnderReview.
     */
    function setUnderReview(bytes32 claimHash) external onlyReviewer {
        require(isClaimRecorded[claimHash], "Claim not found");
        OnChainClaim storage claim = claims[claimHash];
        require(claim.status == ClaimStatus.Submitted, "Claim not in Submitted state");

        claim.status = ClaimStatus.UnderReview;
        emit ClaimStatusChanged(claimHash, ClaimStatus.Submitted, ClaimStatus.UnderReview, uint64(block.timestamp));
    }

    /**
     * @notice Approve claim with an approved settlement amount.
     */
    function approveClaim(bytes32 claimHash, uint256 approvedAmount) external onlyReviewer {
        require(isClaimRecorded[claimHash], "Claim not found");
        OnChainClaim storage claim = claims[claimHash];
        require(
            claim.status == ClaimStatus.UnderReview,
            "Invalid state for approval: Must be UnderReview"
        );
        require(approvedAmount > 0, "Approved amount must be > 0");
        require(approvedAmount <= claim.requestedAmount, "Approved amount exceeds requested");

        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.Approved;
        claim.approvedAmount = approvedAmount;
        claim.processedAt = uint64(block.timestamp);

        emit ClaimStatusChanged(claimHash, oldStatus, ClaimStatus.Approved, uint64(block.timestamp));
        emit ClaimApproved(claimHash, approvedAmount, _msgSender(), uint64(block.timestamp));
    }

    /**
     * @notice Reject claim with a reason code hash.
     */
    function rejectClaim(bytes32 claimHash, bytes32 reasonCode) external onlyReviewer {
        require(isClaimRecorded[claimHash], "Claim not found");
        OnChainClaim storage claim = claims[claimHash];
        require(
            claim.status == ClaimStatus.UnderReview,
            "Invalid state for rejection: Must be UnderReview"
        );

        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.Rejected;
        claim.processedAt = uint64(block.timestamp);

        emit ClaimStatusChanged(claimHash, oldStatus, ClaimStatus.Rejected, uint64(block.timestamp));
        emit ClaimRejected(claimHash, reasonCode, _msgSender(), uint64(block.timestamp));
    }

    /**
     * @notice Release payment for an approved claim to the customer wallet.
     */
    function releasePayment(bytes32 claimHash) external onlyPayer nonReentrant {
        require(isClaimRecorded[claimHash], "Claim not found");
        OnChainClaim storage claim = claims[claimHash];
        require(
            claim.status == ClaimStatus.Approved || claim.status == ClaimStatus.PaymentPending,
            "Claim is not approved for payment"
        );
        require(claim.status != ClaimStatus.Paid, "Claim has already been paid");
        require(claim.approvedAmount > 0, "No approved funds to disburse");

        // Update state before external call (Checks-Effects-Interactions)
        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.Paid;
        claim.processedAt = uint64(block.timestamp);

        emit ClaimStatusChanged(claimHash, oldStatus, ClaimStatus.Paid, uint64(block.timestamp));
        emit PaymentReleased(claimHash, claim.claimant, claim.approvedAmount, uint64(block.timestamp));

        // Ensure contract has sufficient escrow funding before releasing payment
        require(address(this).balance >= claim.approvedAmount, "INSUFFICIENT_CONTRACT_ESCROW");

        (bool success, ) = claim.claimant.call{value: claim.approvedAmount}("");
        require(success, "Payment transfer failed");
    }

    /**
     * @notice Retrieve on-chain claim data.
     */
    function getClaim(bytes32 claimHash)
        external
        view
        returns (
            bytes32 policyHash,
            address claimant,
            uint256 requestedAmount,
            uint256 approvedAmount,
            ClaimStatus status,
            uint64 submittedAt,
            uint64 processedAt,
            bytes32 evidenceRootHash
        )
    {
        require(isClaimRecorded[claimHash], "Claim not found");
        OnChainClaim storage claim = claims[claimHash];
        return (
            claim.policyHash,
            claim.claimant,
            claim.requestedAmount,
            claim.approvedAmount,
            claim.status,
            claim.submittedAt,
            claim.processedAt,
            claim.evidenceRootHash
        );
    }

    // Allow contract to receive funds for claims payout escrow
    receive() external payable {}
}
