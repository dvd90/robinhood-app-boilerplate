"use client";

import { formatUnits, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, nftAbi } from "@/lib/abi";
import { NFT_ADDRESS, REWARD_TOKENS } from "@/lib/robinhood";

const nft = { address: NFT_ADDRESS, abi: nftAbi } as const;

/// Tokens owned by `owner`, each with its 6551 account and the reward balances sitting in it.
// ponytail: scans ownerOf(1..totalSupply) on every render; index Minted/Transfer events if maxSupply grows large.
export function Holdings({ owner }: { owner?: Address }) {
  const { data: supply } = useReadContract({ ...nft, functionName: "totalSupply" });
  const ids = Array.from({ length: Number(supply ?? 0n) }, (_, i) => BigInt(i + 1));

  const { data: owners } = useReadContracts({
    contracts: ids.map((id) => ({ ...nft, functionName: "ownerOf", args: [id] })),
    query: { enabled: ids.length > 0 },
  });
  const owned = ids.filter((_, i) => (owners?.[i]?.result as Address | undefined)?.toLowerCase() === owner?.toLowerCase());

  const { data: tbas } = useReadContracts({
    contracts: owned.map((id) => ({ ...nft, functionName: "tokenBoundAccount", args: [id] })),
    query: { enabled: owned.length > 0 },
  });
  const tbaList = (tbas ?? []).map((r) => r.result as Address | undefined).filter((a): a is Address => !!a);

  const { data: meta } = useReadContracts({
    contracts: REWARD_TOKENS.flatMap((token) => [
      { address: token, abi: erc20Abi, functionName: "symbol" } as const,
      { address: token, abi: erc20Abi, functionName: "decimals" } as const,
    ]),
    query: { enabled: REWARD_TOKENS.length > 0 },
  });
  const { data: balances } = useReadContracts({
    contracts: tbaList.flatMap((tba) =>
      REWARD_TOKENS.map((token) => ({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [tba] }) as const),
    ),
    query: { enabled: tbaList.length > 0 && REWARD_TOKENS.length > 0 },
  });

  if (!owner) return null;

  return (
    <section>
      <h2>Your memberships</h2>
      {owned.length === 0 && <p className="muted">None yet.</p>}
      {REWARD_TOKENS.length === 0 && (
        <p className="muted">
          Set <code>NEXT_PUBLIC_REWARD_TOKENS</code> to show reward balances (VERIFY addresses first).
        </p>
      )}
      <table>
        <tbody>
          {owned.map((id, i) => (
            <tr key={id.toString()}>
              <td>#{id.toString()}</td>
              <td>
                <code>{tbaList[i] ?? "…"}</code>
              </td>
              <td>
                {REWARD_TOKENS.map((token, t) => {
                  const symbol = meta?.[t * 2]?.result as string | undefined;
                  const decimals = meta?.[t * 2 + 1]?.result as number | undefined;
                  const bal = balances?.[i * REWARD_TOKENS.length + t]?.result;
                  return (
                    <div key={token}>
                      {bal !== undefined && decimals !== undefined ? formatUnits(bal, decimals) : "…"} {symbol ?? ""}
                    </div>
                  );
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* VERIFY: value in USD via the official Robinhood Chain price feed once its address is confirmed. */}
    </section>
  );
}
