/**
 * @file BUPT 字段适配（云端入口）
 * @description 实现已下沉到 src/utils/buptSourceAdapter.ts，云端与前端共享同一映射，
 * 这里仅作 re-export 以保持既有引用（cloud/functions/library/index.ts）不变。
 */

export { mapBuptLibraryRow, mapBuptLibraryRows } from '../../../src/utils/buptSourceAdapter'
export type { BuptLibraryBookRow, BuptLibraryHoldingRow } from '../../../src/utils/buptSourceAdapter'
