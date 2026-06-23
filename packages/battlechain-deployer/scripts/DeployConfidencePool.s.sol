// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console } from "forge-std/Script.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { ConfidencePool } from "src/ConfidencePool.sol";
import { ConfidencePoolFactory } from "src/ConfidencePoolFactory.sol";

/// @title DeployConfidencePool — local-dev deploy of the ConfidencePool clone implementation
///        and the ConfidencePoolFactory (UUPS proxy).
///
/// @dev Mirrors `DeployLocal.s.sol`'s pattern (zkSync-compatible builds, single broadcast).
///      Reads SAFE_HARBOR_REGISTRY_ADDRESS from env — must already be deployed by the
///      battlechain-safe-harbor pass that runs before this one in `deploy.sh`.
///
///      The moderator is set to the deployer's own address for local dev. In production
///      this should be the protocol DAO multisig (set via setDefaultOutcomeModerator
///      post-deploy, or by passing DEFAULT_MODERATOR via env).
contract DeployConfidencePool is Script {
    function run() external returns (address implementation, address factoryProxy) {
        address safeHarborRegistry = vm.envAddress("SAFE_HARBOR_REGISTRY_ADDRESS");
        address defaultModerator = vm.envOr("DEFAULT_MODERATOR", msg.sender);

        // Optional comma-separated allowlist for the factory's stake-token gate. If unset,
        // the factory ships with an empty allowlist and createPool reverts until the owner
        // runs setStakeTokenAllowed post-deploy. The smoke test seeds this with the test
        // ERC-20 when CREATE_TEST_CONFIDENCE_POOL is set.
        address[] memory initialStakeTokens = vm.envOr("INITIAL_STAKE_TOKENS", ",", new address[](0));

        console.log("Deploying ConfidencePool stack...");
        console.log("Safe Harbor Registry:", safeHarborRegistry);
        console.log("Default Moderator:", defaultModerator);
        console.log("Initial stake tokens count:", initialStakeTokens.length);

        vm.startBroadcast();

        // 1. ConfidencePool implementation (non-upgradeable; clones target this)
        implementation = address(new ConfidencePool());
        console.log("ConfidencePool implementation deployed at:", implementation);

        // 2. ConfidencePoolFactory implementation
        ConfidencePoolFactory factoryImpl = new ConfidencePoolFactory();
        console.log("ConfidencePoolFactory implementation deployed at:", address(factoryImpl));

        // 3. ERC1967 proxy wrapping the factory, initialized with the safe-harbor registry,
        //    pool implementation, and default moderator.
        bytes memory initData =
            abi.encodeCall(ConfidencePoolFactory.initialize, (safeHarborRegistry, implementation, defaultModerator));
        factoryProxy = address(new ERC1967Proxy(address(factoryImpl), initData));
        console.log("ConfidencePoolFactory proxy deployed at:", factoryProxy);

        // 4. Seed stake-token allowlist if requested
        for (uint256 i; i < initialStakeTokens.length; ++i) {
            ConfidencePoolFactory(factoryProxy).setStakeTokenAllowed(initialStakeTokens[i], true);
            console.log("Allowlisted stake token:", initialStakeTokens[i]);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("ConfidencePool deployment complete.");
        console.log("CONFIDENCE_POOL_IMPLEMENTATION:", implementation);
        console.log("CONFIDENCE_POOL_FACTORY_ADDRESS:", factoryProxy);
    }
}
