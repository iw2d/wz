import { createCipheriv } from 'node:crypto';

import { AES_USER_KEY } from './constants.js';

const BATCH_SIZE = 1024;

export class WzCrypto {
    constructor(cipher) {
        this.cipher = cipher;
        this.cipherMask = new Uint8Array();
    }

    cryptAscii(data) {
        this.ensureSize(data.length);
        let mask = 0xAA;
        for (let i = 0; i < data.length; i++) {
            data[i] = (data[i] ^ this.cipherMask[i] ^ mask) & 0xFF;
            mask = (mask + 1) & 0xFF;
        }
    }

    cryptUnicode(data) {
        this.ensureSize(data.length);
        let mask = 0xAAAA;
        for (let i = 0; i < data.length; i += 2) {
            data[i] = (data[i] ^ this.cipherMask[i] ^ (mask & 0xFF)) & 0xFF;
            data[i + 1] = (data[i + 1] ^ this.cipherMask[i + 1] ^ (mask >> 8)) & 0xFF;
            mask = (mask + 1) & 0xFFFF;
        }
    }

    ensureSize(size) {
        const curSize = this.cipherMask.length;
        if (curSize >= size) {
            return;
        }
        const newSize = (Math.trunc(size / BATCH_SIZE) + 1) * BATCH_SIZE;
        const newMask = new Uint8Array(newSize);

        if (this.cipher != null) {
            newMask.set(this.cipherMask, 0);
            for (let i = curSize; i < newSize; i += 16) {
                const block = this.cipher.update(new DataView(newMask.buffer, newMask.byteOffset + i, 16));
                newMask.set(block, i);
            }
        }

        this.cipherMask = newMask;
    }

    static fromIv(iv) {
        // Empty IV
        if (iv.every(x => x === 0)) {
            return new WzCrypto(null);
        }

        // Initialize key
        const trimmedKey = new Uint8Array(32);
        for (let i = 0; i < 128; i += 16) {
            trimmedKey[i / 4] = AES_USER_KEY[i];
        }

        // Initialize IV
        const expandedIv = new Uint8Array(16);
        for (let i = 0; i < expandedIv.length; i += iv.length) {
            expandedIv.set(iv, i, iv.length);
        }

        // Create cipher
        const cipher = createCipheriv('aes-256-cbc', trimmedKey, expandedIv);
        cipher.setAutoPadding(false);
        return new WzCrypto(cipher);
    }
}
