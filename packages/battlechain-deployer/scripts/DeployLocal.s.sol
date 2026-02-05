// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { BattleChainSafeHarborRegistry } from "src/BattleChainSafeHarborRegistry.sol";
import { AgreementFactory } from "src/AgreementFactory.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployLocal - Deployment script for local zkSync node
/// @notice Uses zkSync's address derivation formula to pre-compute addresses
/// @dev Solves the circular dependency by pre-computing the Registry proxy address
///      using zkSync's CREATE formula: keccak256(CREATE_PREFIX ++ sender ++ nonce)[12:]
contract DeployLocal is Script {
    // Default zkSync local node rich wallet
    address public constant DEFAULT_OWNER = 0x36615Cf349d7F6344891B1e7CA7C72883F5dc049;

    // zkSync CREATE prefix = keccak256("zksyncCreate")
    bytes32 public constant ZKSYNC_CREATE_PREFIX = 0x63bae3a9951d38e8a3fbb7b70909afc1200610fc5bc55ade242f815974674f23;

    // zkSync NonceHolder system contract address
    address public constant NONCE_HOLDER = 0x0000000000000000000000000000000000008003;

    // Valid chains for BattleChain ecosystem
    string[] public validChains;

    address public registryImpl;
    address public registryProxy;
    address public factoryImpl;
    address public factoryProxy;

    function run() external {
        // Set up valid chains
        validChains = new string[](3);
        validChains[0] = "eip155:626"; // BattleChain Mainnet
        validChains[1] = "eip155:625"; // BattleChain Testnet
        validChains[2] = "eip155:624"; // BattleChain Devnet

        console.log("Deploying BattleChain Safe Harbor (Local Mode)...");
        console.log("Chain ID:", block.chainid);
        console.log("Owner:", DEFAULT_OWNER);

        vm.startBroadcast();

        // Get the current DEPLOYMENT nonce from zkSync's NonceHolder
        // On zkSync, deployment nonce is separate from transaction nonce
        // vm.getNonce returns transaction nonce, but we need deployment nonce
        uint256 startNonce = _getDeploymentNonce(msg.sender);
        console.log("Starting deployment nonce:", startNonce);

        // Deployment order:
        //   nonce+0: Registry Implementation
        //   nonce+1: Factory Implementation
        //   nonce+2: Factory Proxy
        //   nonce+3: Registry Proxy

        // Pre-compute the Registry Proxy address (will be deployed at deployment nonce+3)
        // Note: On zkSync local node, deployment nonce starts at 0 and increments per deployment
        address predictedRegistryProxy = _computeZkSyncCreateAddress(msg.sender, startNonce + 3);
        console.log("Predicted Registry Proxy address:", predictedRegistryProxy);

        // Step 1: Deploy Registry Implementation (nonce+0)
        registryImpl = address(new BattleChainSafeHarborRegistry());
        console.log("Registry Implementation deployed at:", registryImpl);

        // Step 2: Deploy Factory Implementation (nonce+1)
        factoryImpl = address(new AgreementFactory());
        console.log("AgreementFactory Implementation deployed at:", factoryImpl);

        // Step 3: Deploy Factory Proxy with PRE-COMPUTED Registry address (nonce+2)
        string memory battleChainCaip2 = "eip155:626"; // Default to mainnet CAIP-2 for local
        bytes memory factoryInitData = abi.encodeWithSelector(
            AgreementFactory.initialize.selector,
            DEFAULT_OWNER,
            predictedRegistryProxy, // Use pre-computed Registry address
            battleChainCaip2
        );
        factoryProxy = address(new ERC1967Proxy(factoryImpl, factoryInitData));
        console.log("AgreementFactory Proxy deployed at:", factoryProxy);

        // Step 4: Deploy Registry Proxy with actual Factory address (nonce+3)
        bytes memory registryInitData = abi.encodeWithSelector(
            BattleChainSafeHarborRegistry.initialize.selector,
            DEFAULT_OWNER,
            validChains,
            factoryProxy
        );
        registryProxy = address(new ERC1967Proxy(registryImpl, registryInitData));
        console.log("Registry Proxy deployed at:", registryProxy);

        // Verify the prediction was correct
        require(registryProxy == predictedRegistryProxy, "Registry proxy address mismatch!");

        vm.stopBroadcast();

        console.log("");
        console.log("Deployment Complete!");
        console.log("Registry Proxy:", registryProxy);
        console.log("AgreementFactory Proxy:", factoryProxy);
    }

    /// @notice Gets the deployment nonce from zkSync's NonceHolder system contract
    /// @dev On zkSync, deployment nonce is separate from transaction nonce
    /// @param account The account to get the deployment nonce for
    /// @return The current deployment nonce
    function _getDeploymentNonce(address account) internal view returns (uint256) {
        (bool success, bytes memory data) = NONCE_HOLDER.staticcall(
            abi.encodeWithSignature("getDeploymentNonce(address)", account)
        );
        require(success, "Failed to get deployment nonce from NonceHolder");
        return abi.decode(data, (uint256));
    }

    /// @notice Computes zkSync CREATE address using their formula
    /// @dev Formula: address = keccak256(CREATE_PREFIX ++ zeroPad(sender, 32) ++ zeroPad(nonce, 32))[12:]
    /// @param deployer The address deploying the contract
    /// @param nonce The deployment nonce
    /// @return The predicted contract address
    function _computeZkSyncCreateAddress(address deployer, uint256 nonce) internal pure returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                ZKSYNC_CREATE_PREFIX,
                bytes32(uint256(uint160(deployer))),
                bytes32(nonce)
            )
        );
        return address(uint160(uint256(hash)));
    }
}
