export class WzListProperty {
    constructor(items) {
        this.items = items;
    }

    getItems() {
        return this.items;
    }
}

export class WzCanvasProperty {
    constructor(properties, width, height, format, format2, data) {
        this.properties = properties;
        this.width = width;
        this.height = height;
        this.width = width;
        this.format = format;
        this.format2 = format2;
        this.data = data;
    }

    getProperties() {
        return this.properties;
    }
}

export class WzVectorProperty {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }
}

export class WzConvexProperty {
    constructor(properties) {
        this.properties = properties;
    }

    getProperties() {
        return this.properties;
    }
}

export class WzSoundProperty {
    constructor(header, data) {
        this.header = header;
        this.data = data;
    }
}

export class WzUolProperty {
    constructor(uol) {
        this.uol = uol;
    }

    getUol() {
        return this.uol;
    }
}