// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { AgreementFactory } from "src/AgreementFactory.sol";
import { Agreement } from "src/Agreement.sol";
// Use explicit imports with aliases to avoid conflict with forge-std's StdChains.Chain
import {
    AgreementDetails,
    Contact,
    Chain as AgreementChain,
    Account as AgreementAccount,
    BountyTerms,
    ChildContractScope,
    IdentityRequirements
} from "src/types/AgreementTypes.sol";

/// @title CreateTestAgreement - Creates a test agreement for smoke testing
/// @notice Deploys a minimal valid agreement via AgreementFactory
/// @dev Used by smoke tests to verify the indexing pipeline works end-to-end
contract CreateTestAgreement is Script {
    // Default zkSync local node rich wallet
    address public constant DEFAULT_OWNER = 0x36615Cf349d7F6344891B1e7CA7C72883F5dc049;

    function run(address factory) external returns (address agreementAddress) {
        console.log("Creating test agreement...");
        console.log("Factory:", factory);
        console.log("Owner:", DEFAULT_OWNER);

        vm.startBroadcast();

        // Build contact details
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Security Team", contact: "security@smoketest.local" });

        // Build chain scope - include BattleChain (eip155:626) with a test contract address
        AgreementChain[] memory chains = new AgreementChain[](1);
        AgreementAccount[] memory accounts = new AgreementAccount[](1);
        accounts[0] = AgreementAccount({
            accountAddress: "0x1234567890123456789012345678901234567890",
            childContractScope: ChildContractScope.None
        });
        chains[0] = AgreementChain({
            assetRecoveryAddress: "0x36615Cf349d7F6344891B1e7CA7C72883F5dc049",
            accounts: accounts,
            caip2ChainId: "eip155:626" // BattleChain Mainnet
        });

        // Build bounty terms
        BountyTerms memory bountyTerms = BountyTerms({
            bountyPercentage: 10,
            bountyCapUsd: 1_000_000,
            retainable: true,
            identity: IdentityRequirements.Anonymous,
            diligenceRequirements: "",
            aggregateBountyCapUsd: 0
        });

        // Build full agreement details
        AgreementDetails memory details = AgreementDetails({
            protocolName: "SmokeTestProtocol",
            contactDetails: contacts,
            chains: chains,
            bountyTerms: bountyTerms,
            agreementURI: "ipfs://QmSmokeTestAgreementURI"
        });

        // Create the agreement with a unique salt based on block timestamp
        bytes32 salt = keccak256(abi.encodePacked("smoke-test-agreement-", block.timestamp));
        agreementAddress = AgreementFactory(factory).create(details, DEFAULT_OWNER, salt);

        console.log("Agreement created at:", agreementAddress);

        vm.stopBroadcast();

        // NOTE: Additional calls (addOrSetChains, extendCommitmentWindow) are done
        // via cast send in deploy.sh. zkSync local node cannot read state from
        // contracts deployed in the same block, so these must be separate transactions.

        console.log("");
        console.log("Test Agreement Creation Complete!");
        console.log("Agreement Address:", agreementAddress);
    }
}
