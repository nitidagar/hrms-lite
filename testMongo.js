const { MongoClient } = require("mongodb");

const uri = "mongodb://ndagar270_db_user:EbP1WApESR8N519F@cluster0-shard-00-00.jawut9y.mongodb.net:27017,cluster0-shard-00-01.jawut9y.mongodb.net:27017,cluster0-shard-00-02.jawut9y.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ Mongo Error:", err.message);
  } finally {
    await client.close();
  }
}

run();
