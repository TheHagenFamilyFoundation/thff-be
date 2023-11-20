import express from 'express'
import { Config } from './config/index.js';

const app = express();
const port = Config.appPort;

//testing this route
console.log('process.env.APP_ENV', process.env.APP_ENV);
console.log('Config', Config);

app.get('/', (req, res) => {
  res.status(200).send(`Welcome to ${Config.appEnv} THFF Backend!`)
})

//health route
app.get('/health', (req, res) => {
  res.status(200).send('server is up');
})

app.listen(port, () => {
  console.log(`THFF listening on port ${port}`)
})
