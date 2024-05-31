export class WzImage {
    constructor(offset) {
        this.offset = offset;
        this.property = null;
    }

    getOffset() {
        return this.offset;
    }

    getProperty() {
        return this.property;
    }

    setProperty(newProperty) {
        this.property = newProperty;
    }
}