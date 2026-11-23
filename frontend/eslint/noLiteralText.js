const TEXT_ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
  'alt',
  'title',
  'placeholder',
  'label',
  'legend',
  'heading',
  'description',
  'hint',
  'summary',
  'emptyMessage',
  'emptyText',
  'confirmLabel',
  'submitLabel',
  'pendingLabel',
  'addLabel',
  'editLabel',
]);

const LETTER = /\p{L}/u;

const WRAPPED_EXPRESSIONS = new Set(['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'ParenthesizedExpression']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'User-visible text comes from the language catalogue through t(), never as a literal in JSX.' },
    messages: { literalText: 'Move this text to the language catalogue (src/i18n/en.ts, ru.ts, sr.ts) and render it with t().' },
    schema: [],
  },
  create(context) {
    function reportLetters(expression) {
      for (const node of renderedStrings(expression)) {
        if (LETTER.test(textOf(node))) {
          context.report({ node, messageId: 'literalText' });
        }
      }
    }
    return {
      JSXText(node) {
        if (LETTER.test(node.value)) {
          context.report({ node, messageId: 'literalText' });
        }
      },
      JSXExpressionContainer(node) {
        if (node.parent.type !== 'JSXAttribute') {
          reportLetters(node.expression);
        }
      },
      JSXAttribute(node) {
        if (node.value !== null && TEXT_ATTRIBUTES.has(attributeName(node))) {
          reportLetters(node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value);
        }
      },
    };
  },
};

function renderedStrings(expression) {
  if (expression.type === 'Literal') {
    return typeof expression.value === 'string' ? [expression] : [];
  }
  if (expression.type === 'TemplateLiteral') {
    return [expression];
  }
  if (expression.type === 'ConditionalExpression') {
    return [...renderedStrings(expression.consequent), ...renderedStrings(expression.alternate)];
  }
  if (expression.type === 'LogicalExpression') {
    return [...renderedStrings(expression.left), ...renderedStrings(expression.right)];
  }
  return WRAPPED_EXPRESSIONS.has(expression.type) ? renderedStrings(expression.expression) : [];
}

function textOf(node) {
  return node.type === 'Literal' ? node.value : node.quasis.map((quasi) => quasi.value.cooked).join('');
}

function attributeName(node) {
  return node.name.type === 'JSXNamespacedName' ? `${node.name.namespace.name}:${node.name.name.name}` : node.name.name;
}
