import * as cheerio from 'cheerio';
import Ajv from 'ajv';
import type { StructuredDataResult, RuleInput } from '../types.js';

export type StructuredDataRuleOptions = {
  /** @type values to require (e.g. ['WebSite', 'Organization']) */
  required?: string[];
};

export type StructuredDataItem = Record<string, unknown>;

export type StructuredDataValidationError = {
  /** The JSON-LD item index (0-based) */
  index: number;
  /** The @type of the item if available */
  type?: string;
  level: 1 | 2 | 3;
  message: string;
};

// Level 1: JSON syntax validation schema
const ajv = new Ajv({ allErrors: true });

// Schema.org required fields per type (Level 3)
// Minimal subset — covers the most common types
const REQUIRED_FIELDS_BY_TYPE: Record<string, string[]> = {
  WebSite: ['@context', '@type', 'name', 'url'],
  Organization: ['@context', '@type', 'name'],
  Person: ['@context', '@type', 'name'],
  Article: ['@context', '@type', 'headline', 'author', 'datePublished'],
  BlogPosting: ['@context', '@type', 'headline', 'author', 'datePublished'],
  Product: ['@context', '@type', 'name'],
  BreadcrumbList: ['@context', '@type', 'itemListElement'],
  FAQPage: ['@context', '@type', 'mainEntity'],
  LocalBusiness: ['@context', '@type', 'name', 'address'],
  Event: ['@context', '@type', 'name', 'startDate', 'location'],
  Recipe: ['@context', '@type', 'name', 'recipeIngredient', 'recipeInstructions'],
  VideoObject: ['@context', '@type', 'name', 'description', 'thumbnailUrl'],
  ImageObject: ['@context', '@type', 'url'],
  WebPage: ['@context', '@type'],
  SoftwareApplication: ['@context', '@type', 'name', 'applicationCategory'],
};

/**
 * Level 1: Parse raw JSON from <script type="application/ld+json">
 */
function parseJsonLd(raw: string, index: number): {
  item: StructuredDataItem | null;
  error: StructuredDataValidationError | null;
} {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        item: null,
        error: {
          index,
          level: 1,
          message: `JSON-LD at index ${index} is not a JSON object (got ${Array.isArray(parsed) ? 'array' : typeof parsed})`,
        },
      };
    }
    return { item: parsed as StructuredDataItem, error: null };
  } catch (err) {
    return {
      item: null,
      error: {
        index,
        level: 1,
        message: `JSON-LD at index ${index} has invalid JSON syntax: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

/**
 * Level 2: Validate @context and @type presence
 */
function validateLevel2(
  item: StructuredDataItem,
  index: number
): StructuredDataValidationError | null {
  const context = item['@context'];
  const type = item['@type'];

  if (!context) {
    const err: StructuredDataValidationError = {
      index,
      level: 2,
      message: `JSON-LD at index ${index} is missing @context. Expected "https://schema.org"`,
    };
    if (typeof type === 'string') err.type = type;
    return err;
  }

  const contextStr = String(context);
  if (!contextStr.includes('schema.org')) {
    const err: StructuredDataValidationError = {
      index,
      level: 2,
      message: `JSON-LD at index ${index} has invalid @context "${contextStr}". Expected "https://schema.org"`,
    };
    if (typeof type === 'string') err.type = type;
    return err;
  }

  if (!type) {
    return {
      index,
      level: 2,
      message: `JSON-LD at index ${index} is missing @type`,
    };
  }

  return null;
}

/**
 * Level 3: Validate required fields for known Schema.org types
 */
function validateLevel3(
  item: StructuredDataItem,
  index: number
): StructuredDataValidationError[] {
  const type = item['@type'];
  if (typeof type !== 'string') return [];

  const requiredFields = REQUIRED_FIELDS_BY_TYPE[type];
  if (!requiredFields) return []; // unknown type — skip level 3

  const missing = requiredFields.filter((field) => !(field in item));
  if (missing.length === 0) return [];

  return [{
    index,
    type,
    level: 3,
    message: `JSON-LD ${type} at index ${index} is missing required field(s): ${missing.join(', ')}`,
  }];
}

/**
 * Validates all <script type="application/ld+json"> blocks on the page.
 *
 * Level 1: JSON syntax validity
 * Level 2: @context and @type presence
 * Level 3: Schema.org type-specific required field check
 *
 * Pass: all blocks parse correctly and pass L2/L3 checks
 * Fail: any JSON syntax error or missing @context / @type
 * Warn: missing schema-specific required fields (L3)
 */
export function checkStructuredData(
  input: RuleInput,
  options: StructuredDataRuleOptions = {}
): StructuredDataResult {
  const start = Date.now();
  const requiredTypes = options.required ?? [];

  const $ = cheerio.load(input.html);
  const scripts = $('script[type="application/ld+json"]');

  if (scripts.length === 0 && requiredTypes.length > 0) {
    return {
      ruleId: 'structured-data',
      status: 'fail',
      severity: 'warning',
      actual: [],
      expected: { required: requiredTypes },
      selector: 'script[type="application/ld+json"]',
      message: `No JSON-LD found but required types were specified: ${requiredTypes.join(', ')}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    };
  }

  if (scripts.length === 0) {
    return {
      ruleId: 'structured-data',
      status: 'pass',
      severity: 'warning',
      actual: [],
      expected: { required: [] },
      selector: 'script[type="application/ld+json"]',
      message: 'No JSON-LD structured data found on this page.',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    };
  }

  const items: StructuredDataItem[] = [];
  const errors: StructuredDataValidationError[] = [];

  scripts.each((i, el) => {
    const raw = $(el).html() ?? '';
    const { item, error } = parseJsonLd(raw.trim(), i);

    if (error) {
      errors.push(error);
      return;
    }

    if (!item) return;

    // Level 2 validation
    const l2Error = validateLevel2(item, i);
    if (l2Error) {
      errors.push(l2Error);
    }

    // Level 3 validation (even if L2 failed, collect for reporting)
    const l3Errors = validateLevel3(item, i);
    errors.push(...l3Errors);

    items.push(item);
  });

  // Check required types
  const foundTypes = items
    .map((item) => item['@type'])
    .filter((t): t is string => typeof t === 'string');

  const missingTypes = requiredTypes.filter((t) => !foundTypes.includes(t));
  if (missingTypes.length > 0) {
    errors.push({
      index: -1,
      level: 2,
      message: `Required JSON-LD types not found: ${missingTypes.join(', ')}. Found: ${foundTypes.join(', ') || 'none'}`,
    });
  }

  if (errors.length === 0) {
    return {
      ruleId: 'structured-data',
      status: 'pass',
      severity: 'warning',
      actual: items,
      expected: { required: requiredTypes },
      selector: 'script[type="application/ld+json"]',
      message: `All ${items.length} JSON-LD block(s) are valid. Types: ${foundTypes.join(', ')}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    };
  }

  // L1/L2 errors = fail, L3-only errors = warn
  const hasCriticalErrors = errors.some((e) => e.level <= 2);
  const status = hasCriticalErrors ? 'fail' : 'warn';

  const errorMessages = errors.map((e) => `  [L${e.level}] ${e.message}`).join('\n');

  return {
    ruleId: 'structured-data',
    status,
    severity: 'warning',
    actual: items,
    expected: { required: requiredTypes },
    selector: 'script[type="application/ld+json"]',
    message: `Structured data validation found ${errors.length} issue(s):\n${errorMessages}`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
  };
}
