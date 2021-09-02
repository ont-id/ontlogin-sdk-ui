<script setup>
import "ontlogin-ui";

const successHandler = (e) => {
  console.log(e.detail);
};
const errorHandler = (e) => {
  console.log(e.detail);
};
</script>

<template>
  <div class="container">
    <div>
      <span class="label">Register/Log in with</span>
      <ont-login
        url_of_get_challenge="http://192.168.0.189:3000/requestChallenge"
        url_of_submit_response="http://192.168.0.189:3000/submitChallenge"
        show_vc_list="true"
        test="true"
        @success="successHandler"
        @error="errorHandler"
      />
    </div>
  </div>
</template>

<style>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 0;
}

.label {
  margin-right: 10px;
  font-size: 16px;
  line-height: 20px;
}
</style>
