const axios = require('axios');
const lodash = require('lodash');
const db = require('../models');

/**
 * Mapping the top 100 games files with the platform
 */
const topGamesBuckets = new Map([
    ['android', 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json'],
    ['ios', 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json']
  ])


const retrieveGames = (req, res) => db.Game.findAll()
.then(games => res.send(games))
.catch((err) => {
  console.log('There was an error querying games', JSON.stringify(err));
  return res.send(err);
})

const createGame = (req, res) => {
    const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
    return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
      .then(game => res.send(game))
      .catch((err) => {
        console.log('***There was an error creating a game', JSON.stringify(err));
        return res.status(400).send(err);
      });
  }

const deleteGame = (req, res) => {
    // eslint-disable-next-line radix
    const id = parseInt(req.params.id);
    return db.Game.findByPk(id)
      .then(game => game.destroy({ force: true }))
      .then(() => res.send({ id }))
      .catch((err) => {
        console.log('***Error deleting game', JSON.stringify(err));
        res.status(400).send(err);
      });
  }

const updateGame = (req, res) => {
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
  }

/**
 * Search and return games using the criteria given in the request body 
 * @returns {*} game entities
 */
const searchGames = async (req, res) => {
    try {
      const Op = db.Sequelize.Op;
      const { name = null, platform = null } = req.body

      let games = null
      // No search specified cases
      if (!name && !platform) {
        games = await db.Game.findAll()
      } else if (name && !platform) {
        games = await db.Game.findAll({ where: { 
            name: { [Op.like]: `%${name}%` } 
        }         
        })
      } else if (!name && platform) {
        games = await db.Game.findAll({ where: {
              platform
          }
        })
      } else {
        // Query the entities with the given criteria
        games = await db.Game.findAll({ where: {
        [Op.and]: [
          {platform},
          { name: { [Op.like]: `%${name}%` } }
        ]
        }
      })      
    }
    return res.send(games)
    } catch (error) {
      console.log('***Error searching games', JSON.stringify(error));
      res.status(400).send(error);
    }
  }

  const populateDatabaseWithGames = async (req, res) => {
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
  }

//   const populateDatabaseWithGamesInBulk = async (req, res) => {
//     const transaction = await db.sequelize.transaction()
//     try {
//         const allFormattedGames = []
//       for (const [currentPlatform, bucketUri] of topGamesBuckets) {
//         console.log(`Querying data for ${currentPlatform} platform...`)
//         const { data: topGamesJSON } = await axios({ 
//           url: bucketUri
//          })
//          if (!topGamesJSON || !topGamesJSON.length) throw new Error('ERR_NO_DATA_FOUND')
//          for (const topGames of topGamesJSON) {
//           for (const topGame of topGames) {
//             if (!topGame || lodash.isEmpty(topGame)) continue
//             const { 
//               publisher_id: publisherId, 
//               name, 
//               os: platform, 
//               bundle_id: bundleId, 
//               version: appVersion, 
//               appId: storeId 
//             } = topGame
//             const game = { publisherId, name, platform, bundleId, appVersion, storeId, isPublished: true }
//             allFormattedGames.push(game)
//           }
//          }
//       }
//       await db.Game.bulkCreate(allFormattedGames, { transaction })
//       await transaction.commit()
//       return res.send({ updated: true })
  
//     } catch (error) {
//       await transaction.rollback()
//       console.error('***Error populating database', error);
//       return res.status(400).send(error);
//     }
//   }

module.exports = { 
    retrieveGames,
    createGame,
    deleteGame,
    updateGame,
    searchGames,
    populateDatabaseWithGames
 }