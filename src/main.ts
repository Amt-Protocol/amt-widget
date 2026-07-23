import {
  buildUniversalRouterBuy,
  buildUniversalRouterSell,
  buildUniversalRouterSellApprovals,
  discoverAMT,
  getUniversalRouterSellRequirements,
  quoteBurn,
  quoteMint,
} from "@amt-1/sdk";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
  type Address,
  type EIP1193Provider,
} from "viem";
import "./style.css";

const chain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
} as const;
const token = "0xbba658F4d68Ef5ad00fcF8FB3212547FFcF2f34d" as Address;
const publicClient = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });

async function main() {
const market = await discoverAMT(publicClient, token);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const connect = $<HTMLButtonElement>("connect");
const submit = $<HTMLButtonElement>("submit");
const amount = $<HTMLInputElement>("amount");
const quote = $("quote");
const status = $("status");
const buyTab = $<HTMLButtonElement>("buy-tab");
const sellTab = $<HTMLButtonElement>("sell-tab");
let side: "buy" | "sell" = "buy";
let account: Address | undefined;
let quotedOut = 0n;

$("symbol").textContent = market.symbol;
$("binding").textContent = market.bindingsValid ? "Canonical bindings verified" : market.errors.join(", ");

function injected(): EIP1193Provider {
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("No injected wallet found");
  return provider;
}

function setSide(next: "buy" | "sell") {
  side = next;
  buyTab.classList.toggle("active", side === "buy");
  sellTab.classList.toggle("active", side === "sell");
  $("amount-label").textContent = side === "buy" ? "You pay (ETH)" : `You sell (${market.symbol})`;
  amount.value = "";
  quote.textContent = "—";
  quotedOut = 0n;
}

buyTab.onclick = () => setSide("buy");
sellTab.onclick = () => setSide("sell");
connect.onclick = async () => {
  try {
    const provider = injected();
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1237" }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number }).code;
      if (code !== 4902) throw switchError;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x1237",
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [...chain.rpcUrls.default.http],
          blockExplorerUrls: ["https://explorer.mainnet.chain.robinhood.com"],
        }],
      });
    }
    const [selected] = await provider.request({ method: "eth_requestAccounts" }) as Address[];
    account = selected;
    connect.textContent = `${selected.slice(0, 6)}…${selected.slice(-4)}`;
    submit.disabled = false;
    submit.textContent = side === "buy" ? `Buy ${market.symbol}` : `Sell ${market.symbol}`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Wallet connection failed";
  }
};

amount.oninput = async () => {
  try {
    const value = parseEther(amount.value || "0");
    quotedOut = side === "buy"
      ? await quoteMint(publicClient, token, value)
      : await quoteBurn(publicClient, token, value);
    quote.textContent = side === "buy"
      ? `${formatEther(quotedOut)} ${market.symbol}`
      : `${formatEther(quotedOut)} ETH`;
  } catch {
    quotedOut = 0n;
    quote.textContent = "—";
  }
};

submit.onclick = async () => {
  if (!account || quotedOut === 0n) return;
  submit.disabled = true;
  try {
    const wallet = createWalletClient({ account, chain, transport: custom(injected()) });
    const input = parseEther(amount.value);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    if (side === "buy") {
      status.textContent = "Confirm the Universal Router buy…";
      const transaction = buildUniversalRouterBuy({
        market, reserveIn: input, minTokensOut: quotedOut * 995n / 1000n, deadline,
      });
      await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction(transaction) });
    } else {
      const requirements = await getUniversalRouterSellRequirements({
        client: publicClient, owner: account, token, tokensIn: input,
      });
      const approvals = buildUniversalRouterSellApprovals({
        token, expiration: Math.floor(Date.now() / 1000) + 86_400,
      });
      if (requirements.tokenApprovalRequired) {
        status.textContent = "Approve Permit2 in your wallet…";
        await publicClient.waitForTransactionReceipt({
          hash: await wallet.sendTransaction(approvals.tokenToPermit2),
        });
      }
      if (requirements.permit2ApprovalRequired) {
        status.textContent = "Approve the Universal Router in Permit2…";
        await publicClient.waitForTransactionReceipt({
          hash: await wallet.sendTransaction(approvals.permit2ToUniversalRouter),
        });
      }
      status.textContent = "Confirm the Universal Router sell…";
      const transaction = buildUniversalRouterSell({
        market, tokensIn: input, minReserveOut: quotedOut * 995n / 1000n, deadline,
      });
      await publicClient.waitForTransactionReceipt({ hash: await wallet.sendTransaction(transaction) });
    }
    status.textContent = "Transaction confirmed.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Transaction failed";
  } finally {
    submit.disabled = false;
  }
};
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "AMT market discovery failed";
  document.getElementById("status")!.textContent = message;
});
