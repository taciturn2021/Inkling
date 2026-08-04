import type { Components } from 'react-markdown';
import CachedImage from './CachedImage';
import { CodeBlock, InlineCode } from './CodeBlock';
import styles from './MarkdownPreview.module.css';
import { HEADING_ID_PREFIX } from '@/lib/markdown/extractHeadings';

export type MarkdownImageMode = 'cached' | 'remote';

export function createMarkdownComponents(imageMode: MarkdownImageMode = 'cached'): Components {
  return {
    img: ({ src, alt }) => {
      const srcStr = typeof src === 'string' ? src : undefined;
      if (imageMode === 'cached') {
        return <CachedImage src={srcStr} alt={alt} />;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={srcStr} alt={alt || ''} loading="lazy" decoding="async" />
      );
    },
    a: ({ href, children, ...rest }) => {
      const target = href?.startsWith('#') && !href.startsWith(`#${HEADING_ID_PREFIX}`)
        ? `#${HEADING_ID_PREFIX}${href.slice(1)}`
        : href;

      return (
      <a href={target} className={styles.link} {...rest}>
        {children}
      </a>
      );
    },
    table: ({ children }) => (
      <div className={styles.tableWrap}>
        <table className={styles.table}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th className={styles.th}>{children}</th>,
    td: ({ children }) => (
      <td className={styles.td}>
        <div className={styles.tdInner}>{children}</div>
      </td>
    ),
    pre: ({ children }) => <>{children}</>,
    code: (props) => {
      const { className, children } = props;
      const source = Array.isArray(children) ? children.join('') : String(children ?? '');
      const isBlock = Boolean(className && /language-/.test(className)) || source.endsWith('\n');
      if (isBlock) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return <InlineCode className={className}>{children}</InlineCode>;
    },
    blockquote: ({ className, children, ...rest }) => (
      <blockquote className={`${styles.blockquote} ${className || ''}`} {...rest}>
        {children}
      </blockquote>
    ),
    h1: ({ children, id }) => (
      <h1 id={id} className={styles.heading}>
        {children}
      </h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id} className={styles.heading}>
        {children}
      </h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id} className={styles.heading}>
        {children}
      </h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id} className={styles.heading}>
        {children}
      </h4>
    ),
    h5: ({ children, id }) => (
      <h5 id={id} className={styles.heading}>
        {children}
      </h5>
    ),
    h6: ({ children, id }) => (
      <h6 id={id} className={styles.heading}>
        {children}
      </h6>
    ),
  };
}
