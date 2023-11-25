//packages
import express from 'express';
import cors from 'cors';

//config
import { Config } from './config/index.js';

//routes
import routes from './routes/index.js';

const app = express();
const port = Config.appPort;

// app.use(bearerToken());
app.use(cors());

//testing this route
// console.log('process.env.APP_ENV', process.env.APP_ENV);
// console.log('Config', Config);

// app.get('/', (req, res) => {
//   res.status(200).send(`Welcome to ${Config.appEnv} THFF Backend!`)
// })

// //health route
// app.get('/health', (req, res) => {
//   // res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
//   let response = {
//     message: 'server is up'
//   };
//   res.status(200).send(response);
// })

routes(app);

// eslint-disable-next-line no-unused-vars
const server = app.listen(port, () => {
  console.log(`THFF listening on port ${port}`)
})
