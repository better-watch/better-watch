import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkUnwrapImages from 'remark-unwrap-images';
import type { ShikiTransformer } from 'shiki';
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { PluggableList } from 'unified';

// Custom transformer to extract title and showLineNumbers from meta string
const transformerMeta: ShikiTransformer = {
  name: 'meta',
  pre(node) {
    const meta = this.options.meta?.__raw;
    if (meta) {
      const titleMatch = meta.match(/title="([^"]+)"/);
      if (titleMatch) {
        node.properties['data-title'] = titleMatch[1];
      }
      if (meta.includes('showLineNumbers')) {
        node.properties['data-line-numbers'] = '';
      }
    }
  },
  line(node, line) {
    node.properties['data-line'] = line;
  },
};

export const remarkPlugins: PluggableList = [
  remarkGfm,
  remarkUnwrapImages,
];

export const rehypePlugins: PluggableList = [
  rehypeSlug,
  [rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'vesper',
    },
    defaultColor: false,
    transformers: [
      transformerMeta,
      transformerNotationDiff(),
      transformerNotationHighlight(),
      transformerNotationWordHighlight(),
    ],
  }],
];
