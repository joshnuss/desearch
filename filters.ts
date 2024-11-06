export interface Field {
  field: string
  op: '=' | '<' | '<=' | '>' | '>='
  value: unknown
}

export interface Between {
  field: string
  op: 'between'
  values: Array<unknown>
}

export interface Condition {
  op: 'and' | 'or'
  conditions: Filter[]
}

export interface Not {
  op: 'not'
  condition: Filter
}

export type Filter = Field
  | Between
  | Condition
  | Not

function format(...filters: Filter[]): string {
  const expressions: string[] = []

  filters.forEach(filter => {
    switch (filter.op) {
      case '=':
        expressions.push(`${filter.field}:${filter.value}`)
        break
      case '<':
      case '<=':
      case '>':
      case '>=':
        expressions.push(`${filter.field} ${filter.op} ${filter.value}`)
        break

      case 'not': 
        expressions.push(`NOT(${format(filter.condition)})`)
        break

      case 'and':
      case 'or':
        expressions.push('(' + filter.conditions.map(condition => format(condition)).join(` ${filter.op.toUpperCase()} `) + ')')
        break
    }
  })

  return expressions.join(' AND ')
}

function eq(field: string, value: unknown): Filter {
  return { field, op: '=', value}
}

function gt(field: string, value: unknown): Filter {
  return { field, op: '>', value}
}

function gte(field: string, value: unknown): Filter {
  return { field, op: '>=', value}
}

function lt(field: string, value: unknown): Filter {
  return { field, op: '<', value}
}

function lte(field: string, value: unknown): Filter {
  return { field, op: '<=', value}
}

function not(condition: Filter): Filter {
  return { op: 'not', condition }
}

function and(...conditions: Filter[]): Filter {
  return { op: 'and', conditions }
}

function or(...conditions: Filter[]): Filter {
  return { op: 'or', conditions }
}

console.log(format(
  not(
  or(
    eq('tags', 'svelte'),
    eq('author', 'josh'),
  )),
))

