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
