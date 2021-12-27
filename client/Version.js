class Version {
    major;
    minor;
    patch;
    constructor(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}