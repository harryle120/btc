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

        // Simple UTXO selection: accumulate until amount + estimated fee is covered (exactly like your original)
        const psbt = new bitcoin.Psbt({ network: net });
        let inputValue = 0;
        for (const u of utxos) {
            psbt.addInput({
                hash: u.txid,
                index: u.vout,
                witnessUtxo: {
                    script: bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network: net }).output!,
                    value: u.value,
                },
            });
            inputValue += u.value;
            // Rough fee estimate: ~110 vB per input, ~31 vB per output (P2WPKH)
            const estVBytes = 110 * psbt.data.inputs.length + 31 * 2 + 10;
            const fee = Math.ceil(estVBytes * feeRate);
            if (inputValue >= amount + fee) break;
        }

        // Recalculate fee after inputs are known and before adding outputs (exactly like your original)
        const estVBytesInitial = 110 * psbt.data.inputs.length + 31 * 2 + 10;
        let fee = Math.ceil(estVBytesInitial * feeRate);
        const change = inputValue - amount - fee;
        if (change < 0) {
            throw new Error('Insufficient balance to cover fees');
        }

        let amountToSend = amount;
        if (change > 0 && change <= 546) {
            // Add tiny change to fee by reducing the main output
            if (amount - change <= 0) throw new Error('Fee too high relative to amount');
            amountToSend = amount - change;
        }
        psbt.addOutput({ address: receiverAddress, value: amountToSend });
        if (change > 546) {
            psbt.addOutput({ address: senderAddress, value: change });
        }

        // Sign and broadcast (exactly like your original)
        psbt.signAllInputs(keyPair as any);
        psbt.finalizeAllInputs();
        const txHex = psbt.extractTransaction().toHex();
        const txid = await broadcastTx(esploraApiUrl, txHex);

        return {
            success: true,
            txid: txid,
            sender: senderAddress,
            receiver: receiverAddress,
            amount: amountToSend
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
await getWalletBalance('L1AufixjzuQKcAHeNdv7wJ4YK4VfUK2fQaLdzT8CVypHnY7of3i3', 'testnet');

// Send transaction (comment this line if you don't want to use it)
await sendTransaction('L1AufixjzuQKcAHeNdv7wJ4YK4VfUK2fQaLdzT8CVypHnY7of3i3', 'tb1q6hks4hg2fv80g0rpk9732uem4z3sytp7gv9dea', 600, 'testnet');

// Check wallet balance again (comment this line if you don't want to use it)
// await getWalletBalance('KyGKqW2yVjps3CrqgsSWJ94SLWKJTPc5zSVyomLYJP1LBwwArypj', 'testnet');

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