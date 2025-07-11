import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { makerFile } from '../utils/constants';
import { log } from '../api/userInterface';

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

export async function checkIfMarkerFileExists(): Promise<boolean> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        // No workspace folder is open
        return false;
    }

    // Get the URI of the first workspace folder (assuming single-root for simplicity)
    const workspaceFolderUri = vscode.workspace.workspaceFolders[0].uri;

    // Construct the URI for the marker file
    const markerFileUri = vscode.Uri.file(path.join(workspaceFolderUri.fsPath, makerFile));

    try {
        // Attempt to get file stats. If it doesn't exist, this will throw an error.
        await vscode.workspace.fs.stat(markerFileUri);
        // If no error is thrown, the file exists.
        return true;
    } catch (error) {
        // Check for specific error code if you want to differentiate
        // between "file not found" and other errors (e.g., permissions).
        // For simple existence check, a catch-all is usually sufficient.
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
            return false; // File does not exist
        }
        // Re-throw other errors if they are unexpected or critical
        console.error(`Error checking for marker file: ${error.message}`);
        return false; // Or handle the error as appropriate
    }
}

export function createMarkdownText(text: string, local: boolean = false, project = undefined): string {
    // local: from local file or online, deafault is false
    // project if from online

    let regex: RegExp;
    let match: RegExpExecArray;

    // files tree
    regex = /```plaintext\s([\s\S]*?)```/g;
    text = text.replace(regex, (match, p1, p2) => {
        match = match.replace('```plaintext', '');
        return match.split('\n').join('<br>');
    });

    // bash text
    regex = /```bash\s([\s\S]*?)```/g;
    text = text.replace(regex, (match, p1, p2) => {
        match = match.replace('```bash', '')
        return match.split('\n').join('<br>')
    });
    
    // python text
    regex = /```python\s([\s\S]*?)```/g;
    text = text.replace(regex, (match, p1, p2) => {
        match = match.replace('```python', '')
        return match.split('\n').join('<br>')
    });

    // img urls
    regex = /!\[\]\((.*?)\)/g;
    if (!local){
        text = text.replace(regex, (match, p1, p2) => {
            p1 = p1.replace('./','');
            p1 = p1.replace('../','');
            let imgUrl = `https://raw.githubusercontent.com/QuecPython/${project.name}/${project.default_branch}/${p1}`;
            return `<img src="${imgUrl}" style="zoom:67%;" /><br>`;
        });
    } else{
        text = text.replace(regex, (match, p1, p2) => {
            return `<img src="${p1}" style="zoom:67%;" /><br>`;
        });
    }

    // other urls
    regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    while ((match = regex.exec(text)) !== null) {
        const phrase = text.substring(match.index, regex.lastIndex);
        const wordInBrackets = match[1];
        const url = match[2];
        text.replace(phrase,`<a href="" onclick="vscode.postMessage({ command: 'openUrl' , value: '${url}' });">${wordInBrackets}</a>`);
    }

    // Replace links with HTML anchor tags
    regex = /- \[(.*?)\]\(#(.*?)\)/g;
    text = text.replace(regex, (match, title, anchor) => {
        return `- <a href='#${anchor.toLowerCase()}'>${title}</a>`;
    });

    // Replace headers HTML paragraph tags
    regex = /(# )(.*)/g;
    text = text.replace(regex, (match, p1, p2) => {
        return `${p1}<p id="${p2.toLowerCase()}">${p2}</p>`;
    });

    text = removeBackquote(text);

    // for online file
    if (!local){
        // url for zh readme
        text = text.replace(
            '[中文](README.zh.md) | English',
            `<a href="" onclick="vscode.postMessage({ command: 'viewChineseClick' , value: '${project.id}' });">中文</a> | English`
        );

        // url for en readme
        text = text.replace(
            '中文 | [English](README.md)',
            `中文 | <a href="" onclick="vscode.postMessage({ command: 'viewClick' , value: '${project.id}' });">English</a>`
        );
    } else{
        // url for zh readme
        text = text.replace(
            '[中文](README.zh.md) | English',
            `<a href="" onclick="vscode.postMessage({ command: 'viewCurrentTabReadme' , value: 'README.zh.md' });">中文</a> | English`
        );

        // url for en readme
        text = text.replace(
            '中文 | [English](README.md)',
            `中文 | <a href="" onclick="vscode.postMessage({ command: 'viewCurrentTabReadme' , value: 'README.md' });">English</a>`
        );
    } 
    return text;
}

export function removeBackquote(text: string): string{
    return text.split('`').join('');
}