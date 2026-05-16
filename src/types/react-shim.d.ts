import { JSX } from "preact/jsx-runtime";

declare module "preact" {
  namespace JSX {
    interface DDOMAttributes<T> {
      children?: preact.ComponentChildren;
    }
  }
}

declare global {
  namespace React {
    interface DOMAttributes<T> {
      children?: preact.ComponentChildren;
    }
  }
}

export {};
