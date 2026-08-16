import { buptLibraryMetadataSeed, toBuptSeedBooks } from './buptMetadataSeed'

describe('BUPT metadata seed', () => {
  test('comes from the public source and contains metadata only', () => {
    expect(buptLibraryMetadataSeed).toHaveLength(80)
    expect(buptLibraryMetadataSeed[0]).toMatchObject({
      librarySource: 'https://github.com/yifanchen12/-',
      publisher: expect.any(String),
    })
    for (const item of buptLibraryMetadataSeed) {
      expect(item).not.toHaveProperty('raw_json')
      expect(item).not.toHaveProperty('content')
      expect(item).not.toHaveProperty('barcode')
      expect(item).not.toHaveProperty('raw_text')
    }
  })

  test('converts metadata into local mock books without inventing summaries', () => {
    const books = toBuptSeedBooks('admin_openid_001')
    expect(books).toHaveLength(buptLibraryMetadataSeed.length)
    expect(books[0]).toMatchObject({
      status: 'online',
      addedBy: 'admin_openid_001',
      summary: '',
      cover: '',
    })
  })
})
