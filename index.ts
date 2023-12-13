import {
  LightSmartContractAccount,
  getDefaultLightAccountFactoryAddress,
} from "@alchemy/aa-accounts";
import { AlchemyProvider } from "@alchemy/aa-alchemy";
import { LocalAccountSigner, type Hex, Address } from "@alchemy/aa-core";
import { sepolia } from "viem/chains";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import fs from "fs";
import jwt from "jsonwebtoken";

const chain = sepolia;

const web3auth = new Web3Auth({
  clientId:
    "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ", // Get your Client ID from the Web3Auth Dashboard
  web3AuthNetwork: "sapphire_mainnet",
  usePnPKey: false, // By default, this SDK returns CoreKitKey
});

const ethereumProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: {
      chainId: "0x5",
      rpcTarget: "https://rpc.ankr.com/eth_goerli",
      displayName: "goerli",
      blockExplorer: "https://goerli.etherscan.io/",
      ticker: "ETH",
      tickerName: "Ethereum",
    },
  },
});

web3auth.init(ethereumProvider);

var privateKey = fs.readFileSync("privateKey.pem");

var sub = Math.random().toString(36).substring(7);

var token = jwt.sign(
  {
    sub: sub,
    name: "Mohammad Yashovardhan Mishra",
    email: "devrel@web3auth.io",
    aud: "urn:api-web3auth-io",
    iss: "https://web3auth.io",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  },
  privateKey,
  { algorithm: "RS256", keyid: "2ma4enu1kdvw5bo9xsfpi3gcjzrt6q78yl0h" }
);

let eth_private_key;

const connect = async () => {
  const provider = await web3auth.connect({
    verifier: "web3auth-sfa-verifier", // replace with your verifier name
    verifierId: sub, // replace with your verifier id's value, for example, sub value of JWT Token, or email address.
    idToken: token, // replace with your newly created unused JWT Token.
  });
  eth_private_key = await provider?.request({
    method: "eth_private_key",
  });
  console.log("ETH PrivateKey: ", eth_private_key);
  const eth_address: any = await provider?.request({ method: "eth_accounts" });
  console.log("ETH Address: ", eth_address[0]);
  process.exit(0);
};
await connect();

// The private key of your EOA that will be the owner of Light Account
// Our recommendation is to store the private key in an environment variable
const PRIVATE_KEY = `0x${eth_private_key}` as Hex;
const owner = LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY);
console.log("Owner Address: ", await owner.getAddress()); // Log the owner address

// Create a provider to send user operations from your smart account
const provider = new AlchemyProvider({
  // get your Alchemy API key at https://dashboard.alchemy.com
  apiKey: "BdjUz_DXCVqlw7Xw2IxxxGFEER5qI87x",
  chain,
}).connect(
  (rpcClient) =>
    new LightSmartContractAccount({
      rpcClient,
      owner,
      chain,
      factoryAddress: getDefaultLightAccountFactoryAddress(chain),
    })
);

(async () => {
  // Fund your account address with ETH to send for the user operations
  // (e.g. Get Sepolia ETH at https://sepoliafaucet.com)
  console.log("Smart Account Address: ", await provider.getAddress()); // Log the smart account address

  const shahbazAddress =
    "0xeaA8Af602b2eDE45922818AE5f9f7FdE50cFa1A8" as Address;
  // Send a user operation from your smart account to Vitalik that does nothing
  const { hash: uoHash } = await provider.sendUserOperation({
    target: shahbazAddress, // The desired target contract address
    data: "0x", // The desired call data
    value: 0n, // (Optional) value to send the target contract address
  });

  console.log("UserOperation Hash: ", uoHash); // Log the user operation hash

  // Wait for the user operation to be mined
  const txHash = await provider.waitForUserOperationTransaction(uoHash);

  console.log("Transaction Hash: ", txHash); // Log the transaction hash
})();
