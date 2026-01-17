import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.listen(PORT, () => {
    console.log(`Collapse demo app listening on port ${PORT}!`);
    console.log(`Open http://localhost:${PORT} to view the demo`);
});
