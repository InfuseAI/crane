// Import from "main world" context
const { appVersion, isDev } = window.myapp

console.log("client-app", appVersion, isDev)

let output = document.querySelector('#output')

async function build_image() {
  const params = {};
  const formData = new FormData(document.querySelector('#form'));
  for(let [key, value] of formData.entries()) {
    params[key] = value;
  }
  let result = await send('build-image', params);
  output.innerHTML = result;
}
