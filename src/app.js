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
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  let response = {
    message: 'server is up'
  };
  res.status(200).send(response);
})

app.listen(port, () => {
  console.log(`THFF listening on port ${port}`)
})
