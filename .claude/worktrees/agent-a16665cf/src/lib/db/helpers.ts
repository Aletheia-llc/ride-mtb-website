import 'server-only'

export function paginate(page: number = 1, pageSize: number = 25) {
  return {
    take: pageSize,
    skip: (page - 1) * pageSize,
  }
}
