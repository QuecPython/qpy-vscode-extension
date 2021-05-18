export interface FileData {
    filename: string,
    fileSizeInBytes: number,
}

export interface DownloadResponse {
    fileData: FileData,
    parentPath: string,
    code: string
}
