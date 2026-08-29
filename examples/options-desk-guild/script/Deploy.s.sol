// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC6551Registry} from "erc6551/ERC6551Registry.sol";
import {ERC6551Account} from "erc6551/examples/simple/ERC6551Account.sol";
import {Deploy} from "robinhood-script/Deploy.s.sol";
import {Constants} from "robinhood/Constants.sol";
import {Factory} from "robinhood/Factory.sol";
import {PositionWeightStrategy} from "../src/PositionWeightStrategy.sol";
import {MockOptionDesk} from "../test/mocks/MockOptionDesk.sol";

/// @notice Reuses the boilerplate's Deploy.deployCore (impls + Factory) and swaps in
///         PositionWeightStrategy. Inherits Deploy so the CREATEs run from this script contract.
///   OPTION_DESK=0x... forge script script/Deploy.s.sol --sig "runOptionsDesk()" --rpc-url robinhood --broadcast
contract DeployOptionsDeskGuild is Deploy {
    error DeskNotDeployed(address desk);

    function runOptionsDesk() external {
        address registry = vm.envOr("ERC6551_REGISTRY", Constants.ERC6551_REGISTRY);
        address accountImpl = vm.envOr("ERC6551_ACCOUNT_IMPL", Constants.ERC6551_ACCOUNT_IMPL);
        // VERIFY: no options desk is deployed on chain 4663 yet. Pass the real one (or your adapter
        //         over it) via OPTION_DESK once it exists and you have confirmed it on the explorer.
        address desk = vm.envOr("OPTION_DESK", address(0));

        vm.startBroadcast();
        if (block.chainid == ANVIL_CHAIN_ID) {
            if (registry.code.length == 0) registry = address(new ERC6551Registry());
            if (accountImpl.code.length == 0) accountImpl = address(new ERC6551Account());
            // Local demo only: stand up the test desk so the example is runnable end to end.
            if (desk.code.length == 0) desk = address(new MockOptionDesk());
        }
        if (registry.code.length == 0) revert RegistryNotDeployed(registry);
        if (desk.code.length == 0) revert DeskNotDeployed(desk);

        (Factory factory,) = deployCore(registry, accountImpl);
        PositionWeightStrategy positions = new PositionWeightStrategy(desk);
        (address nft, address vault) = factory.deploy(
            bytes32("options-desk-guild"),
            Factory.Params({
                name: "Options Desk Guild",
                symbol: "DESK",
                treasury: msg.sender,
                mintPrice: 0.01 ether,
                maxSupply: 1000,
                strategy: address(positions)
            })
        );
        vm.stopBroadcast();

        string memory j = "options-desk";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeAddress(j, "factory", address(factory));
        vm.serializeAddress(j, "desk", desk);
        vm.serializeAddress(j, "positionWeightStrategy", address(positions));
        vm.serializeAddress(j, "nft", nft);
        string memory out = vm.serializeAddress(j, "vault", vault);
        vm.createDir("deployments", true);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
