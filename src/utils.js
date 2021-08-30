// eslint-disable-next-line import/prefer-default-export
export const dispatch = (name, detail, component, svelteDispatch) => {
  svelteDispatch(name, detail);
  if (!component.dispatchEvent) {
    return;
  }
  component.dispatchEvent(
    new CustomEvent(name, {
      detail,
      cancelable: true,
      bubbles: true, // bubble up to parent/ancestor element/application
      composed: true, // jump shadow DOM boundary
    })
  );
};
