const should = require('should')
const { generateRandomGrid, validateGrid, generateEmptyGrid } = require('../src/helpers');

describe('Battleship test', () => {
  it('Should validate valid grid', done => {
    let grid = generateRandomGrid()

    let valid = validateGrid(grid)

    should(valid).exist
    should(valid).have.properties(['grid', 'vessels'])
    done()
  })

  it('Should not validate invalid grid', done => {
    let grid = generateEmptyGrid()
    
    let valid = validateGrid(grid)

    should(valid).be.equal(false)

    grid.forEach(row => {
      row.forEach((v, i) => {
        row[i] = 1
      })
    })

    valid = validateGrid(grid)
    

    grid = generateRandomGrid()

    grid[0].forEach((v, i) => {
      grid[0][i] = 1
    })

    valid = validateGrid(grid)
    should(valid).be.equal(false)
    
    done()
  })
})
