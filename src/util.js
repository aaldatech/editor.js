export const sanitizeBlockWUlid = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
        // Replace the existing row_ulid property with a new random ID
        if (obj.hasOwnProperty('row_ulid')) {
            const old_ulid = obj.row_ulid;
            obj.row_ulid = Ulid.generate().toString();
            updateParentId(block, old_ulid, obj.row_ulid);
            if (!obj?.parent_id) {
                obj.isMainMed = true
            }
        }
        if (obj.hasOwnProperty('ulid') && !!obj.ulid && obj.ulid.length > 5) {
            obj.ulid = Ulid.generate().toString();
        }
        // Traverse each property of the object
        for (const key in obj) {
            // Recursively call traverse for nested objects
            if (obj.hasOwnProperty(key)) {
                sanitizeBlockWUlid(obj[key]);
            }
        }
    }
}

export const updateParentId = (data, oldUlid, newUlid) => {
    if (typeof data === 'object' && data !== null) {
        // Check if the current object has a parent_id key with the oldUlid value
        if (data.hasOwnProperty('parent_id') && data.parent_id === oldUlid) {
            data.parent_id = newUlid;
        }
        // Traverse each property of the object
        for (const key in data) {
            // Recursively call updateParentId for nested objects
            if (data.hasOwnProperty(key)) {
                updateParentId(data[key], oldUlid, newUlid);
            }
        }
    }
    return data;
};

class Ulid {
    static ENCODING_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    static ENCODING_LENGTH = 32;

    static TIME_MAX = 281474976710655;
    static TIME_LENGTH = 10;

    static RANDOM_LENGTH = 16;

    constructor(time, randomness, lowercase = false) {
        this.time = time;
        this.randomness = randomness;
        this.lowercase = lowercase;
    }

    static fromString(value, lowercase = false) {
        if (value.length !== Ulid.TIME_LENGTH + Ulid.RANDOM_LENGTH) {
            throw new Error('Invalid ULID string (wrong length): ' + value);
        }

        value = value.toUpperCase();

        const regex = new RegExp(`^[${Ulid.ENCODING_CHARS}]{${Ulid.TIME_LENGTH + Ulid.RANDOM_LENGTH}}$`);
        if (!regex.test(value)) {
            throw new Error('Invalid ULID string (wrong characters): ' + value);
        }

        return new Ulid(
            value.substr(0, Ulid.TIME_LENGTH),
            value.substr(Ulid.TIME_LENGTH, Ulid.RANDOM_LENGTH),
            lowercase
        );
    }

    static fromTimestamp(milliseconds, lowercase = false) {
        let duplicateTime = milliseconds === Ulid.lastGenTime;

        Ulid.lastGenTime = milliseconds;

        let timeChars = '';
        let randChars = '';

        for (let i = Ulid.TIME_LENGTH - 1; i >= 0; i--) {
            const mod = milliseconds % Ulid.ENCODING_LENGTH;
            timeChars = Ulid.ENCODING_CHARS[mod] + timeChars;
            milliseconds = (milliseconds - mod) / Ulid.ENCODING_LENGTH;
        }
        if (!duplicateTime) {
            for (let i = 0; i < Ulid.RANDOM_LENGTH; i++) {
                Ulid.lastRandChars[i] = Math.floor(Math.random() * 32);
            }
        } else {
            let i = 0;
            for (i = Ulid.RANDOM_LENGTH - 1; i >= 0 && Ulid.lastRandChars[i] === 31; i--) {
                Ulid.lastRandChars[i] = 0;
            }

            Ulid.lastRandChars[i]++;
        }

        for (let i = 0; i < Ulid.RANDOM_LENGTH; i++) {
            randChars += Ulid.ENCODING_CHARS[Ulid.lastRandChars[i]];
        }

        return new Ulid(timeChars, randChars, lowercase);
    }

    static generate(lowercase = false) {
        const now = Math.floor(Date.now());
        return Ulid.fromTimestamp(now, lowercase);
    }

    getTime() {
        return this.time;
    }

    getRandomness() {
        return this.randomness;
    }

    isLowercase() {
        return this.lowercase;
    }

    toTimestamp() {
        return this.decodeTime(this.time);
    }

    toString() {
        const value = this.time + this.randomness;
        return this.lowercase ? value.toLowerCase() : value.toUpperCase();
    }

    decodeTime(time) {
        const timeChars = time.split('').reverse();
        let carry = 0;

        for (let index = 0; index < timeChars.length; index++) {
            const char = timeChars[index];
            const encodingIndex = Ulid.ENCODING_CHARS.lastIndexOf(char);

            if (encodingIndex === -1) {
                throw new Error('Invalid ULID character: ' + char);
            }

            carry += encodingIndex * Math.pow(Ulid.ENCODING_LENGTH, index);
        }

        if (carry > Ulid.TIME_MAX) {
            throw new Error('Invalid ULID string: timestamp too large');
        }

        return carry;
    }
}

// Static properties initialization
Ulid.lastGenTime = 0;
Ulid.lastRandChars = [];
