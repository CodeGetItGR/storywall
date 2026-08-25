type ZipEntryInput = {
    filename: string;
    data: Uint8Array;
};

const textEncoder = new TextEncoder();
const CRC32_TABLE = new Uint32Array(256);

for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    CRC32_TABLE[i] = crc >>> 0;
}

function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
        crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (~crc) >>> 0;
}

function getDosDateTime(date = new Date()) {
    const year = Math.max(date.getFullYear(), 1980);
    const dosTime = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
    const dosDate = ((year - 1980) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
    return { dosTime, dosDate };
}

function writeUint16LE(view: DataView, offset: number, value: number) {
    view.setUint16(offset, value, true);
}

function writeUint32LE(view: DataView, offset: number, value: number) {
    view.setUint32(offset, value, true);
}

function concatBytes(chunks: Uint8Array[]) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged;
}

function makeLocalFileHeader(entry: ZipEntryInput, crc: number, dosTime: number, dosDate: number) {
    const filenameBytes = textEncoder.encode(entry.filename);
    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    writeUint32LE(view, 0, 0x04034b50);
    writeUint16LE(view, 4, 20);
    writeUint16LE(view, 6, 0x0800);
    writeUint16LE(view, 8, 0);
    writeUint16LE(view, 10, dosTime);
    writeUint16LE(view, 12, dosDate);
    writeUint32LE(view, 14, crc);
    writeUint32LE(view, 18, entry.data.length);
    writeUint32LE(view, 22, entry.data.length);
    writeUint16LE(view, 26, filenameBytes.length);
    writeUint16LE(view, 28, 0);
    header.set(filenameBytes, 30);
    return header;
}

function makeCentralDirectoryHeader(entry: ZipEntryInput, crc: number, dosTime: number, dosDate: number, localHeaderOffset: number) {
    const filenameBytes = textEncoder.encode(entry.filename);
    const header = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(header.buffer);

    writeUint32LE(view, 0, 0x02014b50);
    writeUint16LE(view, 4, 20);
    writeUint16LE(view, 6, 20);
    writeUint16LE(view, 8, 0x0800);
    writeUint16LE(view, 10, 0);
    writeUint16LE(view, 12, dosTime);
    writeUint16LE(view, 14, dosDate);
    writeUint32LE(view, 16, crc);
    writeUint32LE(view, 20, entry.data.length);
    writeUint32LE(view, 24, entry.data.length);
    writeUint16LE(view, 28, filenameBytes.length);
    writeUint16LE(view, 30, 0);
    writeUint16LE(view, 32, 0);
    writeUint16LE(view, 34, 0);
    writeUint16LE(view, 36, 0);
    writeUint32LE(view, 38, 0);
    writeUint32LE(view, 42, localHeaderOffset);
    header.set(filenameBytes, 46);
    return header;
}

function makeEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
    const footer = new Uint8Array(22);
    const view = new DataView(footer.buffer);

    writeUint32LE(view, 0, 0x06054b50);
    writeUint16LE(view, 4, 0);
    writeUint16LE(view, 6, 0);
    writeUint16LE(view, 8, entryCount);
    writeUint16LE(view, 10, entryCount);
    writeUint32LE(view, 12, centralDirectorySize);
    writeUint32LE(view, 16, centralDirectoryOffset);
    writeUint16LE(view, 20, 0);

    return footer;
}

export async function buildZipBlob(entries: ZipEntryInput[]) {
    const localChunks: Uint8Array[] = [];
    const centralDirectoryChunks: Uint8Array[] = [];
    let localHeaderOffset = 0;
    const { dosTime, dosDate } = getDosDateTime();

    for (const entry of entries) {
        const crc = crc32(entry.data);
        const localHeader = makeLocalFileHeader(entry, crc, dosTime, dosDate);
        const centralHeader = makeCentralDirectoryHeader(entry, crc, dosTime, dosDate, localHeaderOffset);

        localChunks.push(localHeader, entry.data);
        centralDirectoryChunks.push(centralHeader);
        localHeaderOffset += localHeader.length + entry.data.length;
    }

    const localData = concatBytes(localChunks);
    const centralDirectory = concatBytes(centralDirectoryChunks);
    const footer = makeEndOfCentralDirectory(entries.length, centralDirectory.length, localData.length);

    return new Blob([localData, centralDirectory, footer], { type: 'application/zip' });
}
