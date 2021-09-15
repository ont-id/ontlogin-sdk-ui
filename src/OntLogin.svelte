<svelte:options tag="ont-login" />

<script>
  import logoWhite from "./images/logo_white.svg";
  import logo from "./images/logo.svg";
  import close from "./images/close.svg";
  import QRCode from "qrcode-svg";
  import { createEventDispatcher } from "svelte";
  import {
    createAuthRequest,
    postRequest,
    requestQR,
    queryQRResult,
    cancelQueryQRResult,
    ErrorEnum,
  } from "ontlogin";
  import { dispatch } from "./utils";
  import { get_current_component } from "svelte/internal";

  export let url_of_get_challenge = "";
  export let url_of_submit_response = "";
  export let show_vc_list = "true";
  export let action = "0"; // action string
  export let test = "false"; // show a buttion to mock user scan success

  const compoent = get_current_component();
  const dispatcher = createEventDispatcher();
  let isDialogShowing = false;
  let svg = "";
  let authList = [];
  let qrId = "";

  const hideDialog = () => {
    isDialogShowing = false;
  };

  const showDialog = async () => {
    try {
      isDialogShowing = true;
      const request = createAuthRequest(Number(action));
      const challenge = await postRequest(url_of_get_challenge, request);
      if (challenge.VCFilters) {
        authList = challenge.VCFilters.map((item) => ({
          type: item.type,
          label: item.type,
          optional: !item.required,
        }));
      }
      const { text, id } = await requestQR(challenge);
      qrId = id;
      svg = new QRCode({
        content: text,
        width: 122,
        height: 122,
      }).svg();
      const response = await queryQRResult(id);
      const result = await postRequest(url_of_submit_response, response);
      dispatch("success", result, compoent, dispatcher);
      hideDialog();
    } catch (e) {
      if (e.message != ErrorEnum.UserCanceled) {
        dispatch("error", e, compoent, dispatcher);
      }
    }
  };

  const closeHandler = () => {
    cancelQueryQRResult();
    hideDialog();
    dispatch("cancel", null, compoent, dispatcher);
  };

  const testScan = () => {
    postRequest(`http://172.168.3.240:31843/qr-code/challenge/test/${qrId}`); // todo update qr server
  };
</script>

<button class="ont-login" on:click={showDialog}>
  <img class="ont-login__icon" src={logoWhite} alt="ONT ID" />
</button>
{#if isDialogShowing}
  <div class="ont-login-qr">
    <div class="box">
      <img class="close" src={close} alt="Close" on:click={closeHandler} />
      <div>{url_of_get_challenge}{url_of_submit_response}</div>
      <img class="logo" src={logo} alt="ONT ID" />
      <div class="container">
        <div class="qr">
          <div class="qr__box">
            {@html svg}
          </div>
          <div class="qr__label">Please scan with ONTO App</div>
          {#if test === "true"}
            <button class="qr__test" on:click={testScan}>
              test scan success
            </button>
          {/if}
        </div>
        {#if show_vc_list === "true" && authList.length}
          <ul class="auth">
            {#each authList as auth}
              <li class="auth__item">
                <div class="auth__item__check" />
                <div class="auth__item__label">
                  {`${auth.label}${auth.optional ? " (Optional)" : ""}`}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .ont-login {
    box-sizing: border-box;
    padding: 12px 20px;
    background: #3354ea;
    outline: none;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0;

    &:hover {
      opacity: 0.8;
    }

    &:focus,
    &:active {
      opacity: 0.7;
    }

    &__icon {
      height: 10px;
    }
  }

  .ont-login-qr {
    z-index: 999;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 60px;
    padding-bottom: 60px;
    overflow: auto;
    font-size: 0;

    .box {
      position: relative;
      background: #ffffff;
      box-shadow: 0px 0px 12px 5px rgba(9, 9, 9, 0.03);
      border-radius: 10px;
      padding: 40px;
    }

    .close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 22px;
      cursor: pointer;
    }

    .logo {
      display: block;
      margin: 0 auto;
      height: 12px;
    }

    .container {
      margin-top: 40px;
      display: flex;
    }

    .qr {
      padding-left: 20px;
      padding-right: 20px;
      min-width: 200px;
      text-align: center;
    }

    .qr__box {
      display: inline-block;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
      box-sizing: border-box;
      width: 124px;
      height: 124px;
    }

    .qr__label {
      max-width: 100px;
      margin: 8px auto 0;
      font-size: 12px;
      line-height: 16px;
      color: #1d1d1d;
      text-align: center;
    }

    .qr__test {
      margin-top: 20px;
      background: none;
      border: none;
      outline: none;
      text-decoration: underline;
      cursor: pointer;
    }

    .auth {
      border-left: 1px solid rgba(9, 9, 9, 0.1);
      flex: 1;
      padding: 20px;
      list-style: none;
      min-width: 200px;
    }

    .auth__item {
      display: flex;
      align-items: center;
    }

    .auth__item + .auth__item {
      margin-top: 16px;
    }

    .auth__item__check {
      width: 12px;
      height: 12px;
      border: 2px solid #3354ea;
      box-sizing: border-box;
      border-radius: 50%;
      text-align: center;
      line-height: 8px;
    }

    .auth__item__check::before {
      content: "";
      vertical-align: middle;
      display: inline-block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #3354ea;
    }

    .auth__item__label {
      flex: 1;
      margin-left: 6px;
      color: #090909;
      font-size: 14px;
      line-height: 24px;
      letter-spacing: -0.02em;
    }
  }
</style>
