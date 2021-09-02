import preprocess from "svelte-preprocess";

const config = {
  compilerOptions: {
    customElement: true,
  },
  preprocess: preprocess(),
};

export default config;
