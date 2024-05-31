import { WZ_OFFSET_CONSTANT, WZ_PKG1_HEADER, WZ_SOUND_HEADER } from './constants.js';
import { WzBuffer } from './buffer.js';
import { WzPackage } from './package.js';
import { WzDirectory } from './directory.js';
import { WzImage } from './image.js';
import { WzCanvasProperty, WzConvexProperty, WzListProperty, WzSoundProperty, WzUolProperty, WzVectorProperty } from './property.js';
import { WzCrypto } from './crypto.js';

const ASCII_DECODER = new TextDecoder('us-ascii');
const UTF_16_DECODER = new TextDecoder('utf-16le');

function rotateLeft(value, distance) {
    return (value << distance) | (value >>> (32 - distance));
}

export class WzReader {
    constructor(data, crypto, version) {
        this.data = data;
        this.crypto = crypto;
        this.version = version;
    }

    getBuffer(offset) {
        return WzBuffer.fromArrayBuffer(this.data, offset);
    }

    computeVersionHash(version) {
        let versionHash = 0;
        const versionString = version.toString();
        for (let i = 0; i < versionString.length; i++) {
            versionHash = ((versionHash * 32) + versionString.charCodeAt(i) + 1) & 0xFFFFFFFF;
        }
        return versionHash;
    }

    readCompressedInt(buffer) {
        const value = buffer.getInt8();
        if (value === -128) {
            return buffer.getInt32();
        } else {
            return value;
        }
    }

    readOffset(parent, buffer) {
        const start = parent.getStart();
        const hash = parent.getHash();
        let offset = buffer.getOffset();
        offset = ~(offset - start);
        offset = offset * hash;
        offset = offset - WZ_OFFSET_CONSTANT;
        offset = rotateLeft(offset, offset & 0x1F);
        offset = offset ^ buffer.getInt32(); // encrypted offset
        offset = offset + (start * 2);
        return offset;
    }

    readString(buffer) {
        let length = buffer.getInt8();
        if (length < 0) {
            if (length === -128) {
                length = buffer.getInt32();
            } else {
                length = -length;
            }
            if (length > 0) {
                const array = buffer.getArray(length);
                this.crypto.cryptAscii(array);
                return ASCII_DECODER.decode(array);
            }
        } else if (length > 0) {
            if (length === 127) {
                length = buffer.getInt32();
            }
            if (length > 0) {
                const array = buffer.getArray(length * 2); // utf-16le
                this.crypto.cryptUnicode(array);
                return UTF_16_DECODER.decode(array);
            }
        }
        return '';
    }

    readStringBlock(image, buffer) {
        const stringType = buffer.getInt8();
        switch (stringType) {
            case 0x00:
            case 0x73: {
                return this.readString(buffer);
            }
            case 0x01:
            case 0x1B: {
                const stringOffset = buffer.getInt32();
                const originalOffset = buffer.getOffset();
                buffer.setOffset(image.getOffset() + stringOffset);
                const string = this.readString(buffer);
                buffer.setOffset(originalOffset);
                return string;
            }
            default: {
                throw `Unknown string block type ${stringType}`;
            }
        }
    }

    readPackage() {
        const buffer = this.getBuffer(0);

        // Check PKG1 header
        if (buffer.getInt32() != WZ_PKG1_HEADER) {
            throw 'PKG1 header missing';
        }
        const size = buffer.getInt64();
        const start = buffer.getInt32();

        // Check version hash
        buffer.setOffset(start);
        const versionHeader = buffer.getUint16();
        const versionHash = this.computeVersionHash(this.version);
        const computedHeader = 0xFF
            ^ ((versionHash >> 24) & 0xFF)
            ^ ((versionHash >> 16) & 0xFF)
            ^ ((versionHash >> 8) & 0xFF)
            ^ (versionHash & 0xFF);
        if (versionHeader != computedHeader) {
            throw 'Incorrect version';
        }

        // Read parent directory
        const parent = new WzPackage(start, versionHash);
        parent.setDirectory(this.readDirectory(parent, buffer));
        return parent;
    }

    readDirectory(parent, buffer) {
        const directories = new Map();
        const images = new Map();
        const size = this.readCompressedInt(buffer);
        for (let i = 0; i < size; i++) {
            let childName;
            let childType = buffer.getInt8();
            switch (childType) {
                case 1: {
                    // unknown : 01 XX 00 00 00 00 00 OFFSET
                    buffer.getInt32();
                    buffer.getInt16();
                    this.readOffset(parent, buffer);
                    continue;
                }
                case 2: {
                    // string offset
                    const stringOffset = buffer.getInt32();
                    const originalOffset = buffer.getOffset();
                    buffer.setOffset(parent.getStart() + stringOffset);
                    childType = buffer.getInt8();
                    childName = this.readString(buffer);
                    buffer.setOffset(originalOffset);
                    break;
                }
                case 3:
                case 4: {
                    childName = this.readString(buffer);
                    break;
                }
                default: {
                    throw `Unknown directory child type ${childType}`;
                }
            }
            const childSize = this.readCompressedInt(buffer);
            const childChecksum = this.readCompressedInt(buffer);
            const childOffset = this.readOffset(parent, buffer);

            const originalOffset = buffer.getOffset();
            buffer.setOffset(childOffset);
            if (childType === 3) {
                directories.set(childName, this.readDirectory(parent, buffer));
            } else if (childType === 4) {
                const image = new WzImage(childOffset);
                const property = this.readProperty(image, buffer);
                if (!(property instanceof WzListProperty)) {
                    throw 'Image property is not a list';
                }
                image.setProperty(property);
                images.set(childName, image);
            }
            buffer.setOffset(originalOffset);
        }
        return new WzDirectory(directories, images);
    }

    readProperty(image, buffer) {
        const propertyType = this.readStringBlock(image, buffer);
        switch (propertyType) {
            case 'Property': {
                buffer.getInt16(); // reserved
                return new WzListProperty(this.readListItems(image, buffer));
            }
            case 'Canvas': {
                buffer.addOffset(1);
                let properties;
                const hasProperties = buffer.getInt8() == 1;
                if (hasProperties) {
                    buffer.addOffset(2);
                    properties = new WzListProperty(this.readListItems(image, buffer));
                } else {
                    properties = new WzListProperty(new Map());
                }
                // Canvas meta
                const width = this.readCompressedInt(buffer);
                const height = this.readCompressedInt(buffer);
                const format = this.readCompressedInt(buffer);
                const format2 = this.readCompressedInt(buffer);
                buffer.addOffset(4);
                // Canvas data
                const dataSize = buffer.getInt32() - 1;
                buffer.addOffset(1);
                const data = buffer.getArray(dataSize);
                return new WzCanvasProperty(properties, width, height, format, format2, data);
            }
            case 'Shape2D#Vector2D': {
                const x = this.readCompressedInt(buffer);
                const y = this.readCompressedInt(buffer);
                return new WzVectorProperty(x, y);
            }
            case 'Shape2D#Convex2D': {
                const properties = [];
                const size = this.readCompressedInt(buffer);
                for (let i = 0; i < size; i++) {
                    properties.push(this.readProperty(image, buffer));
                }
                return new WzConvexProperty(properties);
            }
            case 'Sound_DX8': {
                buffer.addOffset(1);
                const dataSize = this.readCompressedInt(buffer);
                const duration = this.readCompressedInt(buffer);
                // Read header info
                const headerOffset = buffer.getOffset();
                buffer.addOffset(WZ_SOUND_HEADER.length);
                const formatSize = buffer.getUint8();
                buffer.addOffset(formatSize);
                // Create slices
                const header = buffer.createSlice(headerOffset, buffer.getOffset() - headerOffset);
                const data = buffer.createSlice(buffer.getOffset(), dataSize);
                buffer.addOffset(dataSize);
                return new WzSoundProperty(header, data);
            }
            case 'UOL': {
                buffer.addOffset(1);
                const uol = this.readStringBlock(image, buffer);
                return new WzUolProperty(uol);
            }
            default: {
                throw `Unhandled property type : ${propertyType}`;
            }
        }
    }

    readListItems(image, buffer) {
        const items = new Map();
        const size = this.readCompressedInt(buffer);
        for (let i = 0; i < size; i++) {
            const itemName = this.readStringBlock(image, buffer);
            const itemType = buffer.getInt8();
            switch (itemType) {
                case 0: {
                    items.set(itemName, null);
                    break;
                }
                case 2:
                case 11: {
                    const shortValue = buffer.getInt16();
                    items.set(itemName, shortValue);
                    break;
                }
                case 3:
                case 19: {
                    const intValue = this.readCompressedInt(buffer);
                    items.set(itemName, intValue);
                    break;
                }
                case 20: {
                    const longVzalue = buffer.getInt64();
                    items.set(itemName, longValue);
                    break;
                }
                case 4: {
                    const floatType = buffer.getInt8();
                    if (floatType === 0x00) {
                        items.set(itemName, 0.0);
                    } else if (floatType === -128) {
                        const floatValue = buffer.getFloat32();
                        items.set(itemName, floatValue);
                    } else {
                        throw `Unknown float type ${floatType}`;
                    }
                    break;
                }
                case 5: {
                    const doubleValue = buffer.getFloat64();
                    items.set(itemName, doubleValue);
                    break;
                }
                case 8: {
                    const stringValue = this.readStringBlock(image, buffer);
                    items.set(itemName, stringValue);
                    break;
                }
                case 9: {
                    const propertySize = buffer.getInt32();
                    const propertyOffset = buffer.getOffset();
                    const property = this.readProperty(image, buffer);
                    items.set(itemName, property)
                    buffer.setOffset(propertyOffset + propertySize);
                    break;
                }
                default: {
                    throw `Unknown property item type ${itemType}`;
                }
            }
        }
    }

    static build(data, iv, version) {
        const crypto = WzCrypto.fromIv(iv);
        return new WzReader(data, crypto, version);
    }
}