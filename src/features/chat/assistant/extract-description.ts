import { extractDescription as extractDescriptionFromExtractor } from './extractors/description.extractor'
import { extractCategory, toCategoryHint } from './extractors/category.extractor'

export const extractDescription = (message: string): string | null =>
  extractDescriptionFromExtractor(message)

export const extractCategoryHint = (message: string): string | null =>
  toCategoryHint(extractCategory(message))

