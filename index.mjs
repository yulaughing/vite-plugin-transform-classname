import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export default function transformClassNamePlugin() {
  return {
    name: 'transform-classname',
    transform(code, id) {
      if (!/\.tsx?$|\.jsx?$/.test(id)) {
        return;
      }
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });
      let hasStylesImport = false;
      traverse(ast, {
        ImportDeclaration(path) {
          const specifier = path.node.specifiers[0];
          if (specifier && specifier.type === 'ImportDefaultSpecifier' && specifier.local.name === 'styles') {
            hasStylesImport = true;
          }
        },
        JSXAttribute(path) {
          if (!hasStylesImport) {
            return;
          }

          if (path.node.name.name === 'className') {
            if (path.node.value && typeof path.node.value.value === 'string' && !t.isBinaryExpression(path.node.value)) {
              const className = path.node.value.value;
              const classNames = className.split(' ');
              const expressions = classNames.map(className => t.memberExpression(t.identifier('styles'), t.identifier(className)));
              const joinedExpressions = expressions.reduce((prev, curr, index) => {
                if (index === 0) {
                  return curr;
                } else {
                  return t.binaryExpression('+', t.binaryExpression('+', prev, t.stringLiteral(' ')), curr);
                }
              });
              path.node.value = t.jSXExpressionContainer(joinedExpressions);
            }
          }
        },
      });

      const output = generate(ast, {}, code);

      return {
        code: output.code,
        map: output.map,
      };
    },
  };
}
