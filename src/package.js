export class WzPackage {
    constructor(start, hash) {
        this.start = start;
        this.hash = hash;
        this.directory = null;
    }

    getStart() {
        return this.start;
    }

    getHash() {
        return this.hash;
    }

    getDirectory() {
        return this.directory;
    }

    setDirectory(newDirectory) {
        this.directory = newDirectory;
    }
}