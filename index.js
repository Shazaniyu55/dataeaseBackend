require('dotenv').config();
const express = require("express");
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 2300;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const sanitizeInput = require('./utils/sanitize');
const connectDB = require('./config/db');
const indexRouter = require("./routes/index");
const Logger = require('./middlewares/log');




require('dotenv').config();

connectDB();
app.use(helmet());

app.use(cors(
    {origin: "*", methods: ['GET, POST, PUT, DELETE'], allowedHeaders:'Content-Type,authorization'}
));
app.use(morgan('tiny'));
app.use(express.json({limit: '10kb'}));
app.use('/api/v2', indexRouter);
app.use(bodyParser.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(sanitizeInput);
const limit = rateLimit({
  max: 5000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again after 1 hour.",
});

app.use('/api',limit);
app.use(Logger.logRequest);


app.get('/', (req, res) => {
  res.send('Welcome to DATA EASE  API SERVER');
});


app.listen(port, ()=>{
    console.log(`server running at http://localhost:${port}`)
});