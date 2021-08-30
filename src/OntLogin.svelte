<svelte:options tag="ont-login" />

<script>
  import ontIdIcon from "./ontid.svg";
  import OntLoginQr from "./OntLoginQr.svelte";

  let isDialogShowing = false;
  const showDialog = () => {
    isDialogShowing = true;
  };

  const hideDialog = () => {
    isDialogShowing = false;
  };
</script>

<button class="ont-login" on:click={showDialog}>
  <img class="ont-login__icon" src={ontIdIcon} alt="ONT ID" />
</button>
{#if isDialogShowing}
  <ont-login-qr />
{/if}

<style>
  .ont-login {
    box-sizing: border-box;
    padding: 12px 20px;
    background: #3354ea;
    outline: none;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0;
  }

  .ont-login:hover {
    opacity: 0.8;
  }

  .ont-login:focus,
  .ont-login:active {
    opacity: 0.7;
  }

  .ont-login__icon {
    height: 10px;
  }
</style>
