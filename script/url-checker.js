#!/bin/env node
/** 
 * 
 * MIT License
 * 
 * Copyright (c) 2024 Bassem Dghaidi
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * ---
 * 
 * This code is for illustration purposes. Do not use it in production.
 * 
 * This script will crawl all the pages of this website and call each external URL
 * to make sure none return a 404 error. These are markdown pages.
 * 
 * Usage:
 *  node script/url-checker.js -t <timeout> -d <directory>
 * 
 * Options:
 *  -t, --timeout <timeout>  The timeout in seconds for each request. Default is 5.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const marked = require('marked');
const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({
    description: 'URL Checker'
});
parser.add_argument('-t', '--timeout', { default: '5', help: 'The timeout in seconds for each request' });
parser.add_argument('-d', '--directory', { help: 'The path to the posts directory' });
const args = parser.parse_args();
const timeout = Number(args.timeout) * 1000;
if (!Number.isFinite(timeout) || timeout < 1) {
    parser.error('--timeout must be a positive number of seconds (at least 0.001)');
}
const postsDir = args.directory || path.join(__dirname, '../src/posts');

// Recusively get all the markdown files (.md) only in the posts directory
const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            filelist = walkSync(filePath, filelist);
        } else {
            if (filePath.endsWith('.md')) {
                filelist = [...filelist, filePath];
            }
        }
    });
    return filelist;
}

// Read a list of file paths, parse the markdown and return all the URLs
const getUrls = (filePaths) => {
    let urls = [];
    filePaths.forEach(filePath => {
        const markdown = fs.readFileSync(filePath, { encoding: 'utf-8' });
        marked.walkTokens(marked.lexer(markdown), token => {
            if (token.type === 'link') {
                urls.push(token.href);
            }
        });
    });
    return urls;
}

// Fail on broken or unreachable external links.
const checkUrl = async (url) => {
    try {
        const response = await axios.get(url, { timeout, signal: AbortSignal.timeout(Math.floor(timeout)) });
        console.log(`${response.status} - ${url}`);
        return true;
    }
    catch (error) {
        console.error(`${error.response?.status || error.message} - ${url}`);
        return false;
    }
}

const main = async () => {
    const urls = new Set(getUrls(walkSync(postsDir)).filter(url => /^https?:\/\//i.test(url)));
    const results = await Promise.all(Array.from(urls, checkUrl));
    if (results.every(Boolean)) {
        console.log('All URLs are valid');
    } else {
        process.exitCode = 1;
    }
};

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});