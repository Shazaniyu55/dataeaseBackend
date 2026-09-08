require('dotenv').config();
const express = require("express");
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 2301;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const sanitizeInput = require('./utils/sanitize');
const connectDB = require('./config/db');
const indexRouter = require("./routes/index");
const Logger = require('./middlewares/log');
// require('./utils/cronJobs');
const ipBlockMiddleware = require("./middlewares/Ipblockmiddleware");
const path = require('path');
const { killSwitchGuard } = require("./middlewares/killswitchmiddleware");
const crypto = require('crypto');
const Wallet = require('./model/walletmodel');


require('dotenv').config();
//connect to db
connectDB();

const limit = rateLimit({
  max: 5000,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth routes
const authLimit = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts.",
});
app.set('trust proxy', 1);
app.use(ipBlockMiddleware);
app.use("/api", killSwitchGuard("global"));

app.use(helmet());
app.use(express.static('public'));
app.use(cors(
    {origin: "*", methods: ['GET','POST','PUT', 'PATCH', 'DELETE'], credentials:true, allowedHeaders: ['Content-Type','Authorization']}
));
app.use(morgan('tiny'));
app.use(express.json({ limit: '10mb' }));   
app.post('/webhook/paystack', async (req, res) => {
  // verify it's really from Paystack
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.sendStatus(401);
  }

  // acknowledge immediately so Paystack doesn't retry
  res.sendStatus(200);

  const { event, data } = req.body;
  if (event !== 'charge.success') return;

  try {
    const reference = data.reference;
    const userId = data.metadata?.userId;      // set in initializePayment
    const amountPaid = data.amount / 100;
    if (!userId) return;

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) wallet = await Wallet.create({ userId, balance: 0, transactions: [] });

    // idempotency: Paystack can deliver the same event more than once
    if (wallet.transactions.some((tx) => tx.reference === reference)) return;

    wallet.transactions.push({
      type: 'Wallet_Funded',
      network: 'paystack',
      phoneOrAccount: data.customer?.email,
      amount: amountPaid,
      costPrice: amountPaid,
      sellingPrice: amountPaid,
      profit: 0,
      reference,
      status: 'success',
    });
    wallet.balance += amountPaid;
    await wallet.save();
  } catch (err) {
    console.error('Paystack webhook error:', err);
  }
});     
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(sanitizeInput);               

// ─── Rate limits BEFORE routes ────────────────────────────────
app.use('/api/v2/auth', authLimit); 
app.use('/api', limit);                           




app.use('/api/v2', indexRouter);   

app.use(Logger.logRequest);





app.get('/', (req, res) => {
  res.send('Welcome to DATA EASE  API SERVER');
});

// Paystack redirects here after payment
app.get('/payment/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

app.listen(port, ()=>{
    console.log(`server running at http://localhost:${port}`)
});