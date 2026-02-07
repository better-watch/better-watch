/**
 * Type definitions for the AST parser module
 */
/**
 * Type guard functions
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(node) {
    return (typeof node === 'object' &&
        node !== null &&
        'type' in node && (node.type === 'FunctionExpression' ||
        node.type === 'FunctionDeclaration' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'AsyncFunctionExpression' ||
        node.type === 'AsyncFunctionDeclaration'));
}
export function isClassMethod(node) {
    return (typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === 'ClassMethod');
}
export function isClassPrivateMethod(node) {
    return (typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === 'ClassPrivateMethod');
}
export function isDecorator(node) {
    return (typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === 'Decorator');
}
export function isTypeAssertion(node) {
    return (typeof node === 'object' &&
        node !== null &&
        'type' in node && (node.type === 'TSAsExpression' ||
        node.type === 'TSTypeAssertion'));
}
export function isGeneric(node) {
    return !!(typeof node === 'object' &&
        node !== null && ('typeParameters' in node ||
        ('type' in node && node.type === 'TSTypeParameterDeclaration') ||
        ('expression' in node && typeof node.expression === 'object' && node.expression !== null && 'typeParameters' in node.expression)));
}
//# sourceMappingURL=types.js.map