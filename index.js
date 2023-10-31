const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    // 'http://localhost:5173'
    'https://car-doctor-6154d.web.app',
    'car-doctor-6154d.firebaseapp.com'
    // 'https://car-doctor-6154d.web.app/'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l9mlnno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares

const logger = (req, res, next) => {
  console.log('hellovai', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in middleware', token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db("cardoctorDB").collection("services")
    const checkoutCollection = client.db("cardoctorDB").collection("checkout")

    // for auth api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      }).send({ success: true })

    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    // for services
    app.get('/services', async (req, res) => {
      const service = serviceCollection.find();
      const result = await service.toArray();
      res.send(result)
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      // const options = {

      //   // Include only the `title` and `imdb` fields in the returned document
      //   projection: { title: 1, price: 1, service_id: 1 },
      // };
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })


    // for checkout 

    app.post('/checkout', async (req, res) => {
      const newCheckout = req.body;
      const result = await checkoutCollection.insertOne(newCheckout);
      res.send(result);
    })

    app.get('/checkout', async (req, res) => {
      const ckeckout = await checkoutCollection.find().toArray();
      res.send(ckeckout)
    })

    app.get('/checkout/:email', logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log('token owner', req.user);
      if(req.user.email !== email){
        return res.status(403).send({message: "forbiden access"})
      }
      const query = { email: email };
      const result = await checkoutCollection.find(query).toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is runing');
})
app.listen(port, () => {
  console.log(`server runing on port : ${port}`);
})