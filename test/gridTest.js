const should = require('should')
const { generateRandomGrid,
        generateVesselsMap,
        validateGrid,
        generateEmptyGrid } = require('../src/helpers')

describe('Grid helpers test', () => {
  let validGrid
  let invalidGrid

  it('Should generate valid empty grid', done => {
    let emptyGrid = generateEmptyGrid()

    emptyGrid.should.be.Array()
    emptyGrid.length.should.be.equal(10)

    emptyGrid.forEach(row => {
      row.should.be.Array()
      row.length.should.be.equal(10)

      row.forEach(cell => {
        cell.should.be.Number()
        cell.should.be.equal(0)
      })
    })

    done()
  })

  it('Should validate valid random grid', done => {
    let grid = generateRandomGrid()

    let valid = validateGrid(grid)

    should(valid).exist
    should(valid).be.equal(true)

    done()
  })

  it('Should return "false" for invalid grid', done => {
    let grid = generateEmptyGrid()

    let valid = validateGrid(grid)

    should(valid).be.equal(false)

    grid.forEach(row => {
      row.forEach((v, i) => {
        row[i] = 1
      })
    })

    valid = validateGrid(grid)
    should(valid).be.equal(false)

    grid = generateRandomGrid()

    grid[0].forEach((v, i) => {
      grid[0][i] = 1
    })

    valid = validateGrid(grid)
    should(valid).be.equal(false)

    done()
  })
})
