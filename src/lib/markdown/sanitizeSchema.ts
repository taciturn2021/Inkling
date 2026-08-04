import { defaultSchema, type Schema } from 'hast-util-sanitize';

const katexTagNames = [
  'math',
  'semantics',
  'mrow',
  'mi',
  'mo',
  'mn',
  'msup',
  'msub',
  'mfrac',
  'mtext',
  'mspace',
  'mover',
  'munder',
  'munderover',
  'msqrt',
  'mtable',
  'mtr',
  'mtd',
  'mstyle',
  'annotation',
];

const alertTagNames = ['div', 'p', 'svg', 'path'];

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  clobberPrefix: 'user-content-',
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    ...katexTagNames,
    ...alertTagNames,
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'id', 'ariaHidden', 'aria-hidden'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style', 'ariaHidden', 'aria-hidden'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'data*'],
    p: [...(defaultSchema.attributes?.p ?? []), 'className'],
    a: [...(defaultSchema.attributes?.a ?? []), 'href', 'title', 'className', 'target', 'rel'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    img: [...(defaultSchema.attributes?.img ?? []), 'src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    svg: ['className', 'viewBox', 'width', 'height', 'ariaHidden', 'aria-hidden', 'fill'],
    path: ['d', 'fill'],
    math: ['xmlns'],
    annotation: ['encoding'],
  },
};
