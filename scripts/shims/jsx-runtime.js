// Runtime JSX mínimo sobre React.createElement (la versión UMD no trae react/jsx-runtime).
const R = window.React;
export const Fragment = R.Fragment;
export function jsx(type, props, key) {
  return R.createElement(type, key === undefined ? props : { ...props, key });
}
export const jsxs = jsx;
