export interface Field {
  field: string
  op: '=' | '!=' | '<' | '<=' | '>' | '>='
  value: unknown
}

export interface Between {
  field: string
  op: 'between'
  values: [unknown, unknown]
}

export interface Condition {
  op: 'and' | 'or'
  conditions: Filter[]
}

export interface Not {
  op: 'not'
  condition: Filter
}

export type Filter = Field | Between | Condition | Not

export function eq(field: string, value: unknown): Field {
  return { field, op: '=', value }
}

export function neq(field: string, value: unknown): Field {
  return { field, op: '!=', value }
}

export function gt(field: string, value: unknown): Field {
  return { field, op: '>', value }
}

export function gte(field: string, value: unknown): Field {
  return { field, op: '>=', value }
}

export function lt(field: string, value: unknown): Field {
  return { field, op: '<', value }
}

export function lte(field: string, value: unknown): Field {
  return { field, op: '<=', value }
}

export function between(field: string, min: unknown, max: unknown): Between {
  return { field, op: 'between', values: [min, max] }
}

export function not(condition: Filter): Not {
  return { op: 'not', condition }
}

export function and(...conditions: Filter[]): Condition {
  return { op: 'and', conditions }
}

export function or(...conditions: Filter[]): Condition {
  return { op: 'or', conditions }
}
