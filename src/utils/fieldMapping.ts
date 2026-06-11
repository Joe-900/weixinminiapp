/**
 * @file 字段映射配置 - 统一爬虫与前端数据结构
 */

export interface FieldMap {
  sourceField: string
  targetField: string
  transform?: (value: unknown) => unknown
  defaultValue?: unknown
  required?: boolean
}

export interface MappingConfig {
  name: string
  fields: FieldMap[]
}

export const bookFieldMapping: MappingConfig = {
  name: 'book',
  fields: [
    { sourceField: 'recCtrlId', targetField: 'bookId', required: true },
    { sourceField: 'title', targetField: 'title', required: true },
    { sourceField: 'authors', targetField: 'author', required: true },
    { sourceField: 'isbnIssn', targetField: 'isbn', required: true },
    { sourceField: 'publisher', targetField: 'publisher', required: true },
    { sourceField: 'publishDate', targetField: 'publishDate' },
    { sourceField: 'holdingsCount', targetField: 'inventory', transform: (v) => Number(v) || 0 },
    { sourceField: 'availableCount', targetField: 'availableCount', transform: (v) => Number(v) || 0 },
    { 
      sourceField: 'materialType', 
      targetField: 'status', 
      transform: (v) => {
        const type = String(v).toLowerCase();
        return type === '期刊' ? 'PERIODICAL' : 'AVAILABLE';
      }
    },
    { sourceField: 'callNumber', targetField: 'callNumber' },
    { sourceField: 'stackType', targetField: 'stackType' },
    { sourceField: 'campus', targetField: 'campus' },
  ]
}

export const reservationFieldMapping: MappingConfig = {
  name: 'reservation',
  fields: [
    { sourceField: 'reservationId', targetField: 'reservationId', required: true },
    { sourceField: 'bookId', targetField: 'bookId', required: true },
    { sourceField: 'bookName', targetField: 'bookName', required: true },
    { sourceField: 'isbn', targetField: 'isbn', required: true },
    { sourceField: 'userId', targetField: 'userId', required: true },
    { sourceField: 'userName', targetField: 'userName', required: true },
    { sourceField: 'userPhone', targetField: 'userPhone', required: true },
    { sourceField: 'userEmail', targetField: 'userEmail' },
    { sourceField: 'reservationType', targetField: 'reservationType', required: true },
    { sourceField: 'campus', targetField: 'campus', required: true },
    { sourceField: 'targetCampus', targetField: 'targetCampus' },
    { sourceField: 'stackType', targetField: 'stackType' },
    { sourceField: 'status', targetField: 'status', required: true },
    { sourceField: 'position', targetField: 'position', transform: (v) => Number(v) || 0 },
    { sourceField: 'estimatedTime', targetField: 'estimatedTime' },
    { sourceField: 'pickupLocation', targetField: 'pickupLocation', required: true },
    { sourceField: 'createdAt', targetField: 'createdAt', transform: (v) => Number(v) || Date.now() },
    { sourceField: 'updatedAt', targetField: 'updatedAt', transform: (v) => Number(v) || Date.now() },
    { sourceField: 'processedBy', targetField: 'processedBy' },
  ]
}

export function transformData<T>(
  sourceData: Record<string, unknown>,
  mapping: MappingConfig
): Partial<T> {
  const result: Record<string, unknown> = {}
  
  mapping.fields.forEach((map) => {
    const sourceValue = sourceData[map.sourceField]
    
    if (sourceValue !== undefined && sourceValue !== null) {
      if (map.transform) {
        result[map.targetField] = map.transform(sourceValue)
      } else {
        result[map.targetField] = sourceValue
      }
    } else if (map.defaultValue !== undefined) {
      result[map.targetField] = map.defaultValue
    }
  })
  
  return result as Partial<T>
}

export function validateMapping(
  sourceData: Record<string, unknown>,
  mapping: MappingConfig
): string[] {
  const errors: string[] = []
  
  mapping.fields.forEach((map) => {
    if (map.required && sourceData[map.sourceField] === undefined) {
      errors.push(`Missing required field: ${map.sourceField} (maps to ${map.targetField})`)
    }
  })
  
  return errors
}

export function reverseTransform<T>(
  targetData: Record<string, unknown>,
  mapping: MappingConfig
): Partial<T> {
  const result: Record<string, unknown> = {}
  
  mapping.fields.forEach((map) => {
    const targetValue = targetData[map.targetField]
    
    if (targetValue !== undefined && targetValue !== null) {
      result[map.sourceField] = targetValue
    }
  })
  
  return result as Partial<T>
}