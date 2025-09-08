import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import { logger } from './utils/logger.js';

// UTXO interface
interface UTXO {
    txid: string;
    vout: number;
    value: number;
}

// Fetch UTXOs function (from your original utils)
async function fetchUtxos(esploraApiUrl: string, address: string): Promise<UTXO[]> {
    const response = await axios.get(`${esploraApiUrl}/address/${address}/utxo`);
    return response.data;
}

// Broadcast transaction function (from your original utils)
async function broadcastTx(esploraApiUrl: string, txHex: string): Promise<string> {
    const response = await axios.post(`${esploraApiUrl}/tx`, txHex);
    return response.data;
}

// Get wallet balance function
async function getWalletBalance(
    wif: string,
    network: 'mainnet' | 'testnet' = 'testnet',
    esploraApiUrl: string = 'https://blockstream.info/testnet/api'
): Promise<{
    address: string;
    balance: number;
    utxos: UTXO[];
    totalUtxos: number;
}> {
    try {
        logger.info('Getting wallet balance...');

        // Initialize Bitcoin network and key pair
        const net = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        const ecPair = ECPairFactory(tinysecp);
        const keyPair = ecPair.fromWIF(wif);

        // Derive address from WIF (P2WPKH - native SegWit format)
        const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: net });
        if (!address) {
            throw new Error('Unable to derive address from WIF');
        }

        logger.info(`Checking balance for address: ${address}`);

        // Fetch UTXOs from Esplora API
        const utxos = await fetchUtxos(esploraApiUrl, address);

        // Calculate total balance
        const balance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);

        logger.info(`Balance: ${balance} sats (${(balance / 100000000).toFixed(8)} BTC)`);
        logger.info(`Total UTXOs: ${utxos.length}`);

        return {
            address: address,
            balance: balance,
            utxos: utxos,
            totalUtxos: utxos.length
        };

    } catch (error) {
        logger.error('Failed to get wallet balance:', error);
        throw error;
    }
}

function computeNetAmountForAddress(tx: any, address: string): number {
    try {
        const outputsToAddr = (tx?.vout || []).reduce((sum: number, o: any) => {
            const oAddr = o?.scriptpubkey_address;
            const val = typeof o?.value === 'number' ? o.value : 0;
            return sum + (oAddr === address ? val : 0);
        }, 0);

        const inputsFromAddr = (tx?.vin || []).reduce((sum: number, i: any) => {
            const prev = i?.prevout;
            const iAddr = prev?.scriptpubkey_address;
            const val = typeof prev?.value === 'number' ? prev.value : 0;
            return sum + (iAddr === address ? val : 0);
        }, 0);

        return outputsToAddr - inputsFromAddr;
    } catch {
        return 0;
    }
}

// Fetch all transactions for an address (includes mempool and full chain history via pagination)
async function fetchAllTransactions(
    esploraApiUrl: string,
    address: string,
    options: { maxPages?: number; perPageHint?: number } = {}
): Promise<{ mempool: any[]; confirmed: any[] }> {
    const { maxPages = 1000 } = options;
    try {
        logger.info(`Fetching transactions for address: ${address}`);

        // 1) Fetch mempool txs (unconfirmed)
        const mempoolRes = await axios.get(`${esploraApiUrl}/address/${address}/txs/mempool`);
        const mempool: any[] = Array.isArray(mempoolRes.data) ? mempoolRes.data : [];
        logger.info(`Fetched mempool txs: ${mempool.length}`);
        for (const tx of mempool) {
            const amt = computeNetAmountForAddress(tx, address);
            logger.info(`mempool txid=${tx?.txid} amount=${amt}`);
        }

        // 2) Fetch confirmed txs with pagination
        const confirmed: any[] = [];
        // First page
        const firstPageRes = await axios.get(`${esploraApiUrl}/address/${address}/txs`);
        let page: any[] = Array.isArray(firstPageRes.data) ? firstPageRes.data : [];
        confirmed.push(...page);
        logger.info(`Fetched confirmed page 1: ${page.length}`);
        for (const tx of page) {
            const amt = computeNetAmountForAddress(tx, address);
            logger.info(`confirmed txid=${tx?.txid} amount=${amt}`);
        }

        // Subsequent pages via last_seen_txid
        let pagesFetched = 1;
        let lastSeen = page.length > 0 ? page[page.length - 1].txid : undefined;

        while (lastSeen && page.length > 0 && pagesFetched < maxPages) {
            const url = `${esploraApiUrl}/address/${address}/txs/chain/${lastSeen}`;
            const res = await axios.get(url);
            page = Array.isArray(res.data) ? res.data : [];
            if (page.length === 0) break;
            confirmed.push(...page);
            pagesFetched += 1;
            lastSeen = page[page.length - 1].txid;
            logger.info(`Fetched confirmed page ${pagesFetched}: ${page.length}`);
            for (const tx of page) {
                const amt = computeNetAmountForAddress(tx, address);
                logger.info(`confirmed txid=${tx?.txid} amount=${amt}`);
            }
        }

        logger.info(`Total confirmed txs: ${confirmed.length}, mempool txs: ${mempool.length}`);
        return { mempool, confirmed };
    } catch (error) {
        logger.error('Failed to fetch transactions for address:', address, error);
        throw error;
    }
}

// Create Bitcoin wallet function (P2WPKH - native SegWit format)
function createBtcWallet(network: 'mainnet' | 'testnet' = 'testnet'): {
    address: string;
    wif: string;
    publicKey: string;
    privateKey: string;
} {
    try {
        logger.info(`Creating Bitcoin SegWit wallet for ${network}...`);

        // Initialize Bitcoin network
        const net = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        const ecPair = ECPairFactory(tinysecp);

        // Generate new random key pair
        const keyPair = ecPair.makeRandom();

        // Get private key (32 bytes)
        const privateKey = Buffer.from(keyPair.privateKey!).toString('hex');

        // Get public key
        const publicKey = Buffer.from(keyPair.publicKey).toString('hex');

        // Generate WIF (Wallet Import Format)
        const wif = keyPair.toWIF();

        // Derive address (P2WPKH - native SegWit format)
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(keyPair.publicKey),
            network: net
        });

        if (!address) {
            throw new Error('Unable to generate Bitcoin address');
        }

        const wallet = {
            address: address,
            wif: wif,
            publicKey: publicKey,
            privateKey: privateKey
        };

        logger.info('Bitcoin SegWit wallet created successfully!');
        logger.info(`Address: ${address}`);
        logger.info(`WIF: ${wif}`);
        logger.info(`Public Key: ${publicKey}`);
        logger.info(`Private Key: ${privateKey}`);

        return wallet;

    } catch (error) {
        logger.error('Failed to create Bitcoin SegWit wallet:', error);
        throw error;
    }
}
// Send transaction function following your original logic exactly
async function sendTransaction(
    wif: string,
    receiverAddress: string,
    amount: number,
    network: 'mainnet' | 'testnet' = 'testnet',
    esploraApiUrl: string = 'https://blockstream.info/testnet/api',
    feeRate: number = 10
): Promise<{
    success: boolean;
    txid?: string;
    error?: string;
    sender?: string;
    receiver?: string;
    amount?: number;
}> {
    try {
        logger.info('Executing sendTransaction function...');

        // Initialize Bitcoin network and key pair (exactly like your original)
        const net = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        const ecPair = ECPairFactory(tinysecp);
        const keyPair = ecPair.fromWIF(wif);

        // Derive sender address (P2WPKH - native SegWit format)
        const { address: senderAddress } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: net });
        if (!senderAddress) {
            throw new Error('Unable to derive sender address from WIF');
        }

        // Validate parameters (exactly like your original)
        if (!receiverAddress || amount <= 0) {
            throw new Error('Invalid receiver address or amount');
        }

        // Fetch UTXOs (exactly like your original)
        const utxos = await fetchUtxos(esploraApiUrl, senderAddress);
        if (!utxos || utxos.length === 0) {
            throw new Error('No spendable UTXOs available');
        }

        // Simple UTXO selection: accumulate until amount + estimated fee is covered
        const selectedUtxos: UTXO[] = [];
        let inputValue = 0;
        for (const u of utxos) {
            selectedUtxos.push(u);
            inputValue += u.value;
            // Rough fee estimate: ~110 vB per input, ~31 vB per output (P2WPKH)
            const estVBytes = 110 * selectedUtxos.length + 31 * 2 + 10;
            const fee = Math.ceil(estVBytes * feeRate);
            logger.info(`Selection step: inputs=${selectedUtxos.length}, estVBytes=${estVBytes}, estFee=${fee}, inputValue=${inputValue}`);
            if (inputValue >= amount + fee) break;
        }

        // Recalculate fee after inputs are known (first pass estimate)
        const estVBytesInitial = 110 * selectedUtxos.length + 31 * 2 + 10;
        const estimatedFee = Math.ceil(estVBytesInitial * feeRate);
        const provisionalChange = inputValue - amount - estimatedFee;

        if (provisionalChange < 0) {
            throw new Error('Insufficient balance to cover transaction amount and fees');
        }

        logger.info(`Fee estimate: estVBytes=${estVBytesInitial}, feeRate=${feeRate}, estimatedFee=${estimatedFee}, inputValue=${inputValue}, amount=${amount}, provisionalChange=${provisionalChange}`);

        // First pass PSBT (with RBF sequences) to measure exact vsize
        const psbtMeasure = new bitcoin.Psbt({ network: net });
        for (const u of selectedUtxos) {
            psbtMeasure.addInput({
                hash: u.txid,
                index: u.vout,
                sequence: 0xfffffffd, // enable RBF
                witnessUtxo: {
                    script: bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: net }).output!,
                    value: u.value,
                },
            });
        }
        psbtMeasure.addOutput({ address: receiverAddress, value: amount });
        if (provisionalChange > 546) {
            psbtMeasure.addOutput({ address: senderAddress, value: provisionalChange });
        }
        psbtMeasure.signAllInputs(keyPair as any);
        psbtMeasure.finalizeAllInputs();
        const measuredTx = psbtMeasure.extractTransaction();
        const exactVSize = measuredTx.virtualSize();
        const exactFee = Math.ceil(exactVSize * feeRate);

        // Compute exact change from measured size
        const exactChange = inputValue - amount - exactFee;
        if (exactChange < 0) {
            throw new Error('Insufficient balance after exact fee calculation');
        }

        logger.info(`Fee exact: vsize=${exactVSize}, feeRate=${feeRate}, exactFee=${exactFee}, exactChange=${exactChange}`);

        // Second pass PSBT: build with precise change and RBF
        const psbtFinal = new bitcoin.Psbt({ network: net });
        for (const u of selectedUtxos) {
            psbtFinal.addInput({
                hash: u.txid,
                index: u.vout,
                sequence: 0xfffffffd, // enable RBF
                witnessUtxo: {
                    script: bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: net }).output!,
                    value: u.value,
                },
            });
        }
        psbtFinal.addOutput({ address: receiverAddress, value: amount });
        if (exactChange > 546) {
            psbtFinal.addOutput({ address: senderAddress, value: exactChange });
            logger.info(`Change output added: ${exactChange} sats to ${senderAddress}`);
        } else {
            logger.info(`No change output (<= dust threshold). Extra sats go to fee.`);
        }

        // Sign and broadcast final tx
        psbtFinal.signAllInputs(keyPair as any);
        psbtFinal.finalizeAllInputs();
        const txHex = psbtFinal.extractTransaction().toHex();
        logger.info(`Final tx hex length=${txHex.length}, txid computing...`);
        const txid = await broadcastTx(esploraApiUrl, txHex);
        logger.info(`Broadcasted txid=${txid}`);

        return {
            success: true,
            txid: txid,
            sender: senderAddress,
            receiver: receiverAddress,
            amount: amount
        };

    } catch (error) {
        logger.error('Bitcoin transfer failed:', error);
        logger.error('Error type:', typeof error);
        logger.error('Error details:', JSON.stringify(error, null, 2));
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// Create wallet (P2WPKH - native SegWit format)
// createBtcWallet('testnet');

// Check wallet balance (comment this line if you don't want to use it)
// await getWalletBalance('L1AufixjzuQKcAHeNdv7wJ4YK4VfUK2fQaLdzT8CVypHnY7of3i3', 'testnet');

// Send transaction (comment this line if you don't want to use it)
await sendTransaction('L1AufixjzuQKcAHeNdv7wJ4YK4VfUK2fQaLdzT8CVypHnY7of3i3',
    'tb1q6hks4hg2fv80g0rpk9732uem4z3sytp7gv9dea', 700, 'testnet',
    " https://blockstream.info/testnet/api", 5);

fetchAllTransactions('https://blockstream.info/testnet/api', 'tb1q6hks4hg2fv80g0rpk9732uem4z3sytp7gv9dea');
// Check wallet balance again (comment this line if you don't want to use it)
await getWalletBalance('KyGKqW2yVjps3CrqgsSWJ94SLWKJTPc5zSVyomLYJP1LBwwArypj', 'testnet');

// warning../../../ package.json: No license field
// $ tsc
// [2025 -09-07T03: 33: 11.531Z][INFO] Creating Bitcoin SegWit wallet for testnet...
// [2025 -09-07T03: 33: 11.541Z][INFO] Bitcoin SegWit wallet created successfully!
// [2025 -09-07T03: 33: 11.541Z][INFO] Address: tb1qa220d63y98uykm8qz4fa3w7fwsarg0ncwxzghh
// [2025 -09-07T03: 33: 11.541Z][INFO] WIF: L1AufixjzuQKcAHeNdv7wJ4YK4VfUK2fQaLdzT8CVypHnY7of3i3
// [2025 -09-07T03: 33: 11.541Z][INFO] Public Key: 031ed29ab9d552537f5cc92b9b41663b5099b44681eff753970af8cd90df1a7325
// [2025 -09-07T03: 33: 11.541Z][INFO] Private Key: 0becabf03648dcee3657a11f69d772b115c76c738dc5ea82f48472ba24ef1435
// Done in 0.92s.

// [2025 -09-07T03: 36: 35.567Z][INFO] Creating Bitcoin SegWit wallet for testnet...
// [2025 -09-07T03: 36: 35.577Z][INFO] Bitcoin SegWit wallet created successfully!
// [2025 -09-07T03: 36: 35.577Z][INFO] Address: tb1q6hks4hg2fv80g0rpk9732uem4z3sytp7gv9dea
// [2025 -09-07T03: 36: 35.577Z][INFO] WIF: KyGKqW2yVjps3CrqgsSWJ94SLWKJTPc5zSVyomLYJP1LBwwArypj
// [2025 -09-07T03: 36: 35.577Z][INFO] Public Key: 0358f87b896887898cfa3af1625d672119907bc0e5d796badf5c1cfad855ee428a
// [2025 -09-07T03: 36: 35.577Z][INFO] Private Key: 3d0517b0e7f5b5241f1ebe3f85fc8f64746176d0766961040573a11038939aff
// [2025 -09-07T03: 36: 35.577Z][INFO] Getting wallet balance...
// [2025 -09-07T03: 36: 35.580Z][INFO] Checking balance for address: tb1qj5wrad4pvgvxk53h4pmh4auzgumyh387ktc5ju
// [2025 -09-07T03: 36: 36.401Z][INFO] Balance: 235528 sats(0.00235528 BTC)
// [2025 -09-07T03: 36: 36.401Z][INFO] Total UTXOs: 1