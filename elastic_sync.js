require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require('@elastic/elasticsearch');
const Transform = require("stream").Transform;

const mongoUri = process.env.URL;
const esUri = "http://localhost:9200";
const indexName = "movies";

const movieMappings = {
    "properties": {
        "title": { "type": "text" },
        "fullplot": { "type": "text" },
        "genres": { "type": "keyword" },
        "directors": { "type": "keyword" },
        "cast": { "type": "text" },
        "poster": { "type": "text" },
        "imdb": { "type": "object" },
        "last_sync_at": { "type": "date" }
    }
};

let esClient = new Client({ node: esUri });

async function connectToMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    return client.db("sample_mflix");
}

async function setupElasticsearchIndex() {
    const indexExists = await esClient.indices.exists({ index: indexName });
    if (!indexExists) {
        await esClient.indices.create({
            index: indexName,
            body: { mappings: movieMappings }
        });
    }
}

const transformStream = new Transform({
    objectMode: true,
    transform(movie, _, callback) {
        movie.last_sync_at = new Date();
        this.push(movie);
        callback();
    }
});

async function fetchAndSyncMovies(db, lastId) {
    const collection = db.collection("movies");
    const query = lastId ? { '_id': { $gt: lastId } } : {};
    const projection = {
        _id: 1,
        title: 1,
        fullplot: 1,
        genres: 1,
        directors: 1,
        cast: 1,
        poster: 1,
        imdb: 1 // Include any other fields you need
    };
    const cursor = collection.find(query).project(projection).stream();

    await esClient.helpers.bulk({
        datasource: cursor.pipe(transformStream),
        onDocument(doc) {
            const id = doc._id;
            doc.id = id.toString();
            delete doc._id;
            return { index: { _index: indexName, _id: id } };
        },
        onDrop(doc) {
            console.error("Failed to index document:", doc);
        }
    });
}

async function getLastSyncedId() {
    const result = await esClient.search({
        index: indexName,
        body: {
            size: 1,
            sort: [{ last_sync_at: { order: "desc" } }],
            _source: ["_id"]
        }
    });
    return result.hits.hits.length ? result.hits.hits[0]._id : null;
}

(async function sync() {
    try {
        const db = await connectToMongo();
        await setupElasticsearchIndex();
        const lastId = await getLastSyncedId();
        await fetchAndSyncMovies(db, lastId);
        console.log("Sync completed.");
    } catch (error) {
        console.error("Error during sync:", error);
    } finally {
        process.exit();
    }
})();