export interface Field {
  field: string
  op: '=' | '!=' | '<' | '<=' | '>' | '>='
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

export function eq(field: string, value: unknown): Filter {
  return { field, op: '=', value}
}

export function neq(field: string, value: unknown): Filter {
  return { field, op: '!=', value}
}

export function gt(field: string, value: unknown): Filter {
  return { field, op: '>', value}
}

export function gte(field: string, value: unknown): Filter {
  return { field, op: '>=', value}
}

export function lt(field: string, value: unknown): Filter {
  return { field, op: '<', value}
}

export function lte(field: string, value: unknown): Filter {
  return { field, op: '<=', value}
}

export function not(condition: Filter): Filter {
  return { op: 'not', condition }
}

export function and(...conditions: Filter[]): Filter {
  return { op: 'and', conditions }
}

export function or(...conditions: Filter[]): Filter {
  return { op: 'or', conditions }
}
