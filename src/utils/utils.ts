
import * as fs from 'fs';

const escapeRe = /\\(.)/;
const hexCharRe = /(?<!\\)\\x([a-fA-F0-9]{2})/;
const uCharRe = /(?<!\\)\\u([a-fA-F0-9]{4})/;

export function unescape(original: string): string {
    let matches;
    while ((matches = hexCharRe.exec(original)) !== null) {
        original = original.replace(matches[0], String.fromCharCode(parseInt(matches[1], 16)));
    }
    while ((matches = uCharRe.exec(original)) !== null) {
        original = original.replace(matches[0], String.fromCharCode(parseInt(matches[1], 16)));
    }
    if (escapeRe.test(original)) {
        const lookup: { [key: string]: string } = {
            '\\b': '\b',
            '\\f': '\f',
            '\\n': '\n',
            '\\r': '\r',
            '\\t': '\t',
            '\\v': '\v',
            '\\0': '\0',
        };
        for (const exp in lookup) {
            original = original.replace(exp, lookup[exp]);
        }
        original = original.replace(/\\(.?)/g, '$1');
    }
    return original;
}

export function extractFilePath(data: string): string {
    return `/${data.match(/\(([^)]+)\)/)[1]
                   .slice(1, -1)
                   .split('/')
                   .slice(1)
                   .join('/')}`;
}

export function isDir(path: string): boolean {
    try {
        const stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
