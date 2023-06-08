const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


// middle ware 
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

        const usersCollection = client.db("sportsDb").collection("users");
        const instructorsCollection = client.db("sportsDb").collection("instructors");
        const classesCollection = client.db("sportsDb").collection("classes");
        const selectedClassCollection = client.db("sportsDb").collection("selected-class");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send(token)
        })


        // Users Related APIs

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })




        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'User All Ready Exist ' })
            }


            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.patch('/users/vip/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    role: req.body.role
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })







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


        app.delete('/class-carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await selectedClassCollection.deleteOne(query);
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
