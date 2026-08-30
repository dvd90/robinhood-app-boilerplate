# Tutorial: what you built, in plain words

This page is for you if you have this repository in front of you, you are not from the crypto
world, and you want to understand what it does and what you can make with it. It uses everyday
comparisons, small numbers and pictures. There are no commands here — when you want to run
things, [Getting started](getting-started.md) has them, step by step.

The whole project on one picture. Read it top to bottom, then keep going: every box gets its
own section below.

```
 Alice ─pays─▶ ┌────────────────┐ ─price─▶ your treasury
 Bob   ─pays─▶ │ Membership NFT │          (a normal wallet;
 Carol ─pays─▶ │ cards #1 #2 #3 │           never the vault)
               └──┬────┬────┬───┘
                  │    │    │      every card owns a wallet
               ┌──▼─┐┌─▼──┐┌▼───┐
               │ w1 ││ w2 ││ w3 │ ◀── claim() pays shares here
               └────┘└────┘└────┘
                        ▲
 revenue ─deposit─▶ ┌───┴────────┐ "shares for #N?" ┌────────────┐
 (any ERC-20)       │   Vault    │ ───────────────▶ │ Weight rule│
                    │  (splits)  │ ◀───── "4" ───── │ (your code)│
                    └────────────┘                  └────────────┘
```

In one sentence: **people buy a numbered membership card; each card comes with its own wallet;
revenue you deposit into a vault is split across the cards by a rule you write, and paid into
those wallets; sell the card and its wallet goes with it.**

## Four words you need first

**Blockchain.** A shared notebook that thousands of computers keep identical copies of. Anyone
can read it. Anyone can add a line, for a small fee. Nobody can erase or edit a line once it is
written. Robinhood Chain (chain id 4663) is one such notebook; this project is written for it.

**Wallet.** A keychain. It has an *address* — a long number that works like a mailbox number,
public, safe to share — and a *private key*, the only thing that lets you send from that
address. Lose the key and nobody, including the people who wrote the software, can help.

**Token.** An entry in the notebook saying who owns what. Two kinds matter here. *Coins* are
interchangeable, like euros: 5 of them are worth exactly as much as any other 5. Their standard
is called **ERC-20**; tokenised stocks on Robinhood Chain are ERC-20 tokens. *Unique items* are
numbered, like concert tickets: #7 is not #8. Their standard is called **ERC-721**, and each one
is an **NFT**.

One more thing counts as money but is not a token: the notebook's own built-in coin (ETH), which
every writing fee is paid in. The docs call it the **native coin**. No contract issues it, so it is
not ERC-20. In this project it is what members pay the mint price with; the revenue that gets
split is always an ERC-20 token — two different currencies, kept apart on purpose.

**Smart contract.** A vending machine placed inside the notebook. It can hold money and tokens,
and it follows rules that were fixed the moment it was placed — the owner cannot quietly change
them later. You use it by *calling a function*: press a button, the machine does exactly what its
rules say.

This project is three vending machines plus one small rule — itself a tiny contract — that you
either pick from the ready-made ones or write yourself.

## The membership card

The first machine is **MembershipNFT**. It sells numbered cards: #1, #2, #3, up to a maximum
you set when you deploy it. Anyone can buy one by paying the **mint price** ("minting" is the
crypto word for creating a token). Pay too much and the difference comes straight back.

Where does the money go? To your **treasury** — a normal wallet you name when you deploy. It
does **not** go into the vault. That is a deliberate, tested decision: if entry money flowed into
the vault, early members would be paid with later members' entry fees, which is a very different
(and much worse) product than a revenue share. See [the two pipes](#the-vault-deposit-split-claim)
below.

A card is a normal NFT. Its holder can sell it or give it away like any collectible. Cards are
never destroyed, so if 40 have been sold the ids are exactly 1 to 40. One small extra: each card
remembers *when its current holder got it* (`heldSince`). Sell the card and that clock resets
for the buyer — one of the ready-made rules uses it.

## The card's own wallet

Here is the part with no everyday equivalent, so take it slowly. When a card is minted, the
machine also creates a **second wallet that belongs to the card itself** — not to the buyer, to
the card. It is not a keychain like yours — it has no private key at all. It is a tiny vending
machine of its own whose single rule is "obey whoever holds the card". The standard is called
**ERC-6551**; the docs call it a **token-bound account** or "the card's wallet".

```
 ┌──────────────────┐ "who holds card #3?" ┌──────────────────┐
 │ card #3's wallet │ ───────────────────▶ │  Membership NFT  │
 │ (address fixed   │ ◀────── "Carol" ──── │ ownerOf(3)=Carol │
 │  at mint time)   │                      └──────────────────┘
 └──────────────────┘
   nothing is stored: the wallet asks every time.

 Carol sells #3 to Dave ─▶ ownerOf(3)=Dave ─▶ Dave controls the
 wallet and everything already inside it.
```

Three things to know about it:

- **Its address is fixed forever.** It is computed from the card's number, so it can be known
  even before the card is minted and it never changes.
- **It stores no owner.** Whenever someone tries to spend from it, the wallet asks the card
  machine "who holds card #3 right now?" and obeys that person. There is no "transfer the wallet"
  step, because there is nothing to transfer: **sell the card and the wallet — with everything
  inside it — follows automatically.**
- **Nobody else can reach in.** Not you as the project owner, not the factory, not the vault.
  To move tokens *out* of a card's wallet — say, into your own — the holder sends the card's
  wallet one instruction from the wallet that holds the card: "send X of token T to address Y"
  (the standard calls this `execute`). The optional website that ships with the project shows each
  card's wallet balance and lets holders claim; it has no button for this last step yet, so today
  it is done with a short script or any wallet app that understands ERC-6551.

Why bother? Because it makes the whole membership *one thing*. The card, its history, and every
token it has ever earned travel together. A buyer on a marketplace gets the card and its balance;
a seller cannot keep the earnings and sell an empty card.

## The vault: deposit, split, claim

The second machine is **RevenueVault**. It holds revenue and splits it across the cards.

Money is counted into the vault in exactly one way: someone calls **deposit** with an ERC-20
token and an amount, on purpose. The native coin cannot be sent to the vault at all — the
transaction fails. So the vault can only ever hand out what somebody explicitly put in.

> **Careful.** Use the deposit call, never a plain transfer to the vault's address. Tokens sent
> directly are accepted by the token but the vault does not count them, and there is no function
> to recover them — they are stranded.

```
   MINT MONEY (native coin)          REVENUE (ERC-20 tokens)
   a member pays the price           whoever earned it deposits it
            │                                   │
            ▼                                   ▼
     your treasury                          the vault
   (the vault never sees             (split by weight, paid only
    a single unit of it)              into card wallets)

   The two pipes never cross. A test fails if anyone connects them.
```

From deposit to a card's wallet there are three moves. **Anyone** can make each of them — not
just you — because none of them lets the caller choose where money goes.

```
 (1) depositRevenue(token, 100)   anyone who holds the tokens
             ▼
 ┌────────────────────────┐
 │ distributable = 100    │      "waiting to be split"
 └───────────┬────────────┘
             │  (2) distribute(token)   anyone; bookkeeping only —
             ▼                          not a single token moves
 ┌────────────────────────┐
 │ claimable  #1 → 14     │
 │            #2 → 28     │      remainder 1 goes back up
 │            #3 → 57     │ ───▶ into distributable (next round)
 └───────────┬────────────┘
             │  (3) claim(token, [1,2,3])   anyone; tokens move now
             ▼
   wallet #1 +14      wallet #2 +28      wallet #3 +57

   (weights 1 : 2 : 4 — explained in the next section)
```

1. **Deposit.** Tokens come in and are counted as *waiting to be split*.
2. **Distribute.** The vault asks the weight rule how many shares each card gets (next section),
   divides the waiting amount in proportion, and *writes down* each card's share. No tokens move
   yet. One distribute call is what the docs mean by a **round**.
3. **Claim.** For each card named in the call, the written-down share is sent to *that card's
   wallet*. This is when tokens actually move.

Why write it down first and pay later? Because the tokens this project is built for —
tokenised stocks — often refuse to be sent to certain addresses. If distribute paid everyone
directly, one refused wallet would make the whole round fail for everybody. With pay-on-claim, a
refused card simply cannot claim *yet*; its share stays written down, and every other card claims
normally.

Two more details you will meet in the numbers:

- **Leftovers are never lost.** Splitting 100 three ways gives 33 each and 1 left over. That 1
  stays in *waiting* and joins the next round. It is never sent to the owner and never destroyed.
  The docs call it **dust**.
- **Each token is tracked separately.** Deposit stock token A and stock token B and the vault
  keeps two independent ledgers; each is distributed and claimed on its own.

## The weight rule

At distribute time the vault asks one question per card: **"how many shares does card #N get?"**
It adds up the answers and divides in proportion. The vault does not know *why* a card gets 4
shares and another gets 1 — the answering is done by a separate, tiny contract called the
**weight strategy**, and that is where all the game, loyalty or business logic lives.

```
 ┌─────────┐                                ┌─────────────────────┐
 │  Vault  │ ── weightOf(nft, #1)? ───────▶ │ Weight rule         │
 │         │ ◀──────────────────── 1 ────── │                     │
 │ knows   │ ── weightOf(nft, #2)? ───────▶ │ Equal   → 1         │
 │ nothing │ ◀──────────────────── 2 ────── │ Tenure  → 1+periods │
 │ about   │ ── weightOf(nft, #3)? ───────▶ │ Level   → 1+level   │
 │ games   │ ◀──────────────────── 4 ────── │ Yours   → ...       │
 └─────────┘                                └─────────────────────┘
        total 7 → #1 gets 1/7, #2 gets 2/7, #3 gets 4/7
```

Three rules already exist:

| Rule | Answer to "how many shares?" | Where |
| --- | --- | --- |
| **Equal** | 1 for every card — everyone earns the same | ships, the default |
| **Tenure** | 1 + the number of full periods the *current* holder has held the card; a buyer starts again at 1 | ships, as a worked reference |
| **Level** | 1 + the card's level, which the project owner raises (think: a game server) | the [Arcade Guild example](guides/example-arcade-guild.md) |

An answer of **0** means "no share this round" — useful for "suspended" or "not checked in this
season". If *every* card answers 0, nothing is written down and the deposit simply waits for a
later round.

The rule really is small. This is the heart of the Level rule, and the only code on this page —
the rest of that contract is a table of levels and a `setLevel` button only the rule's owner can
press:

```solidity
function weightOf(address, uint256 tokenId) external view returns (uint256) {
    return 1 + level[tokenId]; // level 3 earns 4× what level 0 earns
}
```

Keep one consequence in mind for later: **whoever controls the rule's inputs controls the
split.** If you can raise a card's level, you can raise its share.

## The factory

The third machine is the **Factory**. You call it once, with a name and a short symbol (a
ticker-style abbreviation such as ARCD), a mint price, a maximum number of cards, a treasury address and the weight rule to use. In one transaction it
stamps out a fresh card collection and a fresh vault, wires them to each other, and makes *you*
the owner of both.

```
   Factory.deploy(salt, {name, price, supply, treasury, rule})
                                  │
              one transaction     │    you become owner of both
             ┌────────────────────┴─────────────────────┐
             ▼                                          ▼
   ┌──────────────────┐     wired together     ┌──────────────────┐
   │  Membership NFT  │ ◀───────────────────▶  │      Vault       │
   │  "Arcade Guild"  │                        │ rule: LevelWeight│
   └──────────────────┘                        └──────────────────┘

   Same factory, another salt → a second, fully separate project.
```

The "salt" is just a label you choose. The addresses of the two new machines are computed from
your address and that label, so they can be predicted before you deploy; using the same label
twice fails; using a different label gives you a second, fully separate project — same code, its
own members, its own money. The factory keeps no power over anything it stamps out.

Nothing the factory creates can be upgraded, paused or replaced afterwards. That sounds like a
limitation; it is the point. A member can read the rules once and know they will still be the
rules next year.

## Worked example: three members, 100 tokens

A guild called "Arcade Guild", mint price 0.01 ETH (the native coin — a different currency from
the revenue token below, which is why it never appears in the vault's books), weight rule
**1 + level**. The revenue numbers are whole tokens so you can follow along; real tokens have 18
decimal places (see the note at the end).

1. **Alice, Bob and Carol each mint a card** — #1, #2, #3 — paying 0.01 each. Your treasury
   receives 0.03. Three card wallets now exist, all empty. The vault has seen nothing.
2. **You set levels**: Alice 0, Bob 1, Carol 3. So the weights are 1, 2 and 4 — total 7.
3. **Somebody deposits 100 tokens** into the vault. Waiting: 100.
4. **Anyone calls distribute.** 100 × 1/7 = 14.28…, 100 × 2/7 = 28.57…, 100 × 4/7 = 57.14…
   Shares are always rounded *down*: 14, 28, 57. That is 99 written down; the leftover 1 stays
   waiting.
5. **Anyone calls claim for cards 1, 2, 3.** Wallet #1 receives 14, wallet #2 receives 28,
   wallet #3 receives 57.
6. **Somebody deposits 55 more.** It joins the leftover 1: waiting is 56.
7. **Distribute again.** 56 divides by 7 exactly: 8, 16, 32. Leftover 0.
8. **Claim again.** The card wallets now hold **22, 44 and 89**.

| Step | Waiting in vault | Written down #1 / #2 / #3 | Card wallets #1 / #2 / #3 | Treasury |
| --- | --- | --- | --- | --- |
| 3 mints at 0.01 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | +0.03 |
| deposit 100 | 100 | 0 / 0 / 0 | 0 / 0 / 0 | |
| distribute | **1** | 14 / 28 / 57 | 0 / 0 / 0 | |
| claim [1, 2, 3] | 1 | 0 / 0 / 0 | 14 / 28 / 57 | |
| deposit 55 | 56 | 0 / 0 / 0 | 14 / 28 / 57 | |
| distribute | **0** | 8 / 16 / 32 | 14 / 28 / 57 | |
| claim [1, 2, 3] | 0 | 0 / 0 / 0 | **22 / 44 / 89** | |

Check the books: 22 + 44 + 89 = 155 = 100 + 55. Nothing appeared, nothing vanished. That is not
luck — an automated test runs hundreds of random mint / sell / deposit / distribute / claim
sequences and fails if the books ever stop balancing. (With the default Equal rule the same 100
would split 33 / 33 / 33 with 1 carried; the test suite checks exactly those numbers.)

Three twists, because they are the questions people ask next:

**Carol sells card #3 to Dave between distribute and claim.** Claim pays *card #3's wallet*,
and Dave now controls it — so Dave gets the 57. Pending shares travel with the card. That is on
purpose: what you are selling is the card *and* its wallet, with whatever is inside or on its
way. Under the Level rule the level belongs to the card number, so #3 stays level 3 unless you
change it; under the Tenure rule Dave's clock starts at zero.

**The revenue token (the docs call it the *reward token*) refuses card #2's wallet.** A claim
call that includes card 2 fails as a whole, so claim for cards 1 and 3 in a call that leaves #2
out — that works. The 28 stays written down for #2 until the refusal is lifted. Nobody loses
anything.

**A card's weight is 0.** Say the rule answers 0 for Alice this round. Bob and Carol split the
100 by 2 : 4 — 33 and 66 — and 1 is carried. If everyone answers 0, nothing is written down and
the 100 waits.

> **Real numbers.** Tokens count in units of 10<sup>-18</sup>, so "100 tokens" is a 1 followed by
> 20 zeros in units, and the carried leftover is always fewer units than the total number of shares
> in the round — invisible in practice, but still never lost.

## What the owner can and cannot do

There are three owner roles. They usually start as the same person (you, the deployer), but they
are separate and can be handed over separately.

**Owner of the card collection**

| Can | Cannot |
| --- | --- |
| change the mint price for *future* cards (publicly logged; the new price applies to everyone) | mint above the maximum, or on a private price — the only price is the public one |
| change the treasury address | touch any card's wallet or what is in it |
| hand over ownership (two-step: the new owner must accept) | destroy, freeze or move a member's card — no such button exists |

**Owner of the vault**

| Can | Cannot |
| --- | --- |
| swap the weight rule for another one (publicly logged) | withdraw anything — the only way out is claim, into card wallets |
| therefore change how *future* rounds are split | change shares already written down |
| give up ownership for good, freezing the rule forever | make a deposit disappear or pause claims |

**Owner of the weight rule** (only if your rule has settings — the Level rule does)

| Can | Cannot |
| --- | --- |
| set the inputs (levels, points, tiers…) | anything the vault owner cannot: no access to money |

So the one thing members must trust is: **whoever picks the rule picks the split.** If that
matters to your members, put the vault behind a multisig (several people must agree) or a
timelock (changes are announced before they apply) — both are standard tools. And notice what is
missing from every list: nobody — owner, factory, deployer — can upgrade a machine, drain the
vault, or reach into a card's wallet. The full tables, with the tests that enforce them, are in
[Economics & trust](economics.md#what-the-owner-can-and-cannot-do).

## What you can build with this

The machines stay the same; you change the rule, the price and the story. Nine shapes, each
with the rule it needs:

1. **Creator club.** Fans mint a card; every month you deposit a slice of sponsorship or merch
   income. *Rule: Equal — ships, nothing to write.*
2. **Arcade guild.** Your game server raises a player's level as they play; higher level, bigger
   share. *Rule: Level — the [example project](guides/example-arcade-guild.md), copy it.*
3. **Loyalty club.** The longer someone has held their card without selling, the bigger their
   share; buyers start over. *Rule: Tenure — ships, pick the period.*
4. **Shop membership sharing tokenised-stock rewards.** A business that holds tokenised stocks
   deposits whatever ERC-20 rewards those pay out; pay-on-claim copes with transfer restrictions.
   *Rule: Equal or Tenure. Read the [legal note](economics.md#legal-note) first.*
5. **Co-op or collective treasury.** A multisig owns the vault and awards contribution points;
   earnings split by points. *Rule: an owner-set points table — the Level rule with a rename.*
6. **Founders' bonus.** The first 50 cards count double, with no settings at all (and, if the
   vault owner renounces, unchangeable).
   *Rule: "if the card number is 50 or below, 2, otherwise 1" — three lines, no owner.*
7. **Bronze / silver / gold tiers.** Tiers assigned after mint by the owner, worth 1 / 3 / 10.
   *Rule: an owner-set tier table.*
8. **Season pass.** Only members who checked in this season take part; everyone else answers 0
   and is skipped that round, no money lost. *Rule: custom, built on "0 means excluded".*
9. **Collaborator royalty pool.** A book's or album's on-chain royalties are deposited; shares
   are set once, then the vault owner gives up ownership so the split can never change.
   *Rule: a fixed table, then renounce.*

Every one of these is either "use a rule that ships" or "write one small function, test it, pass
its address to the factory".
[Weight strategies](guides/weight-strategies.md) is the how-to.

## Before it goes real

Four things that are true today and matter the moment real money is involved:

- **The chain addresses are not yet confirmed.** The project talks to two helper contracts on
  Robinhood Chain (the ones that create card wallets). Their addresses in this repo come from
  notes, not from official documentation, and are tagged `VERIFY`. An address with nothing
  behind it is rejected at deploy time; an address that points at the *wrong* contract is not —
  it silently creates wallets nobody controls. Confirm them first:
  [Deploying](guides/deploying.md).
- **Distribute reads every card in one go.** Fine for hundreds of cards, fine for a few
  thousand; beyond that it needs to be done in pages, and the code marks the spot.
- **The website shows no dollar value on purpose.** It shows token balances. A price feed is
  wired in only once its official address is confirmed — never a hardcoded number.
- **The legal question is yours, not the code's.** Tokenised stocks are restricted securities,
  and a card that entitles its holder to a share of revenue may itself be one, depending on your
  country and your users. This documentation is not legal advice; get counsel before a real
  deploy. [Economics & trust](economics.md#legal-note) says the same, more formally.

## Glossary

| Word | Plain meaning |
| --- | --- |
| Blockchain | A shared, append-only notebook kept identical on thousands of computers |
| Wallet / address | A keychain; the address is its public mailbox number |
| Private key | The one secret that lets a wallet send; unrecoverable if lost |
| Transaction / gas | One write to the notebook, and the small fee it costs |
| Token | A notebook entry saying who owns what |
| ERC-20 | The standard for interchangeable coins (tokenised stocks are ERC-20) |
| NFT / ERC-721 | The standard for unique numbered items; here, the membership card |
| Mint | Create a new token; here, buy a card |
| Max supply | The most cards that can ever exist |
| Treasury | The normal wallet that receives mint money |
| Smart contract | A vending machine in the notebook: holds funds, follows fixed rules |
| Token-bound account (TBA, ERC-6551) | The card's own wallet; obeys whoever holds the card |
| Registry | The public helper contract that creates card wallets at fixed addresses |
| Vault | The contract that receives deposited revenue and splits it |
| Deposit / distribute / claim | Tokens in → shares written down → tokens paid to card wallets |
| Round | One distribute call |
| Weight / strategy | A card's number of shares, and the small contract that answers it |
| Dust | The rounding leftover of a split; carried to the next round, never lost |
| Factory / clone | The contract that stamps out a card collection + vault pair; each copy is a clone |
| Owner (two-step) | Who can change settings; handing over needs the new owner to accept |
| Multisig / timelock | An owner that is several people, or one whose changes are announced first |
| VERIFY tag | A comment marking an address that is not yet confirmed against official sources |
| Decimals | Tokens count in 10<sup>-18</sup> units; "1 token" is written as 1 followed by 18 zeros |
| Reward token | Any ERC-20 that is deposited as revenue and split by the vault |
| Foundry / anvil | The developer toolkit, and its throwaway local blockchain for rehearsals |

## Where to go next

- [Getting started](getting-started.md) — do it: install, scaffold, test, run locally, deploy.
- [Weight strategies](guides/weight-strategies.md) — write the rule, with tests.
- [Example: Arcade Guild](guides/example-arcade-guild.md) — a finished project to copy.
- [Economics & trust](economics.md) — the guarantees, and the tests behind each.
- [Architecture](architecture.md) — how it works, for engineers.
- [Contracts reference](reference/contracts.md) — every function, event and error.
- [Deploying](guides/deploying.md) — the checklist before Robinhood Chain.
- [Agent guide](../CLAUDE.md) — if an AI agent will help you change the code.
