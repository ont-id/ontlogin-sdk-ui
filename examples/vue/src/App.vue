<script setup>
import "ontlogin-ui";

const successHandler = (e) => {
  console.log("success", e.detail);
};
const errorHandler = (e) => {
  console.log("fail", e.detail);
};
const cancelHandler = (e) => {
  console.log("cancelHandler", e.detail);
};
</script>

<template>
  <div class="container">
    <div>
      <span class="label">Register/Log in with</span>
      <ont-login
        url_of_get_challenge="http://172.168.3.38:3000/requestChallenge"
        url_of_submit_response="http://172.168.3.38:3000/submitChallenge"
        show_vc_list="true"
        action="1"
        @success="successHandler"
        @error="errorHandler"
        @cancel="cancelHandler"
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
