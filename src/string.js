const ASCII_DECODER = new TextDecoder('us-ascii');
const UTF_16_DECODER = new TextDecoder('utf-16le');

export class WzString {
    constructor(view, crypto, isAscii) {
        this.view = view;
        this.crypto = crypto;
        this.isAscii = isAscii;
    }

    equals(other) {
        if (this.crypto !== other.crypto || this.isAscii !== other.isAscii) {
            return this.toString() === other.toString();
        }
        if (this.view.byteLength !== other.view.byteLength) {
            return false;
        }
        for (let i = 0; i < this.view.byteLength; i++) {
            if (this.view.getUint8(i) !== other.view.getUint8(i)) {
                return false;
            }
        }
        return true;
    }

    toString() {
        const buffer = this.view.buffer.slice(this.view.byteOffset, this.view.byteOffset + this.view.byteLength);
        const data = new Uint8Array(buffer);
        if (this.isAscii) {
            this.crypto.cryptAscii(data);
            return ASCII_DECODER.decode(data);
        } else {
            this.crypto.cryptUnicode(data);
            return UTF_16_DECODER.decode(data);
        }
    }
}