const http = require('http');
const fs = require('fs').promises;
const { Command } = require('commander');

const program = new Command();

program
    .requiredOption('-h, --host <host>', 'Server host')
    .requiredOption('-p, --port <port>', 'Server port')
    .requiredOption('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

const server = http.createServer(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running!');
});

server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
});
const path = require('path');

server.on('request', async (req, res) => {
    const { method, url } = req;
    const code = url.slice(1); // /200 -> 200
    const filePath = path.join(options.cache, `${code}.jpg`);

    if (!/^\d{3}$/.test(code)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid HTTP code');
        return;
    }

    try {
        switch (method) {
            case 'GET':
                const data = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(data);
                break;

            case 'PUT':
                const buffers = [];
                for await (const chunk of req) {
                    buffers.push(chunk);
                }
                await fs.writeFile(filePath, Buffer.concat(buffers));
                res.writeHead(201);
                res.end('Created');
                break;

            case 'DELETE':
                await fs.unlink(filePath);
                res.writeHead(200);
                res.end('Deleted');
                break;

            default:
                res.writeHead(405);
                res.end('Method not allowed');
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404);
            res.end('Not Found');
        } else {
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }
});
const superagent = require('superagent');

async function fetchFromHttpCat(code) {
    try {
        const response = await superagent.get(`https://http.cat/${code}`);
        return response.body;
    } catch {
        throw new Error('Not Found');
    }
}

server.on('request', async (req, res) => {
    const { method, url } = req;
    const code = url.slice(1);
    const filePath = path.join(options.cache, `${code}.jpg`);

    try {
        switch (method) {
            case 'GET':
                try {
                    const data = await fs.readFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(data);
                } catch {
                    const data = await fetchFromHttpCat(code);
                    await fs.writeFile(filePath, data);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(data);
                }
                break;

            // Інші методи не змінюються
        }
    } catch (err) {
        res.writeHead(err.message === 'Not Found' ? 404 : 500);
        res.end(err.message);
    }
});