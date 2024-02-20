import mempoolJS from "@mempool/mempool.js";
import * as bitcoin from "bitcoinjs-lib";
import keys from "./keys.json" assert { type: "json" };
import * as tinysecp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";

async function main() {
  const ECPair = ECPairFactory(tinysecp);
  const vikas_address = keys.vikas;
  const vikas_privateKey = keys.vikas_pk;
  const testnet = bitcoin.networks.testnet;
  const vikasKeyPair = ECPair.fromWIF(vikas_privateKey, testnet);

  const amountToSend = 100;
  const {
    bitcoin: { addresses, transactions },
  } = mempoolJS({
    hostname: "mempool.space",
    network: "testnet",
  });

  const addressTxsUtxo = await addresses.getAddressTxsUtxo({
    address: vikas_address,
  });

  const utxo = addressTxsUtxo.map((e) => ({
    txId: e.txid,
    vout: e.vout,
    value: e.value,
  }));

  let accountVal = 0;

  const requiredUTXOs = [];

  for (const e of utxo) {
    accountVal += e.value;
    requiredUTXOs.push(e);
    // if (accountVal > amount) break;
  }

  const txObj = new bitcoin.Psbt({ network: bitcoin.networks.testnet });

  for await (let i of requiredUTXOs) {
    const voutIndex = i.vout;
    // console.log(i);
    const voutArray = await transactions.getTx({ txid: i.txId });

    const scriptPublicKey = voutArray.vout[voutIndex].scriptpubkey;
    txObj.addInput({
      hash: i.txId,
      index: i.vout,
      witnessUtxo: {
        script: Buffer.from(scriptPublicKey, "hex"),
        value: i.value,
      },
    });
  }

  const yash = "tb1q9cwthujqtjddj89q6f8ky9lec85z873t3msyn0";

  txObj.addOutput({
    address: yash,
    value: amountToSend,
  });

  txObj.signAllInputs(vikasKeyPair);
  txObj.finalizeAllInputs();

  const signed_tx = txObj.extractTransaction().toHex();
  console.log(signed_tx);

  const txId = await transactions.postTx({ signed_tx });
  console.log(txId, "tx id");
}

main();
