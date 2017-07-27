const should = require('should')
const { execFile } = require('child_process')
const WebSocket = require('ws')
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

  after(() => setTimeout(() => server.close(), 2000))

  it('Server should exist', done => {
    server.should.exist

    done()
  })


  it('Client should successfully create new game', done => {
    let client = new WebSocket(`http://localhost:9001`)

    client.on('message', function (data) {
      data.should.exist
      let params = JSON.parse(data)
      if (params.method === 'create') {
        params.should.have.property('gameId')
        params.gameId.length.should.be.equal(36)
        gameId = params.gameId
        clientA = client
        done()
      }
    })

    client.on('open', function() {
      client.send(JSON.stringify({method: 'create'}))
    })
  })

  it('Client should successfully join game', done => {
    let client = new WebSocket(`http://localhost:9001`)

    clientA.removeEventListener('message')

    clientA.on('message', function (data) {
      data.should.exist
      let params = JSON.parse(data)

      if (params.method === 'start') {
        params.grid.length.should.be.equal(10)

        params.grid.forEach(row => {
          row.length.should.be.equal(10)
        })
        clientAData = params
      }
    })

    client.on('message', data => {
      let params = JSON.parse(data)
      if (params.method === 'games available') {
        client.send(JSON.stringify({
          method: 'join',
          gameId
        }))
      } else if (params.method === 'join') {
        clientB = client

        params.grid.length.should.be.equal(10)

        params.grid.forEach(row => {
          row.length.should.be.equal(10)
        })

        clientBData = params
        done()
      }
    })

    client.on('open', function() {
      client.send(JSON.stringify({method: 'join', gameId}))
    })
  })

  it('Client should get error when it\'s not his turn', done => {
    let client = clientAData.myTurn
        ? clientB
        : clientA

    client.removeEventListener('message')

    client.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)
      if (params.method == 'turn') {

        params.should.have.property('error')

        done()
      }
    })

    client.send(JSON.stringify({method: 'turn', gameId, x: 0, y: 5}))
  })

  let player
  let opponent
  let playerGrid
  let opponentGrid

  it('Player should successfully make a turn and miss', done => {
    [player, opponent,
     playerGrid, opponentGrid] = clientAData.myTurn
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

    player.removeEventListener('message')

    player.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.equal(false)
        done()
      }
    })

    player.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))
  })

  it('Opponent should successfully make a turn and miss', done => {
    opponent.removeEventListener('message')

    let x = 0
    let y

    for (let i in playerGrid[0]) {
      if (playerGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    opponent.on('message', data => {
      data.should.exist
      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.equal(false)
        done()
      }

    })

    opponent.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))
  })

  it('Player should successfully make a turn and hit', done => {
    player.removeEventListener('message')

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

    player.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.true
        done()
      }

    })

    player.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))
  })

  it('Player should successfully make another turn after hit', done => {
    player.removeEventListener('message')

    let x = 0
    let y

    for (let i in opponentGrid[0]) {
      if (opponentGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    player.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.false()
        done()
      }

    })

    player.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))

  })

  it('Opponent should successfully make a turn and hit', done => {
    opponent.removeEventListener('message')

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

    opponent.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.true()
        done()
      }

    })

    opponent.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))

  })

  it('Opponent should successfully make another turn after hit', done => {
    opponent.removeEventListener('message')

    let x = 0
    let y

    for (let i in playerGrid[0]) {
      if (playerGrid[0][i] == 0) {
        y = +i
        break
      }
    }

    opponent.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'turn') {
        params.should.have.properties([
          'x', 'y', 'hit'
        ])

        params.hit.should.be.false()
        done()
      }

    })

    opponent.send(JSON.stringify({
      method: 'turn',
      gameId,
      x,
      y
    }))

  })
  it('Opponent should get error on player disconnect', done => {
    opponent.removeEventListener('message')

    opponent.on('message', data => {
      data.should.exist

      let params = JSON.parse(data)

      if (params.method === 'game error') {
        params.should.have.property('error')

        done()
      }

    })


    player.close()
  })
})
