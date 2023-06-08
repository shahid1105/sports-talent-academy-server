const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middle ware 
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.08jlhdc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const instructorsCollection = client.db("sportsDb").collection("instructors");
        const classesCollection = client.db("sportsDb").collection("classes");
        const selectedClassCollection = client.db("sportsDb").collection("selected-class");

        // instructors api
        app.get("/instructors", async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result)
        })

        // classes api
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })


        // selected class collection related

        app.get('/class-carts', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const query = { email: email };
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/class-cart', async (req, res) => {
            const item = req.body;

            const result = await selectedClassCollection.insertOne(item);
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
    res.send('sports is running')
})

app.listen(port, () => {
    console.log(`sports is running on port ${port}`);
})
