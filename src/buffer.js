export class WzBuffer {
    constructor(view) {
        this.view = view;
        this.offset = 0;
    }

    getOffset() {
        return this.offset;
    }

    setOffset(newOffset) {
        this.offset = newOffset;
    }

    addOffset(value) {
        this.offset += value;
    }

    getInt8() {
        const value = this.view.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    getUint8() {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    getInt16() {
        const value = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    getUint16() {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    getInt32() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getUint32() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getInt64() {
        const value = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return value;
    }

    getUint64() {
        const value = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return value;
    }

    getFloat32() {
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getFloat64() {
        const value = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    getArray(length) {
        const array = this.createSlice(this.offset, length);
        this.offset += length;
        return array;
    }

    createSlice(offset, length) {
        const index = this.view.byteOffset + offset;
        return new Uint8Array(this.view.buffer.slice(index, index + length));
    }

    static fromArrayBuffer(data, offset) {
        const view = new DataView(data, offset);
        return new WzBuffer(view);
    }
}