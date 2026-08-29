# Example: Arcade Guild

A complete project built **on** the boilerplate without copying it. Members mint a guild card; the
guild owner (think: the game server) raises a member's *level*; revenue deposited into the vault is
split by `weight = 1 + level`. The NFT, the vault and the factory are the boilerplate's own contracts,
imported straight from `contracts/`. The only new contract is the strategy.

It lives at [`examples/arcade-guild/`](../../examples/arcade-guild/) and is pruned from scaffolded
projects — it is documentation you can run.

## Run it

```bash
cd examples/arcade-guild
forge test
```

You should see:

```
Ran 3 tests for test/LevelWeightStrategy.t.sol:LevelWeightStrategyTest
[PASS] testFuzz_WeightIsOnePlusLevel(uint256,uint256) (runs: 512, …)
[PASS] test_DistributePaysByLevel() (gas: 980691)
[PASS] test_OnlyOwnerSetsLevel() (gas: 36945)
Suite result: ok. 3 passed; 0 failed; 0 skipped
```

Deploy it to a local chain and read the name back:

```bash
anvil &
forge script script/Deploy.s.sol --sig "runArcade()" \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil account 0
cast call $(node -e 'console.log(require("./deployments/31337.json").nft)') "name()(string)" --rpc-url http://127.0.0.1:8545
# "Arcade Guild"
```

## Every file, explained

```
examples/arcade-guild/
├── foundry.toml                    # libs → ../../contracts/lib, allow_paths → ../../contracts
├── remappings.txt                  # robinhood/, robinhood-test/, robinhood-script/ → the parent
├── src/LevelWeightStrategy.sol     # the game
├── test/LevelWeightStrategy.t.sol  # reuses the parent's Fixture
├── script/Deploy.s.sol             # inherits the parent's Deploy
└── README.md
```

### `src/LevelWeightStrategy.sol` — the game

```solidity
contract LevelWeightStrategy is IWeightStrategy, Ownable {
    event LevelSet(address indexed nft, uint256 indexed tokenId, uint256 level);

    mapping(address nft => mapping(uint256 tokenId => uint256)) public levelOf;

    constructor(address owner_) Ownable(owner_) {}

    function setLevel(address nft, uint256 tokenId, uint256 level) external onlyOwner {
        levelOf[nft][tokenId] = level;
        emit LevelSet(nft, tokenId, level);
    }

    function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
        return 1 + levelOf[nft][tokenId];
    }
}
```

Three decisions worth copying:

- **Keyed by `(nft, tokenId)`**, so one strategy can serve several clones from the same factory.
- **`onlyOwner` on the setter.** Levels are money: whoever sets them sets the split. The event is
  what an indexer or the front end reads.
- **`weightOf` is one mapping read** — it runs for every card, every distribution.

### `test/LevelWeightStrategy.t.sol` — reusing the fixture

```solidity
import {Fixture} from "robinhood-test/utils/Fixture.sol";

contract LevelWeightStrategyTest is Fixture {
    function setUp() public override {
        super.setUp();                                   // chain 4663, registry, NFT + vault clones
        levels = new LevelWeightStrategy(address(this));
        vault.setStrategy(address(levels));              // the test contract owns the vault
    }

    function test_DistributePaysByLevel() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        levels.setLevel(address(nft), a, 3);             // weight 4; bob stays weight 1
        _deposit(token, 500);
        vault.distribute(address(token));
        _claimAll(address(token));
        assertEq(token.balanceOf(_tba(a)), 400);
        assertEq(token.balanceOf(_tba(b)), 100);
    }
}
```

`Fixture` is the boilerplate's own test harness (`contracts/test/utils/Fixture.sol`): it etches the
ERC-6551 registry at the canonical address, clones one NFT + vault pair, and provides `_mint`,
`_deposit`, `_claimAll`, `_tba`. Your project's tests get all of it for one import.

### `script/Deploy.s.sol` — reusing the deploy

```solidity
contract DeployArcadeGuild is Deploy {
    function runArcade() external {
        …
        (Factory factory,) = deployCore(registry, accountImpl);   // impls + Factory, from the parent
        LevelWeightStrategy levels = new LevelWeightStrategy(msg.sender);
        (address nft, address vault) = factory.deploy(
            bytes32("arcade-guild"),
            Factory.Params({ name: "Arcade Guild", symbol: "ARCD", treasury: msg.sender,
                             mintPrice: 0.01 ether, maxSupply: 1000, strategy: address(levels) })
        );
        …
    }
}
```

It *inherits* `Deploy` rather than instantiating it: under `--broadcast` the `CREATE`s must originate
from the script contract to be recorded, and `Deploy.run()` is `external` and not `virtual`, hence the
new entry point and `--sig "runArcade()"`. It writes its own `deployments/<chainId>.json` inside the
example directory (`vm.createDir` first — `writeJson` does not create directories).

### `foundry.toml` + `remappings.txt` — the plumbing

```toml
libs = ["../../contracts/lib"]
allow_paths = ["../../contracts"]   # solc may read the parent's src/test/script
```

```
robinhood/=../../contracts/src/
robinhood-test/=../../contracts/test/
robinhood-script/=../../contracts/script/
@openzeppelin/contracts/=../../contracts/lib/openzeppelin-contracts/contracts/   # pinned on purpose
```

`@openzeppelin/contracts/` is written out because `lib/reference` (the ERC-6551 reference
implementation) vendors an older OpenZeppelin that forge's auto-detection would otherwise pick up.
Only the example's own transitive closure is compiled; the parent's `out/` is untouched.

## Adapt it

- Replace `setLevel` with whatever your game emits — XP, wins, staked tokens, a signature from
  your server. Only `weightOf()` is read by the vault, and only at `distribute()` time.
- Keep the shape of the test: mint two members, make them differ, deposit a round number, assert
  the TBA balances. It fails loudly the moment the formula drifts.
- The owner controls levels, so the owner controls the split — see
  [what a malicious strategy can and cannot do](weight-strategies.md#what-a-malicious-strategy-can-and-cannot-do).
  A multisig owner is the usual answer.
- To turn this into *your* repo instead of an example: scaffold with `create-robinhood-app`, copy
  `src/LevelWeightStrategy.sol` into `contracts/src/strategies/`, the test into
  `contracts/test/strategies/`, change the imports to relative paths, and pass the strategy in
  `Deploy.s.sol`. The remappings exist only because this example lives outside `contracts/`.
