const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const { Op } = require('sequelize');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then(games => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.post('/api/games/search', async (req, res) => {
  try {
    const { name = null, platform = null } = req.params
    // No search specified case
    if (!name || !platform) {
      const games = await db.Game.findAll()
      return res.send(games)
    }
    // Query the entities with the given criteria
    const games = await db.Game.findAll({ where: {
      [Op.and]: [
        {platform},
        { name: { [Op.like]: `%${name}%` } }
      ]
    } 
  })
  return res.send(games)
  } catch (error) {
    console.log('***Error searching games', JSON.stringify(error));
    res.status(400).send(error);
  }
})


app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
