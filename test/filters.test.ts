import { eq, neq, gt, gte, lt, lte, between, not, and, or } from '../src/filters.js'

describe('filters', () => {
  test('eq returns field filter', () => {
    const filter = eq('author', 'josh')

    expect(filter).toEqual({
      op: '=',
      field: 'author',
      value: 'josh'
    })
  })

  test('neq returns field filter', () => {
    const filter = neq('author', 'josh')

    expect(filter).toEqual({
      op: '!=',
      field: 'author',
      value: 'josh'
    })
  })

  test('gt returns field filter', () => {
    const filter = gt('price', 10)

    expect(filter).toEqual({
      op: '>',
      field: 'price',
      value: 10
    })
  })

  test('gte returns field filter', () => {
    const filter = gte('price', 10)

    expect(filter).toEqual({
      op: '>=',
      field: 'price',
      value: 10
    })
  })

  test('lt returns field filter', () => {
    const filter = lt('price', 10)

    expect(filter).toEqual({
      op: '<',
      field: 'price',
      value: 10
    })
  })

  test('lte returns field filter', () => {
    const filter = lte('price', 10)

    expect(filter).toEqual({
      op: '<=',
      field: 'price',
      value: 10
    })
  })

  test('not returns field filter', () => {
    const filter = not(lt('price', 10))

    expect(filter).toEqual({
      op: 'not',
      condition: {
        op: '<',
        field: 'price',
        value: 10
      }
    })
  })

  test('between returns filter', () => {
    const filter = between('price', 10, 30)

    expect(filter).toEqual({
      op: 'between',
      field: 'price',
      values: [10, 30]
    })
  })

  test('and returns condition filter', () => {
    const filter = and(
      eq('author', 'josh'),
      lt('price', 10)
    )

    expect(filter).toEqual({
      op: 'and',
      conditions: [
        {
          op: '=',
          field: 'author',
          value: 'josh'
        },
        {
          op: '<',
          field: 'price',
          value: 10
        }
      ]
    })
  })

  test('or returns condition filter', () => {
    const filter = or(
      eq('author', 'josh'),
      lt('price', 10)
    )

    expect(filter).toEqual({
      op: 'or',
      conditions: [
        {
          op: '=',
          field: 'author',
          value: 'josh'
        },
        {
          op: '<',
          field: 'price',
          value: 10
        }
      ]
    })
  })
})
