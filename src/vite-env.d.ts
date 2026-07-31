/// <reference types="vite/client" />

declare module '*.sql?raw' {
  const content: string;
  export default content;
}

declare module '*.sql' {
  const content: string;
  export default content;
}

declare module '*.wasm?url' {
  const content: string;
  export default content;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const content: string;
  export default content;
}
