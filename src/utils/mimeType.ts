const minetype = {
    "css": "text/css",
    "txt": "text/plain",
    "gitignore": "text/plain",
    "htm": "text/html",
    "html": "text/html",
    "xml": "text/xml",
    "js": "text/javascript",
    "ico": "image/x-icon",
    "gif": "image/gif",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "json": "application/json",
    "pdf": "application/pdf",
    "swf": "application/x-shockwave-flash",
    "woff": "application/x-font-woff",
    "woff2": "application/x-font-woff",
    "eof": "application/vnd.ms-fontobjec",
    "ttf": "application/font-sfn",
    "mp3": "audio/mpeg",
    "wav": "audio/x-wav",
    "wma": "audio/x-ms-wma",
    "aiv": "video/x-msvideo",
    "mov": "video/quicktime",
    "wmv": "video/x-ms-wmv",
    "unknown": "application/octet-stream",
    "zip": "application/zip"
};

/**
 * 根据后缀获取对应到 minetype
 * 
 * @param {string} ext 
 * @returns {string}
 */
export function getMimetype(ext):string {
    let contentType = minetype[ext] || "application/octet-stream";
    return contentType;
}