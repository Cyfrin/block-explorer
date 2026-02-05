// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { AttackRegistry } from "src/AttackRegistry.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployAttackRegistryLocal
/// @notice Local deployment script for AttackRegistry (no CreateX)
contract DeployAttackRegistryLocal is Script {
    // Default zkSync local node rich wallet
    address public constant DEFAULT_OWNER = 0x36615Cf349d7F6344891B1e7CA7C72883F5dc049;

    address public attackRegistryImpl;
    address public attackRegistryProxy;

    /// @notice Deploy AttackRegistry with safeHarborRegistry and agreementFactory addresses
    /// @param safeHarborRegistry The address of the SafeHarborRegistry (must be deployed first)
    /// @param agreementFactory The address of the AgreementFactory (must be deployed first)
    function run(address safeHarborRegistry, address agreementFactory) external {
        console.log("Deploying AttackRegistry (Local Mode)...");
        console.log("Chain ID:", block.chainid);
        console.log("Owner:", DEFAULT_OWNER);
        console.log("Safe Harbor Registry:", safeHarborRegistry);
        console.log("Agreement Factory:", agreementFactory);

        vm.startBroadcast();

        // Deploy AttackRegistry Implementation
        attackRegistryImpl = address(new AttackRegistry());
        console.log("AttackRegistry Implementation deployed at:", attackRegistryImpl);

        // Deploy AttackRegistry Proxy
        bytes memory initData = abi.encodeWithSelector(
            AttackRegistry.initialize.selector,
            DEFAULT_OWNER,           // owner
            DEFAULT_OWNER,           // registryModerator (same as owner for local)
            safeHarborRegistry,
            agreementFactory
        );
        attackRegistryProxy = address(new ERC1967Proxy(attackRegistryImpl, initData));
        console.log("AttackRegistry Proxy deployed at:", attackRegistryProxy);

        vm.stopBroadcast();

        console.log("");
        console.log("Deployment Complete!");
        console.log("AttackRegistry Proxy:", attackRegistryProxy);
    }
}
