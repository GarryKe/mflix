require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const _ = require('lodash');
const LocalStrategy = require('passport-local').Strategy;
const app = express();
const PORT = 3000;
const uri = process.env.URL;
// Access the 'movies' collection directly
const Movie = mongoose.model('Movie', new mongoose.Schema({}, { strict: false }), 'movies');
const Comment = mongoose.model('Comment',new mongoose.Schema({},{ strict: false }),'comments');
// Enable CORS for all routes
app.use(cors());
// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => console.log(err));
// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));//handles form submissions
app.set('view engine', 'ejs');//handles dynamic pages
app.use(express.static(path.join(__dirname, 'public')));//habdles static files e.g css and images

// Session management=>Handles sessions securely
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false
}));

// Serve static files from the 'views' directory
app.use(express.static(path.join(__dirname, 'views')));

// Serve your data.json
app.get('/data.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'data.json'));
});
// Serve the main page (Home)
app.get('/', async (req, res) => {
    try {
        // Fetch data for Home (Trending, New Releases, Top Rated)
        const [trending, newReleases, topRated,topPicks] = await Promise.all([
            Movie.find({
                'directors': { $exists: true, $ne: '' }, // Ensures the directors field is not empty
                'cast': { $exists: true, $ne: '' }, // Ensures the cast field is not empty
                'plot': { $exists: true, $ne: '' }, // Ensures the plot field is not empty
                'imdb.votes': { $exists: true },
                'poster': { $exists: true, $ne: '' }, // Ensures the poster field is not empty
                'imdb.rating': { $exists: true, $ne: '' } // Ensures the rating field is not empty
            })
                .sort({ 'imdb.votes': -1 })
                .limit(10),
            Movie.find({
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'released': { $exists: true },
                'poster': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' }
            })
                .sort({ released: -1 })
                .limit(10),
            Movie.find({
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' },
                'poster': { $exists: true, $ne: '' }
            })
                .sort({ 'imdb.rating': -1 })
                .limit(10),
            Movie.find({
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'tomatoes.viewer.numReviews': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' }
            })
                .sort({ 'tomatoes.viewer.numReviews': -1,'imdb.rating':-1})  // Sort by votes (desc), then by rating (desc)
                .limit(10)
        ]);
        // Render the page and pass the data to the EJS template
        res.render('index', {
            trending,
            newReleases,
            topRated,
            topPicks,
            activePage: 'home'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching movie data.');
    }
});
//tv shows route
app.get('/tvshows', async (req, res) => {
    const movies = await Movie.find({
        'directors': { $exists: true, $ne: '' },
        'cast': { $exists: true, $ne: '' },
        'plot': { $exists: true, $ne: '' },
        'imdb.votes': { $exists: true },
        'poster': { $exists: true, $ne: '' },
        'imdb.rating': { $exists: true, $ne: '' },
        type:'tvshow'
    })
    .sort({ 'imdb.rating': -1 })
    .limit(20);
    res.render('tvshows',{
        activePage:'tvshows',
        category:'tvshows',
        movieId: movies.id,
        movies:movies
    });
});
//movies route
app.get('/movies', async (req, res) => {
    const movies = await Movie.find({
        'directors': { $exists: true, $ne: '' },
        'cast': { $exists: true, $ne: '' },
        'plot': { $exists: true, $ne: '' },
        'imdb.votes': { $exists: true },
        'poster': { $exists: true, $ne: '' },
        'imdb.rating': { $exists: true, $ne: '' },
        type:'movie'
    })
    .sort({ 'imdb.rating': -1 })
    .limit(20);
    res.render('movies',{
        movies:movies,
        activePage:'movies',
        category:'movies',
        movieId: movies.id
    });
});
//recently added route
app.get('/recentlyadded', async (req, res) => {
    const movies = await Movie.find({
        'directors': { $exists: true, $ne: '' },
        'cast': { $exists: true, $ne: '' },
        'plot': { $exists: true, $ne: '' },
        'imdb.votes': { $exists: true },
        'poster': { $exists: true, $ne: '' },
        'imdb.rating': { $exists: true, $ne: '' }
    })
    .sort({ released: -1 })
    .limit(20);
    res.render('recentlyadded',{
        activePage:'recentlyadded',
        category:'recentlyadded',
        movies:movies,
        movieId: movies.id
    });
});
// my list route
app.get('/mylist', async (req, res) => {
    res.render('mylist',{
        activePage:'mylist',
        category:'mylist'
    });
});
//home route
app.get('/home', async (req, res) => {
    res.redirect('/');
});
//load more route
app.get('/load-more', async (req, res) => {
    const { category, offset, limit } = req.query;

    try {
        let query = {};
        if (category === 'trending') {
            query = {
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'imdb.votes': { $exists: true },
                'poster': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' }
            };
        } else if (category === 'new') {
            query = {
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'released': { $exists: true },
                'poster': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' }
            };
        } else if (category === 'top-rated') {
            query = {
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' },
                'poster': { $exists: true, $ne: '' }
            };
        }
        else if (category === 'picks') {
            query = {
                'directors': { $exists: true, $ne: '' },
                'cast': { $exists: true, $ne: '' },
                'plot': { $exists: true, $ne: '' },
                'imdb.rating': { $exists: true, $ne: '' },
                'poster': { $exists: true, $ne: '' }
            };
        }
        

        const movies = await Movie.find(query)
            .sort(category === 'top-rated' ? { 'imdb.rating': -1 } : { released: -1 })
            .skip(Number(offset))
            .limit(Number(limit));

        res.json({ movies });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading more items.');
    }
});
// Route to serve the movie details page
app.get('/details/:id', async (req, res) => {
    const movieId = req.params.id; // Get the movie ID from the URL parameter
    try {
        // Find the movie by its _id
        const movie = await Movie.findById(movieId);
        const objectId = new mongoose.Types.ObjectId(movieId);
        const totalComments = await Comment.countDocuments({ movie_id: objectId });
        const comments = await Comment.find({movie_id:objectId}).limit(5);
        let spinner_appear = totalComments > 5 ? 'flex':'none';
        if (!movie) {
            return res.status(404).send('Movie not found');
        }
        // Render the movie details page and pass the movie data
        res.render('details', {
            movie:movie,
            comments:comments,
            category: 'details',
            movieId: objectId,
            spinner_appear,
            activePage: 'details'
        });
    } catch (err) {
        //console.error(err);
        res.status(500).send('Error retrieving movie details');
    }
});
//route to load more comments
app.get('/load-more-comments',async (req,res)=>{
    const {movieId,offset,limit} = req.query;
    try{
        const objectId = new mongoose.Types.ObjectId(movieId);
        const comments = await Comment.find({movie_id:objectId}).skip(Number(offset)).limit(Number(limit));
        res.json({comments});
    }catch(err){
        console.error(err);
        res.status(500).send('Error loading more comments');
    }
});
//Route to load more-like-this movies
app.get('/more-like-this', async (req, res) => {
    try {
        const { movieId, offset = 0, limit = 10 } = req.query;

        const response = await client.search({
            index: 'movies',
            body: {
                from: parseInt(offset, 10),
                size: parseInt(limit, 10),
                query: {
                    more_like_this: {
                        fields: ['directors', 'fullplot', 'cast', 'genres'],
                        like: {
                            _index: 'movies',
                            _id: movieId
                        },
                        min_term_freq: 1,
                        min_doc_freq: 1,
                        max_query_terms: 2,
                        minimum_should_match: "35%"
                    }
                },
                sort: [
                    { '_score': { order: 'desc' } }
                ]
            }
        });
        
        // Adding nested response parsing:
        var hitsArray = response.hits?.hits || response.body?.hits?.hits || [];
        if (hitsArray.length === 0) {
            console.error('No hits found.');
            res.status(404).send('No similar movies found.');
            return;
        }
        const totalSimilarItems = response.hits?.total?.value || response.body?.hits?.total?.value || 0;
        res.json({ total:totalSimilarItems, movies: hitsArray.map(hit => hit._source) });
        /*res.json(hitsArray.map(hit => hit._source));*/
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading similar movies');
    }
});
//route to load more items in categories
app.get('/load-more-category',async (req,res) => {
    var { category, offset = 0, limit = 20, genre } = req.query;
    var movies = "";
    genre = JSON.parse(decodeURIComponent(genre));
    try {
        let query = {};
        if (category === 'movies') {
            if(genre.length > 0){
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'movie',
                    genres: { $all: genre }
                };
            }else{
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'movie'
                };
            }
            movies = await Movie.find(query)
                        .sort({ 'imdb.rating': -1 })
                        .skip(Number(offset))
                        .limit(Number(limit));
        } else if (category === 'tvshows') {
            if(genre.length > 0){
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'tvshow',
                    genres: { $all: genre }
                };
            }else{
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'tvshow'
                };
            }
            movies = await Movie.find(query)
                        .sort({ 'imdb.rating': -1 })
                        .skip(Number(offset))
                        .limit(Number(limit));
        } else if (category === 'recentlyadded') {
            if(genre.length > 0){
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    genres: { $all: genre }
                };
            }else{
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' }
                };
            }
            movies = await Movie.find(query)
                        .sort({ 'imdb.rating': -1 })
                        .skip(Number(offset))
                        .limit(Number(limit));
        }else if (category === 'mylist') {
            if(genre.length > 0){
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'mylist',
                    genres: { $all: genre }
                };
            }else{
                query = {
                    'directors': { $exists: true, $ne: '' },
                    'cast': { $exists: true, $ne: '' },
                    'plot': { $exists: true, $ne: '' },
                    'imdb.votes': { $exists: true },
                    'poster': { $exists: true, $ne: '' },
                    'imdb.rating': { $exists: true, $ne: '' },
                    type:'mylist'
                };
            }
            movies = await Movie.find(query)
                        .sort({ 'imdb.rating': -1 })
                        .skip(Number(offset))
                        .limit(Number(limit));
        }

        res.json({ movies });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading more items.');
    }
});
// Search endpoint
app.get("/search", async (req, res) => {
  const query = req.query.q || "";
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const result = await client.search({
        index: "movies", // Elasticsearch index name
        size: 20, // Limit to 20 results
        query: {
          match: {
            title: {
              query: query, // The query string you want to search for
              fuzziness: "AUTO", // Automatically applies fuzziness based on the term length
              prefix_length: 1, // Optional: this skips the first character for fuzziness (increases speed)
            }
          }
        },
        sort: [
          { "_score": { order: "desc" } } // Sort by relevance score, descending
        ]
      });           
    var hitsArray = result.hits?.hits || result.body?.hits?.hits || [];
    res.json(hitsArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while searching" });
  }
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
