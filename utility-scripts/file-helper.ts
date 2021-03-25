import fse = require('fs-extra');
import path = require('path');
import logger from '../src/sharedLogger';
import * as _ from 'lodash';
import { Dictionary } from 'lodash';

const fsPromises = fse.promises;

type RecursiveListFilesInDirectoryFilterFunction = (filePath: string) => boolean;
export const listFilters = {
    /**
     * This method takes a string that a path must end with and returns a function that takes that path and compares
     * USAGE: await recursiveListFilesInDirectory('./', result, listFilters.endsWith('-route-validation.ts'));
     * @param endsWith The end of file paths to filter out
     */
    endsWith: (endsWith: string, caseSensitive = true) => (filePath: string): boolean => {
        let filePathTransformed = filePath;
        let endsWithTransformed = endsWith;
        if (caseSensitive === false) {
            filePathTransformed = filePath.toLowerCase();
            endsWithTransformed = endsWith.toLowerCase();
        }
        return filePathTransformed.endsWith(endsWithTransformed);
    },
    matches: (pattern: RegExp): RecursiveListFilesInDirectoryFilterFunction => (filePath: string): boolean => {
        return pattern.test(filePath);
    }
};

export const recursiveListFilesInDirectory = async (filePath: string, result: string[], filter: RecursiveListFilesInDirectoryFilterFunction): Promise<string[]> => {
    const fileStats = await fsPromises.lstat(filePath);
    if (fileStats.isDirectory()) {
        const files = await fsPromises.readdir(filePath);
        const promises = files.map(async (listFilePath: string) => {
            const resultPath = path.resolve(path.join(filePath, listFilePath));
            await recursiveListFilesInDirectory(resultPath, result, filter);
        });
        await Promise.all(promises);
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else if (fileStats.isFile()) {
        if (filter(filePath)) {
            result.push(filePath);
        }
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else {
        logger.error(`recursiveListFilesInDirectory: not a file, symbolic link, or directory: ${filePath}`);
    }
    return result;
};

export const generateDirectoryWhitespaceMap = async (filePath: string, result: Dictionary<Array<string>> = {}): Promise<Dictionary<Array<string>>> => {
    const fileStats = await fsPromises.lstat(filePath);
    if (fileStats.isDirectory()) {
        const files = await fsPromises.readdir(filePath);
        const promises = await files.map(async (listFilePath: string) => {
            const resultPath = path.resolve(path.join(filePath, listFilePath));
            await generateDirectoryWhitespaceMap(resultPath, result);
        });
        await Promise.all(promises);
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else if (fileStats.isFile()) {
        const strippedFilePath = filePath.replace(/\s/g, '');
        if (_.isNil(result[strippedFilePath])) {
            result[strippedFilePath] = [];
        }
        result[strippedFilePath].push(filePath);
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else {
        logger.error(`recursiveListFilesInDirectory: not a file, symbolic link, or directory: ${filePath}`);
    }
    return result;
};

type DirectoryObjectOptions = {
    parent?: DirectoryObject;
    type: 'file' | 'directory' | 'not-set';
    filePath: string;
    children: { [key: string]: DirectoryObject }
};

export class DirectoryObject {
    public parent?: DirectoryObject;
    public type: 'file' | 'directory' | 'not-set';
    public filePath: string;
    public children: { [key: string]: DirectoryObject }
    constructor(options: DirectoryObjectOptions) {
        this.parent = options.parent;
        this.type = options.type;
        this.filePath = options.filePath;
        this.children = options.children;
    }

    /**
     * Traverse a path through the directory map
     * @param path A path delimeted by /
     * @returns the Directory object that represents this object traversed by that path
     */
    traverse(path: string): DirectoryObject {
        const tokens = path.split('/');
        let result: DirectoryObject = this;
        tokens.forEach(token => {
            if (!token) {
                return;
            }
            if (!result.children[token]) {
                throw new Error(`Token: ${token} not found in ${this.filePath}`);
            }
            result = result.children[token];
        });
        return result;
    }

    /**
     * Looks for the given filename as a parent directory or a file in any a parent directory
     * @param filename the file to search for in parent directories
     * @returns the "DirectoryObject" that represent the file or null if not found
     */
    findClosest(filename: string): DirectoryObject | null {
        let result: DirectoryObject | undefined = this;
        while (result !== undefined) {
            const found = Object.values(result.children).some(child => {
                if(path.basename(child.filePath) === filename) {
                    result = child;
                    return true;
                }
                return false;
            });

            if (found || path.basename(result.filePath) === filename) {
                break;
            }
            result = result.parent;
        }
        return result ?? null;
    }
}

export const generateDirectoryObject = async (filePath: string, parent?: DirectoryObject): Promise<DirectoryObject> => {
    const current = new DirectoryObject({
        type: 'not-set',
        parent: parent,
        filePath: path.resolve(filePath),
        children: {}
    });

    const fileStats = await fsPromises.lstat(filePath);
    if (fileStats.isDirectory()) {
        current.type = 'directory';
        if (parent) {
            parent.children[path.basename(filePath)] = current;
        }
        const files = await fsPromises.readdir(filePath);
        const promises = await files.map(async (listFilePath: string) => {
            const resultPath = path.resolve(path.join(filePath, listFilePath));
            await generateDirectoryObject(resultPath, current);
        });
        await Promise.all(promises);
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else if (fileStats.isFile()) {
        current.type = 'file';
        if (parent) {
            parent.children[path.basename(filePath)] = current;
        }
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else {
        logger.error(`recursiveListFilesInDirectory: not a file, symbolic link, or directory: ${filePath}`);
    }
    return current;
}
