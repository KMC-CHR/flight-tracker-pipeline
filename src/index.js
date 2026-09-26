import { buildServer } from './server.js';
import { config } from './config.js';

const server = buildServer();

server.listen({ port: config.port, host: config.host }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server running at ${address}`);
});