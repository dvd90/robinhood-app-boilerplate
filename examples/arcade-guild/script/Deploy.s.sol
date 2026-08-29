// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC6551Registry} from "erc6551/ERC6551Registry.sol";
import {ERC6551Account} from "erc6551/examples/simple/ERC6551Account.sol";
import {Deploy} from "robinhood-script/Deploy.s.sol";
import {Constants} from "robinhood/Constants.sol";
import {Factory} from "robinhood/Factory.sol";
import {LevelWeightStrategy} from "../src/LevelWeightStrategy.sol";

/// @notice Reuses the boilerplate's Deploy.deployCore (impls + Factory) and swaps in LevelWeightStrategy.
///         Inherits Deploy so the CREATEs run from this script contract and get broadcast.
///   forge script script/Deploy.s.sol --sig "runArcade()" --rpc-url robinhood --broadcast
contract DeployArcadeGuild is Deploy {
    function runArcade() external {
        address registry = vm.envOr("ERC6551_REGISTRY", Constants.ERC6551_REGISTRY);
        address accountImpl = vm.envOr("ERC6551_ACCOUNT_IMPL", Constants.ERC6551_ACCOUNT_IMPL);

        vm.startBroadcast();
        if (block.chainid == ANVIL_CHAIN_ID) {
            if (registry.code.length == 0) registry = address(new ERC6551Registry());
            if (accountImpl.code.length == 0) accountImpl = address(new ERC6551Account());
        }
        if (registry.code.length == 0) revert RegistryNotDeployed(registry);

        (Factory factory,) = deployCore(registry, accountImpl);
        LevelWeightStrategy levels = new LevelWeightStrategy(msg.sender);
        (address nft, address vault) = factory.deploy(
            bytes32("arcade-guild"),
            Factory.Params({
                name: "Arcade Guild",
                symbol: "ARCD",
                treasury: msg.sender,
                mintPrice: 0.01 ether,
                maxSupply: 1000,
                strategy: address(levels)
            })
        );
        vm.stopBroadcast();

        string memory j = "arcade";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeAddress(j, "factory", address(factory));
        vm.serializeAddress(j, "levelWeightStrategy", address(levels));
        vm.serializeAddress(j, "nft", nft);
        string memory out = vm.serializeAddress(j, "vault", vault);
        vm.createDir("deployments", true);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
