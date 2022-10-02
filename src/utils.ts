import { json } from 'itty-router-extras'
import type {
  CloudflareGdriveResponse,
  CloudflareGdriveResponseItem,
} from './types'

interface ToString {
  toString: () => string
}

export const URLSearchParamsFromObject = (record: Record<string, ToString>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(record)) {
    search.append(key, value.toString())
  }

  return search
}

export const responseFromItem = (
  item: CloudflareGdriveResponseItem | CloudflareGdriveResponseItem[]
): Response => {
  const items = Array.isArray(item) ? item : [item]
  const response: CloudflareGdriveResponse = { items }

  return json(response)
}
