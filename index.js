const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const app = express();
const port = process.env.PORT || 5000;


// middle ware 
app.use(cors())
app.use(express.json())



const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorize access user' })
    }

    // bearer token [bearer, token] 
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorize access' })
        }
        req.decoded = decoded;
        next()
    })

}




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
        // await client.connect();

        const usersCollection = client.db("sportsDb").collection("users");
        // const instructorsCollection = client.db("sportsDb").collection("instructors");
        // const classesCollection = client.db("sportsDb").collection("classes");
        const selectedClassCollection = client.db("sportsDb").collection("selected-class");
        const paymentCollection = client.db("sportsDb").collection("payments");
        const addAClassCollection = client.db("sportsDb").collection("add-a-class");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send(token)
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next()
        }


        //manage classes admin api 
        app.get('/manage-classes', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await addAClassCollection.find().toArray();
            res.send(result)
        })

        //manage classes update status
        app.patch('/manage-status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    status: req.body.role
                },
            };
            const result = await addAClassCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/manage-feedback/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    feedback: req.body.feedback
                },
            };
            const result = await addAClassCollection.updateOne(filter, updateDoc);
            res.send(result)
        })





        // Users Related APIs

        app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        //user post user collection all users here
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

        // for admin get
        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })

            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        // for instructor get
        app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                return res.send({ instructor: false })

            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })


        //users instructors show instructor page
        app.get('/users/instructors', async (req, res) => {
            const query = { role: 'instructor' };
            const instructors = await usersCollection.find(query).toArray();
            res.send(instructors);
        });


        // update user role
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





        // add a class api 
        app.post('/add-a-class', verifyJwt, async (req, res) => {
            const addClass = req.body;
            const result = await addAClassCollection.insertOne(addClass);
            // console.log(insertedResult);

            res.send(result)
        })


        // my classes get api
        app.get("/my-classes/:email", verifyJwt, async (req, res) => {
            const email = req.params.email;
            const result = await addAClassCollection.find({ instructorEmail: email }).toArray();

            res.send(result)
        })


        //admin api manage classes
        app.get('/manage-classes', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await addAClassCollection.find().toArray();
            res.send(result)
        })







        // classes api
        app.get('/classes', async (req, res) => {
            const result = await addAClassCollection.find({ status: "Approved" }).toArray();
            res.send(result);
        });



        app.patch('/updated-class/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const update = { $inc: { availableSeats: -1, totalEnrolled: 1 } };
            const option = { upsert: true }

            try {
                const result = await addAClassCollection.updateOne(filter, update, option);
                res.send(result);
            } catch (error) {
                console.log(error);
                res.status(500).send({ error: true, message: 'Failed to update class availability.' });
            }
        });







        // selected class collection related api // that means student api

        app.get('/class-carts', verifyJwt, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result)
        })

        //post select class in selected class collection
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



        // payment related api

        app.post('/cart-payments', verifyJwt, async (req, res) => {
            const payment = req.body;
            const insertedResult = await paymentCollection.insertOne(payment);
            // console.log(insertedResult);

            const query = { _id: new ObjectId(payment.singleDataItems) };

            const deleteResult = await selectedClassCollection.deleteOne(query)

            res.send({ insertedResult, deleteResult })
        })


        // enrolled classes api 
        app.get('/enrolled-classes', verifyJwt, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });

        // payment history get api in payment collection
        app.get('/payment-history', verifyJwt, async (req, res) => {

            const email = req.query.email;

            if (!email) {
                return res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };



            const result = await paymentCollection.find(query).sort({ date: -1 }).project({ userName: 1, email: 1, date: 1, transactionId: 1, price: 1 }).toArray();
            // console.log(result);
            res.send(result)
        })




        // get api for payment component a single data
        app.get("/payment/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) }

            const result = await selectedClassCollection.findOne(query);
            res.send(result)
        })


        // Create payment intent
        app.post('/create-payment-intent', verifyJwt, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            // console.log(amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })





        // popular classes based on student enrolled
        app.get("/popular-classes", async (req, res) => {
            const popularClasses = await addAClassCollection
                .aggregate([
                    {
                        $sort: {
                            totalEnrolled: -1,
                        },
                    },
                    {
                        $limit: 6,
                    },
                    {
                        $project: {
                            _id: 0,
                            className: 1,
                            instructorName: 1,
                            totalEnrolled: 1,
                            photoURL: 1,
                        },
                    },
                ])
                .toArray();

            res.json(popularClasses);
        });










        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
