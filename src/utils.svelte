<script>
  import { createEventDispatcher } from "svelte";
  import { get_current_component } from "svelte/internal";

  export const dispatch = (name, detail) => {
    svelteDispatch(name, detail);
    if (!component.dispatchEvent) {
      return;
    }
    component.dispatchEvent(
      new CustomEvent(name, {
        detail,
        cancelable: true,
        bubbles: true,
        composed: true,
      })
    );
  };
</script>
