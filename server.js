const uuid = require('uuid')
const {validateGrid} = require('./src/helpers')
const Database = require('nedb-promise')
const {Game, Player} = require('./src/game')

let Games = new Map()

let db = new Database({filename: './db/games', autoload: true})

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 9001 })

const DB_ERROR = 'DB_ERROR'
const INPUT_ERROR = 'INPUT_ERROR'
const JOIN_ERROR = 'JOIN_ERROR'
const OPPONENT_DISCONNECTED = 'OPPONENT_DISCONNECTED'

async function getAvailableGames () {
  return db.find({started: false}, {'playerA.grid': 0})
}

async function createHandler (socket, {grid, userName}) {
  if (grid && !validateGrid(grid)) {
    return {
      method: 'create',
      success: false,
      error: {
        code: INPUT_ERROR,
        message: 'Grid is not valid'
      }
    }
  }

  let gameId = uuid.v4()
  

  let gameObject = {
    _id: gameId,
    playerA: {
      id: socket.id,
      grid,
      userName
    },
    started: false,
    createdAt: Date.now()
  }

  try {
    await db.insert(gameObject)

    return {
      method: 'create',
      success: true,
      gameId
    }
  } catch (e) {
    return {
      method: 'create',
      success: false,
      error: {
        code: DB_ERROR,
        message: e.message
      }
    }
  }
}

async function joinHandler (socket, data) {
  if (!data || !data.gameId) {
    socket.send(JSON.stringify({
      method: 'join',
      success: false,
      error: {
        code: INPUT_ERROR,
        message: 'gameId not specified'
      }
    }))

    return
  }

  let gameData = await db.findOne({_id: data.gameId})

  let response
  if (!gameData) {
    response = {
      method: 'join',
      success: false,
      error: {
        code: INPUT_ERROR,
        message: 'Wrong game id'
      }
    }
  }

  if (gameData.started) {
    response = {
      method: 'join',
      success: false,
      error: {
        code: JOIN_ERROR,
        message: 'Cannot join, game in progress'
      }
    }
  } else {
    try {
      await db.update({_id: data.gameId}, {
        $set: {
          playerB: {
            id: socket.id,
            userName: data.userName,
            grid: data.grid
          },
          started: true
        }
      })
    } catch (e) {
      response = {
        success: false,
        error: {
          code: DB_ERROR,
          message: e.message
        }
      }
    }
  }

  if (!response) {
    let game = new Game(new Player(gameData.playerA.id,
                                   gameData.playerA.grid),
                        new Player(socket.id,
                                   data.grid))

    Games.set(data.gameId, game)

    let [a, b] = game.whoseTurn === socket.id
        ? [true, false]
        : [false, true]

    socket.send(JSON.stringify({
      method: 'join',
      success: true,
      myTurn:  a,
      gameId:  data.gameId,
      grid: game.playerB.grid,
      info: 'You successfully joined the game'
    }))

    for (let client of wss.clients) {
      if (client.id === game.playerA.id) {
        client.send(JSON.stringify({
          method: 'start',
          success: true,
          myTurn: b,
          gameId: data.gameId,
          grid: game.playerA.grid,
          info: 'Game started'
        }))
        break
      }
    }
  } else {
    socket.send(JSON.stringify(response))
  }
}

async function turnHandler (socket, data) {
  let game = Games.get(data.gameId)

  if (!game) {
    return {
      method: 'turn',
      success: false,
      error: {
        code: INPUT_ERROR,
        message: 'Game not exists'
      }
    }
  }

  let resp = game.turn(socket.id, data)

  resp.method = 'turn'
  resp.success = resp.error ? false : true
  return resp
}

wss.on('connection', async function (socket) {
  // assign unique id
  socket.id = uuid.v4()

  socket.on('close', async function () {
    let playerId = socket.id

    let gameData = await db.findOne({
      started: true,
      $or: [
        {
          'playerA.id': playerId
        },
        {
          'playerB.id': playerId
        }
      ]
    }, {
      'playerA.grid': 0,
      'playerB.grid': 0
    })

    if (!gameData) { // Nothing to do
      return
    }

    let opponentId = gameData.playerA.id === socket.id
        ? gameData.playerB.id
        : gameData.playerA.id

    for (let client of wss.clients) {
      if (client.id === opponentId) {
        client.send(JSON.stringify({
          method: 'game error',
          error: {
            code: OPPONENT_DISCONNECTED,
            message: 'Opponent disconnected, cannot continue.'
          }
        }))
        break
      }
    }

    try {
      await db.remove({_id: gameData._id})
      Games.delete(gameData._id)
    } catch (e) {
      // do something
    }
  })

  socket.on('message', async function (data) {
    let params

    try {
      params = JSON.parse(data)
    } catch (e) {
      socket.send(JSON.stringify({
        error: {
          code: INPUT_ERROR,
          message: 'Invalid JSON'
        }
      }))

      return
    }

    let response

    switch (params.method) {
      case 'create':
        response = await createHandler(socket, params)

        socket.send(JSON.stringify(response))
        break
      case 'join':
        await joinHandler(socket, params)
        break
      case 'turn':
        response = await turnHandler(socket, params)
        socket.send(JSON.stringify(response))

        break
      default:
        response = {
          method: params.method,
          success: false,
          error: {
            code: INPUT_ERROR,
            message: 'Wrong method'
          }
        }
        socket.send(JSON.stringify(response))
    }
  })

  socket.send(JSON.stringify({
    success: true,
    method: 'available games',
    games: await getAvailableGames()
  }))
})

module.exports = wss
