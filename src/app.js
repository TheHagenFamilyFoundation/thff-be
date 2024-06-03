//packages
import express from 'express';
import helmet from "helmet";
import cors from 'cors';
import bodyParser from 'body-parser';
//config
import { Config } from './config/index.js';

//routes
import routes from './routes/index.js';

const app = express();
const port = Config.appPort;

// app.use(bearerToken());
app.use(cors());
app.use(bodyParser.json());

app.use(helmet())

routes(app);

// eslint-disable-next-line no-unused-vars
const server = app.listen(port, () => {
  console.log(`THFF listening on port ${port}`)
})
