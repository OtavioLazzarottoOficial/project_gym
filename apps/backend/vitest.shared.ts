import swc from 'unplugin-swc';

export function createTestTransform() {
  return swc.vite({
    module: { type: 'es6' },
    jsc: {
      target: 'es2023',
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
    },
  });
}
