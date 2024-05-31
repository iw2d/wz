export class WzDirectory {
    constructor(directories, images) {
        this.directories = directories;
        this.images = images;
    }

    getDirectories() {
        return this.directories;
    }

    getImages() {
        return this.images;
    }
}