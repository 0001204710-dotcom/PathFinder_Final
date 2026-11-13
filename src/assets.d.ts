declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

declare interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
