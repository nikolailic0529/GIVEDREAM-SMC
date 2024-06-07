import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import * as fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV3R2 } from "ton";
import { Address } from 'ton-core';
import Counter from "./src/contracts/Counter.js"; // this is the interface class from step 7
import NominatorPool from "./src/contracts/NominatorPool.js";

async function deploy() {
  // initialize ton rpc client on testnet
  // const endpoint = await getHttpEndpoint({ network: "testnet" });
  // const client = new TonClient({ endpoint });
  const client = new TonClient({ endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC", apiKey: "f20ff0043ded8c132d0b4b870e678b4bbab3940788cbb8c8762491935cf3a460" });

  // open wallet v4 (notice the correct wallet version here)
  const mnemonic = process.env.MNEMONIC;
  const key = await mnemonicToWalletKey(mnemonic!.split(" "));
  const wallet = WalletContractV3R2.create({ publicKey: key.publicKey, workchain: 0 });
  console.log('wallet address:', wallet.address.toString());
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("wallet is not deployed");
  }

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);

  // ============= Counter
  // ===================================
  // prepare Counter's initial code and data cells for deployment
  const counterCode = Cell.fromBoc(fs.readFileSync("./contracts/counter.cell"))[0];
  const initialCounterValue = 975; //Date.now(); // to avoid collisions use current number of milliseconds since epoch as initial value
  const counter = Counter.createForDeploy(counterCode, initialCounterValue);
  
  // exit if contract is already deployed
  console.log("counter contract address:", counter.address.toString());
  if (await client.isContractDeployed(counter.address)) {
    console.log("Counter already deployed");
  } else {
    // send the deploy transaction
    const counterContract = client.open(counter);
    await counterContract.sendDeploy(walletSender);
  
    // wait until confirmed
    const seqno = await walletContract.getSeqno();
    let currentSeqno = seqno;
    while (currentSeqno == seqno) {
      //console.log("waiting for deploy transaction to confirm...");
      await sleep(1500);
      currentSeqno = await walletContract.getSeqno();
    }
    console.log("deploy transaction confirmed!");
  }

  // =========== Nominator Pool
  // =======================================
  // prepare Noimiator Pool's initial code and data cells for deployment
  const nominatorPoolCode = Cell.fromBoc(fs.readFileSync("./contracts/nominator-pool.cell"))[0];
  const owner: Address = Address.parse("EQBSfMVLzqiVe5FvMIAKHSVUzFDKOZY-tf8eNye_m9-kcNeg");
  const nominatorPool = NominatorPool.createForDeploy(nominatorPoolCode, owner);
  
  // exit if contract is already deployed
  console.log("nominator pool contract address:", nominatorPool.address.toString());
  if (await client.isContractDeployed(nominatorPool.address)) {
    return console.log("Nominator Pool already deployed");
  } else {
      // send the deploy transaction
      const nominatorPoolContract = client.open(nominatorPool);
      await nominatorPoolContract.sendDeploy(walletSender);
    
      // wait until confirmed
      const seqno = await walletContract.getSeqno();
      let currentSeqno = seqno;
      while (currentSeqno == seqno) {
        //console.log("waiting for deploy transaction to confirm...");
        await sleep(1500);
        currentSeqno = await walletContract.getSeqno();
      }
      console.log("deploy transaction confirmed!");
  }
}

deploy();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}