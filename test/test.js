const should = require('should')
const { execFile } = require('child_process')

let server

let gameId
let clientA
let clientB
let clientAData
let clientBData
describe('Battleship test', () => {
  before(() => {
    server = require('../server')
  })

  after(() => setTimeout(() => server.close()))

  it('Server should exist', done => {
    server.should.exist

    done()
  })

  it('Client should connect to server and get welcome response', done => {
    let client = require('socket.io-client')(`http://localhost:8080`)

    client.on('welcome', function (data) {
      data.should.be.equal('Welcome to seabattle game!')

      done()
    })
  })

  it('Client should successfully create new game', done => {
    let client = require('socket.io-client')(`http://localhost:8080`)

    client.on('create', function (data) {
      data.should.have.property('gameId')
      data.gameId.length.should.be.equal(36)
      gameId = data.gameId
      clientA = client
      done()
    })

    client.emit('create')
  })

  it('Client should successfully join game', done => {
    let client = require('socket.io-client')(`http://localhost:8080`)

    client.on('games available', games => {
      client.emit('join', {gameId})
    })

    clientA.on('start', data => {
      data.should.exist
      data.grid.length.should.be.equal(10)

      data.grid.forEach(row => {
        row.length.should.be.equal(10)
      })
      clientAData = data
    })

    client.on('join', function (data) {
      data.should.have.properties(['info'])
      clientB = client
    })

    client.on('start', data => {
      data.should.exist
      data.grid.length.should.be.equal(10)

      data.grid.forEach(row => {
        row.length.should.be.equal(10)
      })

      clientBData = data
      done()
    })
  })

  it('Client should get error when it\'s not his turn', done => {
    let client = clientAData.move
        ? clientB
        : clientA

    client.on('turn', data => {
      data.should.exist
      data.should.have.property('error')

      done()
    })

    client.emit('turn', {gameId, x: 0, y: 5})
  })

  let player
  let opponent
  let playerGrid
  let opponentGrid

  it('Player should successfully make a turn and miss', done => {
    [player, opponent,
     playerGrid, opponentGrid] = clientAData.move
        ? [clientA, clientB, clientAData.grid, clientBData.grid]
        : [clientB, clientA, clientBData.grid, clientAData.grid]

    let x = 0
    let y

    for (let i in opponentGrid[0]) {
      if (opponentGrid[0][i] == 0) {
        y = i
        break
      }
    }

    player.removeListener('turn')

    player.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.equal(false)
      done()
    })

    player.emit('turn', {gameId, x, y})
  })

  it('Opponent should successfully make a turn and miss', done => {
    opponent.removeListener('turn')

    let x = 0
    let y

    for (let i in playerGrid[0]) {
      if (playerGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    opponent.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.equal(false)
      done()
    })

    opponent.emit('turn', {gameId, x, y})
  })

  it('Player should successfully make a turn and hit', done => {
    player.removeListener('turn')

    let x
    let y

    for (let i in opponentGrid) {
      for (let j in opponentGrid[i]) {
        if (opponentGrid[i][j] == 1) {
          y = +j
          x = +i
          break
        }
      }

      if (x) {
        break
      }
    }

    player.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.true
      done()
    })

    player.emit('turn', {gameId, x, y})
  })

  it('Player should successfully make another turn after hit', done => {
    player.removeListener('turn')

    let x = 0
    let y

    for (let i in opponentGrid[0]) {
      if (opponentGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    player.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.equal(false)
      done()
    })

    player.emit('turn', {gameId, x, y})
  })

  it('Opponent should successfully make a turn and hit', done => {
    opponent.removeListener('turn')

    let x
    let y

    for (let i in playerGrid) {
      for (let j in playerGrid[i]) {
        if (playerGrid[i][j] == 1) {
          y = +j
          x = +i
          break
        }
      }

      if (x) {
        break
      }
    }

    opponent.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.equal(true)
      done()
    })

    opponent.emit('turn', {gameId, x, y})
  })

  it('Opponent should successfully make another turn after hit', done => {
    opponent.removeListener('turn')

    let x = 0
    let y

    for (let i in playerGrid[0]) {
      if (playerGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    opponent.on('turn', data => {
      data.should.exist
      data.should.have.properties([
        'x', 'y', 'hit'
      ])

      data.hit.should.be.equal(false)
      done()
    })

    opponent.emit('turn', {gameId, x, y})
  })
})
