<svelte:options tag="ont-login-qr" />

<script>
  import ontIdIcon from "./logo.svg";
  import QRCode from "qrcode-svg";

  const svg = new QRCode({
    content: "hello world!",
    width: 122,
    height: 122,
  }).svg();

  const authList = [
    {
      type: "email",
      label: "Email Address",
      optional: false,
    },
    {
      type: "phone",
      label: "Phone Number",
      optional: false,
    },
    {
      type: "id",
      label: "ID Number",
      optional: true,
    },
  ];
</script>

<div class="ont-login-qr">
  <div class="box">
    <img class="logo" src={ontIdIcon} alt="ONT ID" />
    <div class="container">
      <div class="qr">
        <div class="qr__box">
          {@html svg}
        </div>
        <div class="qr__label">Please scan with ONTO App</div>
      </div>
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
    </div>
  </div>
</div>

<style>
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
  }

  .box {
    background: #ffffff;
    box-shadow: 0px 0px 12px 5px rgba(9, 9, 9, 0.03);
    border-radius: 10px;
    width: 450px;
    padding-top: 40px;
    padding-bottom: 40px;
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
    padding-left: 68px;
    padding-right: 32px;
    text-align: center;
    border-right: 1px solid rgba(9, 9, 9, 0.1);
  }

  .qr__box {
    display: inline-block;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    overflow: hidden;
  }

  .qr__label {
    max-width: 100px;
    margin: 8px auto 0;
    font-size: 12px;
    line-height: 16px;
    color: #1d1d1d;
    text-align: center;
  }

  .auth {
    flex: 1;
    padding: 10px 32px 0 32px;
    list-style: none;
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
</style>
