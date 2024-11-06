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
