const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const lodash = require('lodash');
const db = require('./models');

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
    const Op = db.Sequelize.Op;
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
const topGamesBuckets = new Map([
  ['android', 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json'],
  ['ios', 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json']
])
app.post('/api/games/populate', async (req, res) => {
  const transaction = await db.sequelize.transaction()
  try {
    for (const [currentPlatform, bucketUri] of topGamesBuckets) {
      console.log(`Querying data for ${currentPlatform} platform...`)
      const { data: topGamesJSON } = await axios({ 
        url: bucketUri
       })
       if (!topGamesJSON || !topGamesJSON.length) throw new Error('ERR_NO_DATA_FOUND')
       for (const topGames of topGamesJSON) {
        for (const topGame of topGames) {
          if (!topGame || lodash.isEmpty(topGame)) continue
          const { 
            publisher_id: publisherId, 
            name, 
            os: platform, 
            bundle_id: bundleId, 
            version: appVersion, 
            appId: storeId 
          } = topGame
          const game = { publisherId, name, platform, bundleId, appVersion, storeId, isPublished: true }
          console.log({ game })
          await db.Game.findOrCreate({ where: { ...game }, defaults: { ...game }, transaction })
        }
       }
    }

    await transaction.commit()
    return res.send({ updated: true })
    
  } catch (error) {
    await transaction.rollback()
    console.error('***Error populating database', error);
    return res.status(400).send(error);
  }
})

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
