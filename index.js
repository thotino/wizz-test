const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models')
// The handler functions
const { 
  retrieveGames, 
  createGame, 
  deleteGame, 
  updateGame, 
  searchGames, 
  populateDatabaseWithGames
} = require('./controllers')

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', retrieveGames);

app.post('/api/games', createGame);

app.delete('/api/games/:id', deleteGame);

app.put('/api/games/:id', updateGame);

app.post('/api/games/search', searchGames)

app.post('/api/games/populate', populateDatabaseWithGames)

app.listen(3000, async () => {
  console.log('Server is up on port 3000');
  await db.sequelize.sync();
});

module.exports = app;
